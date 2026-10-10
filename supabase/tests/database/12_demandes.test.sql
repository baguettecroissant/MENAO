-- F-08, F-11, F-17 : transfert du projet anonyme, demandes à 1-3 artisans, réponse, expiration.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('d1000000-0000-4000-8000-000000000001', null, true, null, '{}', '{}'),
  ('d1000000-0000-4000-8000-000000000002', 'dem.client@example.test', false, now(), '{}', '{"first_name":"Camille","last_name":"Exemple"}'),
  ('d1000000-0000-4000-8000-000000000003', 'dem.autre@example.test', false, now(), '{}', '{}'),
  ('d1000000-0000-4000-8000-000000000004', 'dem.nonconfirme@example.test', false, null, '{}', '{}'),
  ('d2000000-0000-4000-8000-000000000001', 'dem.x1@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Xavier"}'),
  ('d2000000-0000-4000-8000-000000000002', 'dem.x2@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Yasmine"}'),
  ('d2000000-0000-4000-8000-000000000003', 'dem.x3@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('d2000000-0000-4000-8000-000000000004', 'dem.x4@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('d2000000-0000-4000-8000-000000000005', 'dem.x5@example.test', false, now(), '{"role":"artisan"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- Isolement : artisans du seed en pause pendant le test.
update public.artisans set paused = true;

-- X1, X2, X4, X5 plombiers à Nice ; X3 électricien.
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, connect_charges_enabled)
select ('d3000000-0000-4000-8000-00000000000' || n)::uuid, ('d2000000-0000-4000-8000-00000000000' || n)::uuid,
  'valide', 'ARTISAN ' || n, 'communes', true
from generate_series(1, 5) n;
insert into public.artisan_trades (artisan_id, trade_code)
select ('d3000000-0000-4000-8000-00000000000' || n)::uuid, case when n = 3 then 'electricien' else 'plombier' end
from generate_series(1, 5) n;
insert into public.artisan_zones (artisan_id, code_insee, nom)
select ('d3000000-0000-4000-8000-00000000000' || n)::uuid, '06088', 'Nice' from generate_series(1, 5) n;
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status, trial_end)
select ('d3000000-0000-4000-8000-00000000000' || n)::uuid, 'base', 'cus_dem_' || n, 'sub_dem_' || n, 'trialing', now() + interval '30 days'
from generate_series(1, 5) n;
update public.profiles set phone = '+33611111111' where user_id = 'd2000000-0000-4000-8000-000000000001';

insert into public.projects (id, user_id, status, description, summary, trade_code, ville_code_insee, ville_nom, adresse,
  location, criteria_validated_at) values
  ('d4000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'criteres_valides',
   'Fuite sous l''évier. Appelez-moi au 06 12 34 56 78.', 'Réparer une fuite.', 'plombier', '06088', 'Nice',
   '1 Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', now()),
  ('d4000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000001', 'criteres_valides',
   'Autre fuite', null, 'plombier', '06088', 'Nice', null, null, now());
insert into storage.objects (bucket_id, name) values
  ('project-photos', 'd4000000-0000-4000-8000-000000000001/a.jpg');

