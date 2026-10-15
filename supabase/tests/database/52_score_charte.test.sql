-- Score MENAO de la charte qualité (ADR 0105) : critères calculés comme packages/core/src/ranking.ts,
-- planning tenu à jour, score visible par l'artisan seulement.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c5200000-0000-4000-8000-000000000001', 'score.artisan@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Sam"}'),
  ('c5200000-0000-4000-8000-000000000002', 'score.client@example.test', false, now(), '{}', '{"first_name":"Camille"}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, connect_charges_enabled, stripe_account_id, assujetti_tva) values
  ('c5300000-0000-4000-8000-000000000001', 'c5200000-0000-4000-8000-000000000001', 'valide', '00000002600013',
   'SCORE PLOMBERIE', '5710', '4 RUE DE LA PAIX', '06000', 'NICE', 'communes', true, 'acct_score', true);

-- Artisan sans historique : valeurs neutres (70) sauf planning et ancienneté (0).
select pg_temp.connecter('c5200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select results_eq(
  $$ select notes, delai72h, reactivite, planning, chantiers_termines, anciennete, score from public.my_charter_score() $$,
  $$ values (70.0, 70.0, 70.0, 0.0, 70.0, 0.0, 60::smallint) $$,
  'sans historique : valeurs neutres, score 60');

-- « Mon planning est à jour » : planning plein.
select isnt(public.artisan_confirm_planning(), null, 'confirmation du planning');
select results_eq($$ select planning, score from public.my_charter_score() $$,
  $$ values (100.0, 70::smallint) $$, 'planning confirmé : +10 points');
reset role;

-- Planning ancien de 17,5 jours : moitié des points ; toute modification le remet à jour.
update public.artisans set planning_updated_at = now() - interval '17 days 12 hours'
where id = 'c5300000-0000-4000-8000-000000000001';
select pg_temp.connecter('c5200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select is((select planning from public.my_charter_score()), 50.0, 'planning de 17,5 jours : 50');
reset role;
insert into public.artisan_hours (artisan_id, weekday, start_time, end_time)
values ('c5300000-0000-4000-8000-000000000001', 1, '08:00', '17:00');
select ok((select planning_updated_at > now() - interval '1 minute' from public.artisans
  where id = 'c5300000-0000-4000-8000-000000000001'), 'horaires modifiés : planning mis à jour');
update public.artisans set planning_updated_at = now() - interval '40 days', available_from = current_date + 3
where id = 'c5300000-0000-4000-8000-000000000001';
select ok((select planning_updated_at > now() - interval '1 minute' from public.artisans
  where id = 'c5300000-0000-4000-8000-000000000001'), 'disponibilité modifiée : planning mis à jour');

-- Demandes : une expirée (échec 72 h et réactivité), une refusée en 1 h, une acceptée en 2 h avec
-- un devis envoyé en 10 h (réussite 72 h et réactivité).
insert into public.projects (id, user_id, status, description, trade_code, ville_code_insee, ville_nom) values
  ('c5400000-0000-4000-8000-000000000001', 'c5200000-0000-4000-8000-000000000002', 'demande_envoyee', 'Projet A', 'plombier', '06088', 'Nice'),
  ('c5400000-0000-4000-8000-000000000002', 'c5200000-0000-4000-8000-000000000002', 'demande_envoyee', 'Projet B', 'plombier', '06088', 'Nice'),
  ('c5400000-0000-4000-8000-000000000003', 'c5200000-0000-4000-8000-000000000002', 'demande_envoyee', 'Projet C', 'plombier', '06088', 'Nice');
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone, status, created_at, responded_at, refusal_reason) values
  ('c5500000-0000-4000-8000-000000000001', 'c5400000-0000-4000-8000-000000000001', 'c5300000-0000-4000-8000-000000000001',
   'c5200000-0000-4000-8000-000000000002', '+33600000001', 'expiree', now() - interval '5 days', null, null),
  ('c5500000-0000-4000-8000-000000000002', 'c5400000-0000-4000-8000-000000000002', 'c5300000-0000-4000-8000-000000000001',
   'c5200000-0000-4000-8000-000000000002', '+33600000001', 'refusee', now() - interval '5 days', now() - interval '5 days' + interval '1 hour', 'planning_complet'),
  ('c5500000-0000-4000-8000-000000000003', 'c5400000-0000-4000-8000-000000000003', 'c5300000-0000-4000-8000-000000000001',
   'c5200000-0000-4000-8000-000000000002', '+33600000001', 'acceptee', now() - interval '5 days', now() - interval '5 days' + interval '2 hours', null);
insert into public.chantiers (id, project_id, request_id, artisan_id, particulier_id, status, title) values
  ('c5600000-0000-4000-8000-000000000001', 'c5400000-0000-4000-8000-000000000003', 'c5500000-0000-4000-8000-000000000003',
   'c5300000-0000-4000-8000-000000000001', 'c5200000-0000-4000-8000-000000000002', 'receptionne', 'Salle de bain');
insert into public.quotes (chantier_id, artisan_id, sent_at)
values ('c5600000-0000-4000-8000-000000000001', 'c5300000-0000-4000-8000-000000000001', now() - interval '5 days' + interval '10 hours');

-- Ancienneté : dossier validé il y a 12 mois environ.
insert into public.artisan_reviews (artisan_id, decision, created_at)
values ('c5300000-0000-4000-8000-000000000001', 'valide', now() - interval '365 days');

select pg_temp.connecter('c5200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
-- 72 h : 1 réussite sur 2 → (1 + 2,1) / 5 = 62 ; réactivité : 2 sur 3 → (2 + 2,1) / 6 = 68,3 ;
-- chantiers : 1 sur 1 → (1 + 2,1) / 4 = 77,5 ; ancienneté : ≈ 0,5 × 0,5 = 25.
select results_eq(
  $$ select delai72h, reactivite, chantiers_termines from public.my_charter_score() $$,
  $$ values (62.0, 68.3, 77.5) $$,
  '72 h, réactivité et chantiers menés à terme calculés sur l''historique');
select ok((select anciennete between 24 and 26 from public.my_charter_score()), 'ancienneté de 12 mois : environ 25');
reset role;

-- Un client ne voit pas de score et ne peut pas confirmer de planning.
select pg_temp.connecter('c5200000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select is_empty($$ select * from public.my_charter_score() $$, 'client : aucun score');
select throws_ok($$ select public.artisan_confirm_planning() $$, '42501', null, 'client : pas de confirmation de planning');
select throws_ok($$ update public.artisans set planning_updated_at = now() $$, '42501', null,
  'pas de modification directe de la date du planning');
reset role;

-- Visiteur : aucun accès.
set local role anon;
select throws_ok($$ select * from public.my_charter_score() $$, '42501', null, 'visiteur : pas de score');
reset role;

select * from finish();
rollback;
