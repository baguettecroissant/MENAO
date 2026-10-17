-- Contrôle automatique du RGE (ADR 0118) : qualifications lues dans l'annuaire de l'ADEME,
-- enregistrées par les Edge Functions seulement (service_role), remplacées à chaque lecture,
-- visibles de l'artisan et de l'équipe ; fiche publique limitée aux domaines encore valides ;
-- fiches à relire chaque jour. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c6200000-0000-4000-8000-000000000001', 'rge62.valide@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c6200000-0000-4000-8000-000000000002', 'rge62.autre@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c6200000-0000-4000-8000-000000000003', 'rge62.admin@example.test', false, now(), '{"role":"admin"}', '{}');

insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, assujetti_tva, sirene_checked_at, sirene_active)
values
  ('c6210000-0000-4000-8000-000000000001', 'c6200000-0000-4000-8000-000000000001', 'valide',
   '00000062000005', 'ISOLATION EXEMPLE', '5710', '1 RUE DE L''EXEMPLE', '06000', 'NICE', 'communes', true, now(), true),
  ('c6210000-0000-4000-8000-000000000002', 'c6200000-0000-4000-8000-000000000002', 'brouillon',
   '00000062000013', 'AUTRE EXEMPLE', '5710', '2 RUE DE L''EXEMPLE', '06000', 'NICE', 'communes', true, now(), true);

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Fiches à relire ----------
select results_eq(
  $$ select artisan_id from public.rge_refresh_candidates(200)
     where artisan_id in ('c6210000-0000-4000-8000-000000000001', 'c6210000-0000-4000-8000-000000000002') $$,
  $$ values ('c6210000-0000-4000-8000-000000000001'::uuid) $$,
  'à relire : artisan validé jamais lu (pas un brouillon)');

-- ---------- Enregistrement réservé aux Edge Functions ----------
select pg_temp.connecter('c6200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select throws_ok(
  $$ select public.record_rge_qualifications('c6210000-0000-4000-8000-000000000001', '[]') $$,
  '42501', null, 'artisan : enregistrement impossible');
select throws_ok(
  $$ insert into public.artisan_rge_qualifications (artisan_id, organisme, code_qualification, nom_qualification, domaine, date_fin)
     values ('c6210000-0000-4000-8000-000000000001', 'qualibat', 'X', 'X', 'X', current_date + 10) $$,
  '42501', null, 'artisan : pas d''écriture directe');
select throws_ok($$ select public.rge_refresh_candidates(10) $$, '42501', null,
  'artisan : liste des fiches à relire inaccessible');
reset role;

set local role service_role;
select is(
  public.record_rge_qualifications('c6210000-0000-4000-8000-000000000001', $$[
    {"organisme":"qualibat","code":"0000D001","name":"Isolation (0000D001)","certificate":"QUALIBAT-RGE",
     "domain":"Isolation des combles perdus","category":"Travaux d'efficacité énergétique","particulier":true,
     "startsOn":"2025-01-01","endsOn":"2099-01-01","url":"https://exemple.test/certificat.pdf"},
    {"organisme":"qualitenr","code":"QPAC","name":"QualiPAC","certificate":"QualiPAC module Chauffage et ECS",
     "domain":"Pompe à chaleur : chauffage","category":"Installations d'énergies renouvelables","particulier":true,
     "startsOn":null,"endsOn":"2099-06-01","url":null},
    {"organisme":"qualibat","code":"0000D009","name":"Ancienne (0000D009)","certificate":"QUALIBAT-RGE",
     "domain":"Isolation des murs par l'extérieur","category":"Travaux d'efficacité énergétique","particulier":true,
     "startsOn":"2019-01-01","endsOn":"2020-01-01","url":null},
    {"organisme":"qualibat","code":"0000D001","name":"Doublon","certificate":"QUALIBAT-RGE",
     "domain":"Isolation des combles perdus","category":null,"particulier":null,
     "startsOn":null,"endsOn":"2099-01-01","url":null}
  ]$$::jsonb),
  3, 'service : 3 qualifications enregistrées (doublon ignoré)');
select throws_ok(
  $$ select public.record_rge_qualifications('c6210000-0000-4000-8000-000000000001', '{}') $$,
  '22023', 'Liste de qualifications attendue.', 'service : liste exigée');
reset role;
select ok((select rge_checked_at is not null from public.artisans where id = 'c6210000-0000-4000-8000-000000000001'),
  'date de lecture enregistrée');
select is(
  (select count(*)::int from public.rge_refresh_candidates(200) where artisan_id = 'c6210000-0000-4000-8000-000000000001'),
  0, 'lue aujourd''hui : plus à relire');

-- ---------- Fiche publique : domaines encore valides, sans doublon ----------
select is(
  app.artisan_profile_json('c6210000-0000-4000-8000-000000000001') -> 'rge',
  '[{"domain":"Isolation des combles perdus","category":"Travaux d''efficacité énergétique","valid_until":"2099-01-01"},
    {"domain":"Pompe à chaleur : chauffage","category":"Installations d''énergies renouvelables","valid_until":"2099-06-01"}]'::jsonb,
  'fiche publique : domaines RGE valides');
select is(app.artisan_profile_json('c6210000-0000-4000-8000-000000000002') -> 'rge', '[]'::jsonb,
  'sans qualification : liste vide');

-- ---------- Nouvelle lecture : remplacement ----------
set local role service_role;
select is(public.record_rge_qualifications('c6210000-0000-4000-8000-000000000001', '[]'), 0,
  'service : qualification retirée de l''annuaire');
reset role;
select is((select count(*)::int from public.artisan_rge_qualifications
           where artisan_id = 'c6210000-0000-4000-8000-000000000001'), 0, 'qualifications remplacées');
set local role service_role;
select lives_ok($$ select public.record_rge_qualifications('c6210000-0000-4000-8000-000000000001', '[
  {"organisme":"qualibat","code":"0000D001","name":"Isolation (0000D001)","certificate":"QUALIBAT-RGE",
   "domain":"Isolation des combles perdus","category":null,"particulier":true,"startsOn":null,"endsOn":"2099-01-01","url":null}
]') $$, 'service : nouvelle lecture');
reset role;

-- ---------- Lecture : l'artisan, l'équipe ; pas les autres ----------
select pg_temp.connecter('c6200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select is((select count(*)::int from public.artisan_rge_qualifications), 1, 'artisan : voit ses qualifications');
reset role;
select pg_temp.connecter('c6200000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select is_empty($$ select 1 from public.artisan_rge_qualifications $$, 'autre artisan : rien');
reset role;
select pg_temp.connecter('c6200000-0000-4000-8000-000000000003', 'admin', 'aal2');
set local role authenticated;
select is((select count(*)::int from public.artisan_rge_qualifications
           where artisan_id = 'c6210000-0000-4000-8000-000000000001'), 1, 'admin : voit les qualifications');
reset role;
set local role anon;
select throws_ok($$ select 1 from public.artisan_rge_qualifications $$, '42501', null, 'visiteur : aucun accès');
reset role;

-- ---------- Lecture quotidienne : sans adresse configurée, aucun appel ----------
select lives_ok($$ select app.dispatch_rge_refresh() $$, 'lecture quotidienne sans configuration : sans effet');
select is((select count(*)::int from cron.job where jobname = 'menao-controle-rge'), 1, 'tâche quotidienne planifiée');

select * from finish();
rollback;
