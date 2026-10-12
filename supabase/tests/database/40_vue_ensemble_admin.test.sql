-- F-58 : vue d'ensemble du back-office (ADR 0045). Réservée aux admins avec double
-- authentification ; compteurs et fil d'activité de toute la plateforme ; tables suivies en direct.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('bc100000-0000-4000-8000-000000000001', 'vue.client@example.test', '{}', '{"first_name":"Camille","last_name":"Exemple"}'),
  ('bc200000-0000-4000-8000-000000000001', 'vue.artisan@example.test', '{}', '{"account_type":"artisan","siret":"00000042000000"}'),
  ('bc300000-0000-4000-8000-000000000001', 'vue.admin@example.test', '{"role":"admin"}', '{}'),
  ('bc300000-0000-4000-8000-000000000002', 'vue.support@example.test', '{"role":"support"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Accès réservé aux admins avec double authentification ----------
select pg_temp.connecter('bc100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok($$ select public.admin_overview() $$, '42501', null, 'particulier : pas de vue d''ensemble');
select throws_ok($$ select * from public.admin_activity() $$, '42501', null, 'particulier : pas de fil d''activité');
reset role;

select pg_temp.connecter('bc300000-0000-4000-8000-000000000002', 'support', 'aal2');
set local role authenticated;
select throws_ok($$ select public.admin_overview() $$, '42501', null,
  'support : pas de vue d''ensemble (chiffres des paiements)');
reset role;

select pg_temp.connecter('bc300000-0000-4000-8000-000000000001', 'admin', 'aal1');
set local role authenticated;
select throws_ok($$ select public.admin_overview() $$, '42501', null,
  'admin sans double authentification : refusé');
select throws_ok($$ select * from public.admin_activity() $$, '42501', null,
  'admin sans double authentification : fil refusé');
reset role;

-- ---------- Compteurs : écarts avant / après de nouvelles données ----------
select pg_temp.connecter('bc300000-0000-4000-8000-000000000001', 'admin', 'aal2');
set local role authenticated;
select set_config('test.avant', public.admin_overview()::text, true);
reset role;

-- Un dossier envoyé il y a deux jours, une recherche non envoyée, un ticket en retard.
update public.artisans set status = 'en_verification', sirene_active = true, sirene_checked_at = now(),
  raison_sociale = 'VUE EXEMPLE', assujetti_tva = false, submitted_at = now() - interval '2 days'
where user_id = 'bc200000-0000-4000-8000-000000000001';
insert into public.projects (user_id, description, trade_code, ville_code_insee, ville_nom)
values ('bc100000-0000-4000-8000-000000000001', 'Fuite sous l''évier de la cuisine.', 'plombier', '06088', 'Nice');
insert into public.tickets (type, user_id, contact_email, message, due_at)
values ('contact', 'bc100000-0000-4000-8000-000000000001', 'vue.client@example.test',
  'Une question sur un devis.', now() - interval '1 day');

select pg_temp.connecter('bc300000-0000-4000-8000-000000000001', 'admin', 'aal2');
set local role authenticated;
select set_config('test.apres', public.admin_overview()::text, true);

-- ---------- Fil d'activité ----------
select ok(
  exists (select 1 from public.admin_activity(100) a
          where a.kind = 'dossier_envoye' and a.details ->> 'entreprise' = 'VUE EXEMPLE'),
  'fil : dossier envoyé, avec le nom de l''entreprise');
select ok(
  exists (select 1 from public.admin_activity(100) a
          where a.kind = 'recherche' and a.details = '{"metier": "Plombier", "ville": "Nice"}'::jsonb),
  'fil : nouvelle recherche, métier et ville seulement (pas d''identité du particulier)');
select ok(
  exists (select 1 from public.admin_activity(100) a
          where a.kind = 'ticket' and a.details ->> 'type' = 'contact'),
  'fil : nouveau ticket');
select is(
  (select count(*)::int from (
     select a.occurred_at, lag(a.occurred_at) over () as precedent from public.admin_activity(100) a
   ) s where s.precedent < s.occurred_at),
  0, 'fil trié du plus récent au plus ancien');
select ok((select count(*) from public.admin_activity(3)) <= 3, 'fil limité au nombre demandé');
reset role;

-- Écarts des compteurs, comparés hors du rôle authentifié.
select results_eq(
  $$ select c.chemin::text,
       (current_setting('test.apres')::jsonb #>> c.chemin)::int
         - (current_setting('test.avant')::jsonb #>> c.chemin)::int
     from (values
       ('{artisans,en_verification}'::text[]), ('{recherches,aujourdhui}'),
       ('{recherches,non_envoyees_7j}'), ('{tickets,ouverts}'), ('{tickets,en_retard}'),
       ('{tickets,litiges}'), ('{demandes,j30}')
     ) as c (chemin)
     order by 1 $$,
  $$ values ('{artisans,en_verification}', 1), ('{demandes,j30}', 0), ('{recherches,aujourdhui}', 1),
            ('{recherches,non_envoyees_7j}', 1), ('{tickets,en_retard}', 1), ('{tickets,litiges}', 0),
            ('{tickets,ouverts}', 1) $$,
  'compteurs : dossier à vérifier, recherche non envoyée, ticket en retard');
select ok(
  (current_setting('test.apres')::jsonb #>> '{artisans,plus_ancien_dossier}')::timestamptz
    <= now() - interval '2 days',
  'plus ancien dossier en attente : au moins deux jours');
select ok(
  (select bool_and(current_setting('test.apres')::jsonb ? k)
   from unnest(array['artisans', 'abonnements', 'recherches', 'demandes', 'devis', 'chantiers',
                     'paiements', 'avis', 'tickets', 'documents']) k),
  'toutes les rubriques des chiffres clés');

-- ---------- Tables suivies en direct (Supabase Realtime) ----------
select set_eq(
  $$ select tablename::text from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public'
       and tablename in ('projects', 'requests', 'chantier_events', 'tickets', 'artisans') $$,
  $$ values ('projects'), ('requests'), ('chantier_events'), ('tickets'), ('artisans') $$,
  'tables suivies en direct par le back-office');

select * from finish();
rollback;
