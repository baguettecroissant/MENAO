-- Notation du client par l'artisan (F-23, ADR 0106) : après la clôture, une note par chantier,
-- jamais lisible par le client ; moyenne visible de l'artisan qui reçoit une demande seulement si
-- l'équipe l'active ; objectifs de gamification « avis sur les clients ».
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c5300000-0000-4000-8000-0000000000a1', 'note.artisan.a@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Aline"}'),
  ('c5300000-0000-4000-8000-0000000000b1', 'note.artisan.b@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Bruno"}'),
  ('c5300000-0000-4000-8000-0000000000c1', 'note.client@example.test', false, now(), '{}', '{"first_name":"Camille"}'),
  ('c5300000-0000-4000-8000-0000000000d1', 'note.support@example.test', false, now(), '{"role":"support"}', '{}'),
  ('c5300000-0000-4000-8000-0000000000e1', 'note.admin@example.test', false, now(), '{"role":"admin"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, connect_charges_enabled, stripe_account_id, assujetti_tva) values
  ('c5310000-0000-4000-8000-0000000000a1', 'c5300000-0000-4000-8000-0000000000a1', 'valide', '00000002600013',
   'ALINE RENOVATION', '5710', '4 RUE DE LA PAIX', '06000', 'NICE', 'communes', true, 'acct_note_a', true),
  ('c5310000-0000-4000-8000-0000000000b1', 'c5300000-0000-4000-8000-0000000000b1', 'valide', '00000001800010',
   'BRUNO PLOMBERIE', '1000', '8 RUE DU PORT', '06300', 'NICE', 'communes', true, 'acct_note_b', true);

insert into public.projects (id, user_id, status, description, trade_code, ville_code_insee, ville_nom) values
  ('c5320000-0000-4000-8000-000000000001', 'c5300000-0000-4000-8000-0000000000c1', 'demande_envoyee', 'Salle de bain', 'plombier', '06088', 'Nice'),
  ('c5320000-0000-4000-8000-000000000002', 'c5300000-0000-4000-8000-0000000000c1', 'demande_envoyee', 'Cuisine', 'plombier', '06088', 'Nice'),
  ('c5320000-0000-4000-8000-000000000003', 'c5300000-0000-4000-8000-0000000000c1', 'demande_envoyee', 'Fuite', 'plombier', '06088', 'Nice');
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone, status, responded_at) values
  ('c5330000-0000-4000-8000-000000000001', 'c5320000-0000-4000-8000-000000000001', 'c5310000-0000-4000-8000-0000000000a1',
   'c5300000-0000-4000-8000-0000000000c1', '+33600000002', 'acceptee', now()),
  ('c5330000-0000-4000-8000-000000000002', 'c5320000-0000-4000-8000-000000000002', 'c5310000-0000-4000-8000-0000000000a1',
   'c5300000-0000-4000-8000-0000000000c1', '+33600000002', 'acceptee', now()),
  ('c5330000-0000-4000-8000-000000000003', 'c5320000-0000-4000-8000-000000000003', 'c5310000-0000-4000-8000-0000000000b1',
   'c5300000-0000-4000-8000-0000000000c1', '+33600000002', 'envoyee', null);
insert into public.chantiers (id, project_id, request_id, artisan_id, particulier_id, title) values
  ('c5340000-0000-4000-8000-000000000001', 'c5320000-0000-4000-8000-000000000001', 'c5330000-0000-4000-8000-000000000001',
   'c5310000-0000-4000-8000-0000000000a1', 'c5300000-0000-4000-8000-0000000000c1', 'Salle de bain'),
  ('c5340000-0000-4000-8000-000000000002', 'c5320000-0000-4000-8000-000000000002', 'c5330000-0000-4000-8000-000000000002',
   'c5310000-0000-4000-8000-0000000000a1', 'c5300000-0000-4000-8000-0000000000c1', 'Cuisine');
-- États posés directement (le parcours complet est testé ailleurs), comme le fait transition_chantier().
select set_config('menao.transition_chantier', 'on', true);
update public.chantiers set status = 'cloture' where id = 'c5340000-0000-4000-8000-000000000001';
update public.chantiers set status = 'en_cours' where id = 'c5340000-0000-4000-8000-000000000002';
select set_config('menao.transition_chantier', '', true);

-- ---------- Artisan A : notation ----------
select pg_temp.connecter('c5300000-0000-4000-8000-0000000000a1', 'artisan');
set local role authenticated;
select throws_ok(
  $$ select public.artisan_rate_client('c5340000-0000-4000-8000-000000000002', 90, 80, 100,
     'Client très agréable, accès facile au chantier, échanges clairs et rapides.') $$,
  '22023', 'Le client se note une fois le chantier clôturé.', 'chantier en cours : pas de note');
select throws_ok(
  $$ select public.artisan_rate_client('c5340000-0000-4000-8000-000000000001', 90, 80, 100, 'Très bien.') $$,
  '22023', 'Commentaire de 50 à 1 000 caractères.', 'commentaire trop court : refus');
select throws_ok(
  $$ select public.artisan_rate_client('c5340000-0000-4000-8000-000000000001', 120, 80, 100,
     'Client très agréable, accès facile au chantier, échanges clairs et rapides.') $$,
  '22023', 'Note invalide.', 'note hors bornes : refus');
