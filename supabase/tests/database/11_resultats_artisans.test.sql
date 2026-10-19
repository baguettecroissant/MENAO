-- F-09, F-10 : correspondance artisans ↔ projet, fiche publique, disponibilité, dossier à MENAO.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, raw_app_meta_data, raw_user_meta_data) values
  ('c1000000-0000-4000-8000-000000000001', null, true, '{}', '{}'),
  ('c1000000-0000-4000-8000-000000000002', 'res.autre@example.test', false, '{}', '{}'),
  ('c1000000-0000-4000-8000-000000000003', 'res.support@example.test', false, '{"role":"support"}', '{}'),
  ('c2000000-0000-4000-8000-000000000001', 'res.a1@example.test', false, '{"role":"artisan"}', '{"first_name":"Alice"}'),
  ('c2000000-0000-4000-8000-000000000002', 'res.a2@example.test', false, '{"role":"artisan"}', '{"first_name":"Basile"}'),
  ('c2000000-0000-4000-8000-000000000003', 'res.a3@example.test', false, '{"role":"artisan"}', '{}'),
  ('c2000000-0000-4000-8000-000000000004', 'res.a4@example.test', false, '{"role":"artisan"}', '{}'),
  ('c2000000-0000-4000-8000-000000000005', 'res.a5@example.test', false, '{"role":"artisan"}', '{}'),
  ('c2000000-0000-4000-8000-000000000006', 'res.a6@example.test', false, '{"role":"artisan"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- A1 plombier, rayon 20 km autour de Nice ; A2 plombier, commune de Nice, disponible dans 10 jours ;
-- A3 plombier en pause ; A4 plombier sans abonnement ; A5 électricien ; A6 plombier à Marseille.
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, base_label, base_code_insee,
  base_location, radius_km, experience_years, connect_charges_enabled, paused, available_from, presentation) values
  ('c3000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000001', 'valide', 'ALICE PLOMBERIE', 'rayon',
   '1 Rue de l''Exemple 06000 Nice', '06088', 'SRID=4326;POINT(7.26 43.70)', 20, 8, true, false, null, 'Plombière à Nice.'),
  ('c3000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000000002', 'valide', 'BASILE PLOMBERIE', 'communes',
   null, null, null, null, 3, true, false, current_date + 10, null),
  ('c3000000-0000-4000-8000-000000000003', 'c2000000-0000-4000-8000-000000000003', 'valide', 'PAUSE PLOMBERIE', 'communes',
   null, null, null, null, 5, true, true, null, null),
  ('c3000000-0000-4000-8000-000000000004', 'c2000000-0000-4000-8000-000000000004', 'valide', 'SANS ABONNEMENT', 'communes',
   null, null, null, null, 5, true, false, null, null),
  ('c3000000-0000-4000-8000-000000000005', 'c2000000-0000-4000-8000-000000000005', 'valide', 'ELEC EXEMPLE', 'communes',
   null, null, null, null, 5, true, false, null, null),
  ('c3000000-0000-4000-8000-000000000006', 'c2000000-0000-4000-8000-000000000006', 'valide', 'MARSEILLE PLOMBERIE', 'rayon',
   '1 Rue de l''Exemple 13001 Marseille', '13201', 'SRID=4326;POINT(5.37 43.30)', 20, 5, true, false, null, null);
insert into public.artisan_trades (artisan_id, trade_code) values
  ('c3000000-0000-4000-8000-000000000001', 'plombier'), ('c3000000-0000-4000-8000-000000000002', 'plombier'),
  ('c3000000-0000-4000-8000-000000000003', 'plombier'), ('c3000000-0000-4000-8000-000000000004', 'plombier'),
  ('c3000000-0000-4000-8000-000000000005', 'electricien'), ('c3000000-0000-4000-8000-000000000006', 'plombier');
insert into public.artisan_zones (artisan_id, code_insee, nom) values
  ('c3000000-0000-4000-8000-000000000002', '06088', 'Nice'), ('c3000000-0000-4000-8000-000000000003', '06088', 'Nice'),
  ('c3000000-0000-4000-8000-000000000004', '06088', 'Nice'), ('c3000000-0000-4000-8000-000000000005', '06088', 'Nice');
