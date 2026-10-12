-- F-53 et suivi des demandes (ADR 0046) : listes du back-office, étapes, filtres, recherche,
-- e-mails des comptes, liens du fil d'activité. Réservé aux admins avec double authentification.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('bd100000-0000-4000-8000-000000000001', 'suivi.client@example.test', false, now(), '{}', '{"first_name":"Camille","last_name":"Suivi"}'),
  ('bd100000-0000-4000-8000-000000000002', null, true, null, '{}', '{}'),
  ('bd200000-0000-4000-8000-000000000001', 'suivi.x1@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('bd200000-0000-4000-8000-000000000002', 'suivi.x2@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('bd200000-0000-4000-8000-000000000003', 'suivi.x3@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('bd300000-0000-4000-8000-000000000001', 'suivi.admin@example.test', false, now(), '{"role":"admin"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, connect_charges_enabled)
select ('bd400000-0000-4000-8000-00000000000' || n)::uuid, ('bd200000-0000-4000-8000-00000000000' || n)::uuid,
  'valide', 'ARTISAN SUIVI ' || n, 'communes', true
from generate_series(1, 3) n;

-- P1 : demande ouverte qui expire dans 5 h ; P2 : recherche non envoyée ; P3 : rendez-vous fixé ;
-- P4 : demande refusée.
insert into public.projects (id, user_id, status, description, trade_code, ville_code_insee, ville_nom,
  code_postal, adresse, location, criteria_validated_at) values
  ('bd500000-0000-4000-8000-000000000001', 'bd100000-0000-4000-8000-000000000001', 'demande_envoyee',
   'Remplacer un chauffe-eau.', 'plombier', '06088', 'Nice', '06000', '1 Rue de l''Exemple 06000 Nice',
   'SRID=4326;POINT(7.26 43.70)', now()),
  ('bd500000-0000-4000-8000-000000000002', 'bd100000-0000-4000-8000-000000000001', 'brouillon',
   'Repeindre un salon à 100 % en blanc.', 'peintre', null, null, null, null, null, null),
  ('bd500000-0000-4000-8000-000000000003', 'bd100000-0000-4000-8000-000000000001', 'demande_envoyee',
   'Ajouter deux prises.', 'electricien', '06088', 'Nice', '06000', '1 Rue de l''Exemple 06000 Nice',
   'SRID=4326;POINT(7.26 43.70)', now()),
  ('bd500000-0000-4000-8000-000000000004', 'bd100000-0000-4000-8000-000000000001', 'demande_envoyee',
   'Carreler une terrasse.', 'carreleur', '06088', 'Nice', '06000', '1 Rue de l''Exemple 06000 Nice',
   'SRID=4326;POINT(7.26 43.70)', now());
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone, status, expires_at,
  refusal_reason, responded_at) values
  ('bd600000-0000-4000-8000-000000000001', 'bd500000-0000-4000-8000-000000000001',
   'bd400000-0000-4000-8000-000000000001', 'bd100000-0000-4000-8000-000000000001', '+33612345678',
   'envoyee', now() + interval '5 hours', null, null),
  ('bd600000-0000-4000-8000-000000000003', 'bd500000-0000-4000-8000-000000000003',
   'bd400000-0000-4000-8000-000000000003', 'bd100000-0000-4000-8000-000000000001', '+33612345678',
   'envoyee', now() + interval '40 hours', null, null),
  ('bd600000-0000-4000-8000-000000000004', 'bd500000-0000-4000-8000-000000000004',
   'bd400000-0000-4000-8000-000000000002', 'bd100000-0000-4000-8000-000000000001', '+33612345678',
   'refusee', now() + interval '40 hours', 'planning_complet', now());

-- P3 : l'artisan fixe le rendez-vous, le chantier s'ouvre.
select pg_temp.connecter('bd200000-0000-4000-8000-000000000003', 'artisan');
set local role authenticated;
select set_config('test.chantier',
  public.artisan_fix_appointment('bd600000-0000-4000-8000-000000000003', current_date + 2, '10:00')::text, true);
reset role;

-- ---------- Accès réservé aux admins avec double authentification ----------
select pg_temp.connecter('bd100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok($$ select * from public.admin_projects() $$, '42501', null, 'particulier : pas de liste des demandes');
select throws_ok($$ select public.admin_project_counts() $$, '42501', null, 'particulier : pas de compteurs des demandes');
select throws_ok($$ select * from public.admin_chantiers() $$, '42501', null, 'particulier : pas de liste des chantiers');
select throws_ok($$ select public.admin_chantier_counts() $$, '42501', null, 'particulier : pas de compteurs des chantiers');
select throws_ok(
  $$ select * from public.admin_user_emails(array['bd100000-0000-4000-8000-000000000001'::uuid]) $$,
  '42501', null, 'particulier : pas d''accès aux e-mails');
reset role;

select pg_temp.connecter('bd300000-0000-4000-8000-000000000001', 'admin', 'aal1');
set local role authenticated;
select throws_ok($$ select * from public.admin_projects() $$, '42501', null, 'admin sans double authentification : refusé');
select throws_ok($$ select * from public.admin_chantiers() $$, '42501', null, 'admin sans double authentification : chantiers refusés');
reset role;

-- ---------- Demandes : étapes, filtres, recherche ----------
select pg_temp.connecter('bd300000-0000-4000-8000-000000000001', 'admin', 'aal2');
set local role authenticated;

select results_eq(
  $$ select project_id::text, etape, demandes, en_attente, client, (chantier_id is not null), total
     from public.admin_projects('toutes', 'suivi.client@example.test') order by project_id $$,
  $$ values ('bd500000-0000-4000-8000-000000000001', 'en_attente', 1, 1, 'Camille Suivi', false, 4::bigint),
            ('bd500000-0000-4000-8000-000000000002', 'non_envoyee', 0, 0, 'Camille Suivi', false, 4::bigint),
            ('bd500000-0000-4000-8000-000000000003', 'chantier', 1, 0, 'Camille Suivi', true, 4::bigint),
            ('bd500000-0000-4000-8000-000000000004', 'sans_suite', 1, 0, 'Camille Suivi', false, 4::bigint) $$,
  'demandes du client retrouvées par son e-mail, avec leur étape');

select results_eq(
  $$ select f, (select string_agg(right(p.project_id::text, 1), ',' order by p.project_id)
                from public.admin_projects(f, 'suivi.client@example.test') p)
     from unnest(array['non_envoyee', 'en_attente', 'expirent', 'chantier', 'sans_suite']) f $$,
  $$ values ('non_envoyee', '2'), ('en_attente', '1'), ('expirent', '1'), ('chantier', '3'), ('sans_suite', '4') $$,
  'chaque filtre retient les bonnes demandes');

select results_eq(
  $$ select project_id::text from public.admin_projects('toutes', 'artisan suivi 3') $$,
  $$ values ('bd500000-0000-4000-8000-000000000003') $$,
  'recherche par le nom de l''artisan');
select results_eq(
  $$ select project_id::text from public.admin_projects('toutes', '%') $$,
  $$ values ('bd500000-0000-4000-8000-000000000002') $$,
  'recherche dans la description, « % » pris à la lettre (pas un joker)');
select is(
  (select count(*)::int from public.admin_projects('toutes', 'suivi.client@example.test', 2, 0)),
  2, 'pagination : taille de page respectée');

select is(
  public.admin_project_counts('suivi.client@example.test'),
  '{"toutes": 4, "non_envoyee": 1, "en_attente": 1, "expirent": 1, "chantier": 1, "sans_suite": 1}'::jsonb,
  'compteurs des pastilles');

-- ---------- Chantiers ----------
select results_eq(
  $$ select chantier_id::text, status::text, artisan, client, total
     from public.admin_chantiers(null, 'suivi.client@example.test') $$,
  format($$ values (%L, 'rdv_planifie', 'ARTISAN SUIVI 3', 'Camille Suivi', 1::bigint) $$,
         current_setting('test.chantier')),
  'chantier du client, artisan et étape');
select is_empty(
  $$ select 1 from public.admin_chantiers(array['devis_envoye']::public.chantier_status[], 'suivi.client@example.test') $$,
  'filtre par statut');
select is(
  public.admin_chantier_counts('suivi.client@example.test'), '{"rdv_planifie": 1}'::jsonb,
  'compteurs des chantiers par statut');

-- ---------- E-mails et fil d'activité ----------
select results_eq(
  $$ select user_id::text, email from public.admin_user_emails(array[
       'bd100000-0000-4000-8000-000000000001'::uuid, 'bd100000-0000-4000-8000-000000000002'::uuid]) $$,
  $$ values ('bd100000-0000-4000-8000-000000000001', 'suivi.client@example.test') $$,
  'e-mail du client (pas de session anonyme)');
select ok(
  exists (select 1 from public.admin_activity(100) a
          where a.kind = 'recherche' and a.details ->> 'project_id' = 'bd500000-0000-4000-8000-000000000002'),
  'fil : la recherche mène à sa demande');
select ok(
  exists (select 1 from public.admin_activity(100) a
          where a.kind = 'chantier' and a.details ->> 'chantier_id' = current_setting('test.chantier')),
  'fil : l''événement mène à son chantier');
reset role;

select * from finish();
rollback;