select lives_ok(
  $$ select public.artisan_rate_client('c5340000-0000-4000-8000-000000000001', 90, 80, 100,
     'Client très agréable, accès facile au chantier, échanges clairs et rapides.') $$,
  'chantier clôturé : note enregistrée');
select throws_ok(
  $$ select public.artisan_rate_client('c5340000-0000-4000-8000-000000000001', 50, 50, 50,
     'Seconde note sur le même chantier, qui ne doit pas être acceptée par la base.') $$,
  '22023', 'Vous avez déjà noté ce client pour ce chantier.', 'une seule note par chantier');
select results_eq($$ select welcome, clarity, payment from public.client_ratings $$,
  $$ values (90::smallint, 80::smallint, 100::smallint) $$, 'artisan : relit sa note');
select throws_ok(
  $$ insert into public.client_ratings (chantier_id, artisan_id, particulier_id, welcome, clarity, payment, comment)
     values ('c5340000-0000-4000-8000-000000000002', 'c5310000-0000-4000-8000-0000000000a1',
       'c5300000-0000-4000-8000-0000000000c1', 1, 1, 1, repeat('x', 60)) $$,
  '42501', null, 'pas d''écriture directe');
select is_empty($$ select * from public.platform_settings $$, 'artisan : paramètres non lisibles');
reset role;

select ok(exists (select 1 from public.xp_events where artisan_id = 'c5310000-0000-4000-8000-0000000000a1'
  and objective_code = 'premier_avis'), 'objectif « Premier avis » atteint (gamification)');

-- ---------- Artisan B : ne note pas le chantier de A, ne lit pas sa note ----------
select pg_temp.connecter('c5300000-0000-4000-8000-0000000000b1', 'artisan');
set local role authenticated;
select throws_ok(
  $$ select public.artisan_rate_client('c5340000-0000-4000-8000-000000000001', 10, 10, 10,
     'Tentative de note sur le chantier d''un autre artisan, refusée par la base.') $$,
  '42501', null, 'autre artisan : pas de note');
select is_empty($$ select * from public.client_ratings $$, 'autre artisan : note de A non lisible');
select is_empty($$ select * from public.client_reputation('c5330000-0000-4000-8000-000000000003') $$,
  'visibilité désactivée : aucune moyenne, même pour la demande reçue');
reset role;

-- ---------- Client : ne voit jamais les notes ----------
select pg_temp.connecter('c5300000-0000-4000-8000-0000000000c1', 'particulier');
set local role authenticated;
select is_empty($$ select * from public.client_ratings $$, 'client : ses notes ne lui sont pas montrées');
select throws_ok(
  $$ select public.artisan_rate_client('c5340000-0000-4000-8000-000000000001', 10, 10, 10, repeat('x', 60)) $$,
  '42501', null, 'client : pas de note');
reset role;

-- ---------- Équipe MENAO ----------
select pg_temp.connecter('c5300000-0000-4000-8000-0000000000d1', 'support');
set local role authenticated;
select is((select count(*)::int from public.client_ratings), 1, 'support : voit les notes');
select is((select value from public.platform_settings where key = 'client_ratings_visible'), 'false'::jsonb,
  'visibilité désactivée par défaut');
select throws_ok($$ select public.admin_set_platform_setting('client_ratings_visible', 'true') $$, '42501', null,
  'support : ne change pas les paramètres');
reset role;

select pg_temp.connecter('c5300000-0000-4000-8000-0000000000e1', 'admin', 'aal1');
set local role authenticated;
select throws_ok($$ select public.admin_set_platform_setting('client_ratings_visible', 'true') $$, '42501', null,
  'admin sans double authentification : refus');
reset role;
select pg_temp.connecter('c5300000-0000-4000-8000-0000000000e1', 'admin', 'aal2');
set local role authenticated;
select throws_ok($$ select public.admin_set_platform_setting('inconnu', 'true') $$, '22023', 'Paramètre inconnu.',
  'paramètre inconnu : refus');
select lives_ok($$ select public.admin_set_platform_setting('client_ratings_visible', 'true') $$,
  'admin : active la visibilité');
reset role;

-- ---------- Visibilité activée ----------
select pg_temp.connecter('c5300000-0000-4000-8000-0000000000b1', 'artisan');
set local role authenticated;
select results_eq($$ select ratings, welcome, clarity, payment from public.client_reputation('c5330000-0000-4000-8000-000000000003') $$,
  $$ values (1, 90, 80, 100) $$, 'artisan qui reçoit la demande : moyenne des notes du client');
reset role;
select pg_temp.connecter('c5300000-0000-4000-8000-0000000000a1', 'artisan');
set local role authenticated;
select is_empty($$ select * from public.client_reputation('c5330000-0000-4000-8000-000000000003') $$,
  'artisan qui n''a pas reçu la demande : rien');
reset role;
update public.artisans set status = 'suspendu', suspension_reason = 'decision_admin' where id = 'c5310000-0000-4000-8000-0000000000b1';
select pg_temp.connecter('c5300000-0000-4000-8000-0000000000b1', 'artisan');
set local role authenticated;
select is_empty($$ select * from public.client_reputation('c5330000-0000-4000-8000-000000000003') $$,
  'artisan non validé : rien');
reset role;

-- ---------- Visiteur ----------
set local role anon;
select throws_ok($$ select count(*) from public.client_ratings $$, '42501', null, 'visiteur : pas de lecture');
reset role;

select * from finish();
rollback;