insert into public.artisan_work_types (artisan_id, work_type_code) values
  ('c3000000-0000-4000-8000-000000000001', 'recherche-fuite'), ('c3000000-0000-4000-8000-000000000001', 'sanitaires');
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status, trial_end)
select a, 'base', 'cus_res_' || right(a::text, 1), 'sub_res_' || right(a::text, 1), 'trialing', now() + interval '30 days'
from unnest(array[
  'c3000000-0000-4000-8000-000000000001', 'c3000000-0000-4000-8000-000000000002', 'c3000000-0000-4000-8000-000000000003',
  'c3000000-0000-4000-8000-000000000005', 'c3000000-0000-4000-8000-000000000006'
]::uuid[]) as a;
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_fin, assureur, status) values
  ('c3000000-0000-4000-8000-000000000001', 'decennale', 'c3/dec.pdf', 'application/pdf', 1000, current_date + 200, 'Assurances Exemple', 'valide');
insert into public.certifications (artisan_id, type, numero, date_fin, verified_at) values
  ('c3000000-0000-4000-8000-000000000001', 'qualibat', 'Q-12345', current_date + 300, now()),
  ('c3000000-0000-4000-8000-000000000001', 'rge', 'RGE-0000', current_date + 300, null);

insert into public.projects (id, user_id, description, trade_code, ville_code_insee, ville_nom, ville_location, work_type_codes) values
  ('c4000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'Fuite à Nice', 'plombier', '06088', 'Nice',
   'SRID=4326;POINT(7.262 43.71)', array['sanitaires']),
  ('c4000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001', 'Projet sans ville', 'plombier', null, null, null, '{}');

-- Isolement : les artisans du seed (visibles à Nice) sont mis en pause le temps du test.
update public.artisans set paused = true where id::text not like 'c3000000-%';