-- ---------- Visiteur anonyme : jeton de transfert ----------
select pg_temp.connecter('d1000000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select set_config('test.jeton', public.create_project_transfer('d4000000-0000-4000-8000-000000000001'), true);
select ok(length(current_setting('test.jeton')) = 64, 'jeton de transfert créé');
select throws_ok(
  $$ select public.send_project_requests('d4000000-0000-4000-8000-000000000002', array['d3000000-0000-4000-8000-000000000001']::uuid[],
       null, '+33600000000', 'des_que_possible', null, null) $$,
  '42501', null, 'une session anonyme ne peut pas envoyer de demande');
select throws_ok($$ select public.claim_project(current_setting('test.jeton')) $$,
  '42501', null, 'transfert vers une session anonyme refusé');

-- ---------- Compte confirmé : récupération du projet ----------
reset role;
select pg_temp.connecter('d1000000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select is(public.claim_project(current_setting('test.jeton')), 'd4000000-0000-4000-8000-000000000001'::uuid,
  'projet récupéré par le compte');
select is(public.claim_project(current_setting('test.jeton')), 'd4000000-0000-4000-8000-000000000001'::uuid,
  'lien ouvert deux fois : sans effet');
select throws_ok($$ select public.claim_project('0000') $$, '22023', null, 'jeton inconnu refusé');

select is(
  public.send_project_requests('d4000000-0000-4000-8000-000000000001',
    array['d3000000-0000-4000-8000-000000000001', 'd3000000-0000-4000-8000-000000000002', 'd3000000-0000-4000-8000-000000000001']::uuid[],
    'Merci de me rappeler au 06 12 34 56 78', '+33612345678', 'plage', '09:00', '12:00'),
  2, 'demande envoyée à 2 artisans (doublon retiré)');
select results_eq(
  $$ select status::text, (expires_at - created_at) = interval '48 hours' from public.requests order by artisan_id $$,
  $$ values ('envoyee'::text, true), ('envoyee'::text, true) $$,
  'demandes envoyées, réponse attendue sous 48 h');
select is((select status::text from public.projects where id = 'd4000000-0000-4000-8000-000000000001'),
  'demande_envoyee', 'projet en « demande envoyée »');
select throws_ok(
  $$ select public.save_project_criteria('d4000000-0000-4000-8000-000000000001', 'plombier', null, null, null, null,
       '06088', 'Nice', '06000', null, null, null, null, null, 'inconnue', null) $$,
  '42501', null, 'critères figés après l''envoi');
select throws_ok(
  $$ select public.send_project_requests('d4000000-0000-4000-8000-000000000001', array['d3000000-0000-4000-8000-000000000001']::uuid[],
       null, '+33612345678', 'des_que_possible', null, null) $$,
  '22023', 'Demande déjà envoyée à cet artisan', 'pas de seconde demande au même artisan');
select throws_ok(
  $$ select public.send_project_requests('d4000000-0000-4000-8000-000000000001', array['d3000000-0000-4000-8000-000000000003']::uuid[],
       null, '+33612345678', 'des_que_possible', null, null) $$,
  '22023', 'Un des artisans choisis n''est plus disponible pour ce projet', 'artisan hors correspondance refusé');
select throws_ok(
  $$ select public.send_project_requests('d4000000-0000-4000-8000-000000000001',
       array['d3000000-0000-4000-8000-000000000004', 'd3000000-0000-4000-8000-000000000005']::uuid[],
       null, '+33612345678', 'des_que_possible', null, null) $$,
  '22023', 'Vous pouvez contacter 3 artisans au plus pour ce projet', '3 artisans au plus par projet');
select throws_ok(
  $$ insert into public.requests (project_id, artisan_id, particulier_id, contact_phone)
     values ('d4000000-0000-4000-8000-000000000001', 'd3000000-0000-4000-8000-000000000004', auth.uid(), '+33600000000') $$,
  '42501', null, 'création directe refusée');

-- ---------- Artisan X1 : demande reçue ----------
reset role;
select pg_temp.connecter('d2000000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select results_eq($$ select client_first_name, status::text from public.artisan_inbox() $$,
  $$ values ('Camille'::text, 'envoyee'::text) $$, 'demande dans la boîte de réception');
select set_config('test.demande', (select request_id::text from public.artisan_inbox()), true);
select results_eq(
  $$ select d #>> '{client,phone}', d #>> '{client,email}', d #>> '{client,last_name}', d ->> 'adresse',
            d ->> 'message', d ->> 'description'
     from public.artisan_request_detail(current_setting('test.demande')::uuid) d $$,
  $$ values (null::text, null::text, null::text, null::text, 'Merci de me rappeler au [téléphone]'::text,
             'Fuite sous l''évier. Appelez-moi au [téléphone].'::text) $$,
  'avant acceptation : ni coordonnées ni adresse, numéros masqués');
select is((select count(*)::int from storage.objects where bucket_id = 'project-photos'), 1, 'photos du projet lisibles');
select throws_ok(
  $$ select public.artisan_respond_request(current_setting('test.demande')::uuid, false) $$,
  '22023', 'Motif de refus obligatoire', 'refus sans motif impossible');
select throws_ok($$ select public.artisan_respond_request(current_setting('test.demande')::uuid, true) $$,
  '22023', 'Fixez un rendez-vous pour accepter la demande', 'acceptation par rendez-vous seulement (F-17)');
select lives_ok(
  $$ select public.artisan_fix_appointment(current_setting('test.demande')::uuid, current_date + 2, '10:00') $$,
  'rendez-vous fixé : demande acceptée');
select results_eq(
  $$ select d #>> '{client,phone}', d #>> '{client,email}', d #>> '{client,last_name}', d ->> 'adresse'
     from public.artisan_request_detail(current_setting('test.demande')::uuid) d $$,
  $$ values ('+33612345678'::text, 'dem.client@example.test'::text, 'Exemple'::text, '1 Rue de l''Exemple 06000 Nice'::text) $$,
  'après acceptation : coordonnées et adresse visibles');
select throws_ok($$ select public.artisan_respond_request(current_setting('test.demande')::uuid, false, 'autre', 'x') $$,
  '22023', 'Cette demande n''attend plus de réponse', 'réponse définitive');

-- ---------- Artisan X2 : refus ----------
reset role;
select pg_temp.connecter('d2000000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select set_config('test.demande2', (select request_id::text from public.artisan_inbox()), true);
select throws_ok($$ select public.artisan_respond_request(current_setting('test.demande2')::uuid, false, 'autre', ' ') $$,
  '22023', 'Motif de refus obligatoire', 'motif « autre » à préciser');
select lives_ok($$ select public.artisan_respond_request(current_setting('test.demande2')::uuid, false, 'planning_complet') $$,
  'demande refusée');

-- ---------- Artisan X3 : non destinataire ----------
reset role;
select pg_temp.connecter('d2000000-0000-4000-8000-000000000003', 'artisan');
set local role authenticated;
select is((select count(*)::int from public.artisan_inbox()), 0, 'aucune demande pour un non-destinataire');
select is(public.artisan_request_detail(current_setting('test.demande')::uuid), null, 'détail invisible');
select is((select count(*)::int from storage.objects where bucket_id = 'project-photos'), 0, 'photos invisibles');
select is((select count(*)::int from public.requests), 0, 'table des demandes filtrée');

-- ---------- Particulier : suivi ----------
reset role;
select pg_temp.connecter('d1000000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select results_eq(
  $$ select artisan_name, status::text, artisan_phone, artisan_email from public.particulier_requests() order by artisan_name $$,
  $$ values ('Xavier'::text, 'acceptee'::text, '+33611111111'::text, 'dem.x1@example.test'::text),
            ('Yasmine'::text, 'refusee'::text, null::text, null::text) $$,
  'coordonnées de l''artisan après acceptation seulement');
select is(
  public.send_project_requests('d4000000-0000-4000-8000-000000000001', array['d3000000-0000-4000-8000-000000000004']::uuid[],
    null, '+33612345678', 'des_que_possible', null, null),
  1, 'un refus libère une place');

-- ---------- Autres comptes ----------
reset role;
select pg_temp.connecter('d1000000-0000-4000-8000-000000000003', 'particulier');
set local role authenticated;
select is((select count(*)::int from public.particulier_requests()), 0, 'demandes d''autrui invisibles');
select throws_ok($$ select public.claim_project(current_setting('test.jeton')) $$,
  '22023', null, 'jeton déjà utilisé par un autre compte');
reset role;
select pg_temp.connecter('d1000000-0000-4000-8000-000000000004', 'particulier');
set local role authenticated;
select throws_ok(
  $$ select public.send_project_requests('d4000000-0000-4000-8000-000000000001', array['d3000000-0000-4000-8000-000000000005']::uuid[],
       null, '+33612345678', 'des_que_possible', null, null) $$,
  '42501', null, 'e-mail non confirmé : envoi refusé');

-- ---------- Expiration (48 h) ----------
reset role;
update public.requests set expires_at = now() - interval '1 minute'
where artisan_id = 'd3000000-0000-4000-8000-000000000004';
select is(app.expire_requests(), 1, 'demande sans réponse expirée');
select is((select status::text from public.requests where artisan_id = 'd3000000-0000-4000-8000-000000000004'),
  'expiree', 'statut « expirée »');
select isnt_empty($$ select 1 from cron.job where jobname = 'menao-expiration-demandes' $$, 'tâche planifiée');

select * from finish();
rollback;