-- ---------- Particulier (session anonyme) ----------
select pg_temp.connecter('c1000000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;

select results_eq(
  $$ select artisan_id from public.match_artisans('c4000000-0000-4000-8000-000000000001') $$,
  $$ values ('c3000000-0000-4000-8000-000000000001'::uuid), ('c3000000-0000-4000-8000-000000000002'::uuid) $$,
  'visibles, bon métier, dans la zone, hors pause ; disponible tout de suite en premier');
select results_eq(
  $$ select display_name, available_now, distance_km < 2, zone_city, jsonb_array_length(specialties)
     from public.match_artisans('c4000000-0000-4000-8000-000000000001') limit 1 $$,
  $$ values ('Alice'::text, true, true, 'Nice'::text, 2) $$,
  'prénom affiché, distance, commune de base sans l''adresse, spécialités du métier');
select results_eq(
  $$ select zone_communes, available_now, distance_km from public.match_artisans('c4000000-0000-4000-8000-000000000001') offset 1 $$,
  $$ values (array['Nice'], false, null::numeric) $$,
  'artisan par communes : pas de distance, disponibilité à venir');
select is_empty(
  $$ select * from public.match_artisans('c4000000-0000-4000-8000-000000000002') $$,
  'sans ville : aucun résultat');
select is((select count(*)::int from public.match_artisans('c4000000-0000-4000-8000-000000000001', 1)), 1,
  'nombre de résultats limité');

-- Score MENAO (F-28, ADR 0030) : après la disponibilité (ADR 0151) ; publié sur la fiche.
reset role;
insert into public.artisan_scores (artisan_id, review_count, quality, delays, communication, value_for_money, global_score)
values ('c3000000-0000-4000-8000-000000000002', 1, 90, 90, 90, 100, 93);
select pg_temp.connecter('c1000000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select results_eq(
  $$ select artisan_id from public.match_artisans('c4000000-0000-4000-8000-000000000001') $$,
  $$ values ('c3000000-0000-4000-8000-000000000001'::uuid), ('c3000000-0000-4000-8000-000000000002'::uuid) $$,
  'disponible tout de suite avant un artisan mieux noté mais disponible dans 10 jours (ADR 0151)');
select is(public.artisan_public_profile('c3000000-0000-4000-8000-000000000002') #>> '{score,global}', '93',
  'fiche : score MENAO publié');
select is(public.artisan_public_profile('c3000000-0000-4000-8000-000000000001') -> 'score', 'null'::jsonb,
  'fiche sans avis : pas de score');
select is_empty($$ select * from public.artisan_scores $$, 'scores : pas de lecture directe par un client');
reset role;
delete from public.artisan_scores;
select pg_temp.connecter('c1000000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;

-- Fiche publique
select is(
  public.artisan_public_profile('c3000000-0000-4000-8000-000000000001') ->> 'display_name', 'Alice', 'fiche d''un artisan visible');
select ok(
  not (public.artisan_public_profile('c3000000-0000-4000-8000-000000000001') ?| array['siret', 'phone', 'email', 'base_label', 'user_id']),
  'fiche sans SIRET, téléphone, e-mail ni adresse');
select is(
  jsonb_array_length(public.artisan_public_profile('c3000000-0000-4000-8000-000000000001') -> 'certifications'), 1,
  'seules les certifications vérifiées sont publiées');
select is(
  public.artisan_public_profile('c3000000-0000-4000-8000-000000000001') #>> '{decennale,insurer}', 'Assurances Exemple',
  'décennale vérifiée publiée');
select is(public.artisan_public_profile('c3000000-0000-4000-8000-000000000004'), null, 'artisan non visible : pas de fiche');

-- Dossier envoyé à MENAO
select throws_ok(
  $$ select public.send_project_to_menao('c4000000-0000-4000-8000-000000000001', 'Aucun artisan ne convient', null) $$,
  '22023', 'Adresse e-mail obligatoire', 'session anonyme : e-mail de contact obligatoire');
select lives_ok(
  $$ select public.send_project_to_menao('c4000000-0000-4000-8000-000000000001', 'Aucun artisan ne convient', 'Contact@Example.test') $$,
  'dossier envoyé');
select results_eq(
  $$ select contact_email, status::text, due_at::date - created_at::date from public.tickets $$,
  $$ values ('contact@example.test'::text, 'ouvert'::text, 7) $$,
  'ticket ouvert, réponse attendue sous 7 jours');
select is(
  public.send_project_to_menao('c4000000-0000-4000-8000-000000000001', 'Encore', 'contact@example.test'),
  (select id from public.tickets limit 1), 'un seul dossier ouvert par projet');
select throws_ok(
  $$ insert into public.tickets (type, user_id, contact_email) values ('dossier_recherche', auth.uid(), 'x@example.test') $$,
  '42501', null, 'création directe de ticket refusée');
select throws_ok(
  $$ select public.staff_set_ticket_status((select id from public.tickets limit 1), 'resolu') $$,
  '42501', null, 'statut réservé à l''équipe');

-- ---------- Autre utilisateur ----------
reset role;
select pg_temp.connecter('c1000000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select throws_ok(
  $$ select * from public.match_artisans('c4000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'résultats d''un projet d''autrui refusés');
select is((select count(*)::int from public.tickets), 0, 'tickets d''autrui invisibles');
select throws_ok(
  $$ select public.send_project_to_menao('c4000000-0000-4000-8000-000000000001', null, 'x@example.test') $$,
  '42501', null, 'dossier pour le projet d''autrui refusé');

-- ---------- Artisan A1 : pause ----------
reset role;
select pg_temp.connecter('c2000000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select lives_ok($$ select public.set_artisan_availability(true, current_date - 3) $$, 'mise en pause');
reset role;
select results_eq(
  $$ select paused, available_from from public.artisans where id = 'c3000000-0000-4000-8000-000000000001' $$,
  $$ values (true, null::date) $$, 'pause enregistrée, date passée ignorée');
select pg_temp.connecter('c1000000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select results_eq(
  $$ select artisan_id from public.match_artisans('c4000000-0000-4000-8000-000000000001') $$,
  $$ values ('c3000000-0000-4000-8000-000000000002'::uuid) $$, 'artisan en pause exclu des résultats');

-- Critères : point de la commune
select lives_ok(
  $$ select public.save_project_criteria('c4000000-0000-4000-8000-000000000002', 'plombier', null, null, null, null,
       '06088', 'Nice', '06000', 7.26, 43.70, null, null, null, 'inconnue', null) $$,
  'ville enregistrée avec son point');
select lives_ok(
  $$ select public.save_project_criteria('c4000000-0000-4000-8000-000000000002', 'plombier', 'maison', null, null, null,
       '06088', 'Nice', '06000', null, null, null, null, null, 'inconnue', null) $$,
  'ville inchangée sans coordonnées');
reset role;
select ok((select ville_location is not null from public.projects where id = 'c4000000-0000-4000-8000-000000000002'),
  'point de la commune conservé');

-- ---------- Équipe ----------
select pg_temp.connecter('c1000000-0000-4000-8000-000000000003', 'support');
set local role authenticated;
select is((select count(*)::int from public.tickets), 1, 'tickets visibles par l''équipe');
select lives_ok($$ select public.staff_set_ticket_status((select id from public.tickets limit 1), 'resolu') $$,
  'ticket résolu par le support');
select ok((select resolved_at is not null and handled_by = auth.uid() from public.tickets limit 1), 'résolution tracée');

-- ---------- Sans session ----------
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select is(
  public.artisan_public_profile('c3000000-0000-4000-8000-000000000002') ->> 'display_name', 'Basile', 'fiche lisible sans session');
select throws_ok($$ select * from public.match_artisans('c4000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'recherche réservée aux sessions');

select * from finish();
rollback;
