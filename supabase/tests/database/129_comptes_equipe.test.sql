-- Comptes d'équipe (F-89, ADR 0240) : invitation par le patron dans la limite des places de la
-- formule (patron compris), une seule entreprise par personne, membre actif reconnu par
-- app.my_artisan_id(), fiche lisible mais pas modifiable par un membre, formule réduite (derniers
-- invités suspendus puis réactivés), choix du patron, retrait (compte redevenu particulier).
-- Données fictives (c129…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1290000-0000-4000-8000-000000000001', 'equipe129.patron@example.test', false, now(), now(), '{"role":"artisan"}', '{}'),
  ('c1290000-0000-4000-8000-000000000002', 'equipe129.chef@example.test', false, null, null, '{"role":"artisan"}', '{"first_name":"Chef"}'),
  ('c1290000-0000-4000-8000-000000000003', 'equipe129.ouvrier@example.test', false, null, null, '{"role":"artisan"}', '{}'),
  ('c1290000-0000-4000-8000-000000000004', 'equipe129.troisieme@example.test', false, null, null, '{"role":"artisan"}', '{}'),
  ('c1290000-0000-4000-8000-000000000005', 'equipe129.autre@example.test', false, now(), now(), '{"role":"artisan"}', '{}'),
  ('c1290000-0000-4000-8000-000000000006', 'equipe129.client@example.test', false, now(), now(), '{"role":"particulier"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, nom_commercial, zone_mode) values
  ('c1291000-0000-4000-8000-000000000001', 'c1290000-0000-4000-8000-000000000001', 'valide', 'PATRON 129', 'Maçonnerie Patron', 'communes'),
  ('c1291000-0000-4000-8000-000000000005', 'c1290000-0000-4000-8000-000000000005', 'valide', 'AUTRE 129', null, 'communes');
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('c1291000-0000-4000-8000-000000000001', 'premium', 'cus_c129', 'sub_c129', 'active');

-- Un chantier de l'entreprise, journal ouvert.
insert into public.projects (id, user_id, status, description, trade_code, ville_code_insee, ville_nom, criteria_validated_at) values
  ('c1292000-0000-4000-8000-000000000001', 'c1290000-0000-4000-8000-000000000006', 'criteres_valides',
   'Projet 129', 'plombier', '06004', 'Antibes', now());
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone, status) values
  ('c1293000-0000-4000-8000-000000000001', 'c1292000-0000-4000-8000-000000000001', 'c1291000-0000-4000-8000-000000000001',
   'c1290000-0000-4000-8000-000000000006', '+33600001290', 'acceptee');
insert into public.chantiers (id, project_id, request_id, artisan_id, particulier_id, title) values
  ('c1294000-0000-4000-8000-000000000001', 'c1292000-0000-4000-8000-000000000001', 'c1293000-0000-4000-8000-000000000001',
   'c1291000-0000-4000-8000-000000000001', 'c1290000-0000-4000-8000-000000000006', 'Chantier 129');
select set_config('menao.transition_chantier', 'on', true);
update public.chantiers set status = 'en_cours' where id = 'c1294000-0000-4000-8000-000000000001';
select set_config('menao.transition_chantier', '', true);

-- ---------- Invitations par le patron ----------
set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1290000-0000-4000-8000-000000000001',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select is((public.my_team() ->> 'places')::int, 3, 'Premium : 3 comptes, patron compris');
select is((public.my_team() ->> 'utilisees')::int, 1, 'le patron seul au départ');
select is(public.my_team_context() ->> 'role', 'patron', 'contexte : patron');
select lives_ok($$ select public.artisan_record_team_invite('c1290000-0000-4000-8000-000000000002', 'chef') $$,
  'chef d''équipe invité');
select lives_ok($$ select public.artisan_record_team_invite('c1290000-0000-4000-8000-000000000003', 'ouvrier') $$,
  'ouvrier invité');
select throws_ok($$ select public.artisan_record_team_invite('c1290000-0000-4000-8000-000000000004', 'ouvrier') $$,
  '22023', 'Toutes les places de votre formule sont prises.', 'pas au-delà des places');
select is((public.my_team() ->> 'utilisees')::int, 3, 'trois comptes utilisés');
-- Invitations de la même transaction : même date, on cherche le chef par son compte.
select is((select m ->> 'prenom' from jsonb_array_elements(public.my_team() -> 'membres') m
  where m ->> 'user_id' = 'c1290000-0000-4000-8000-000000000002'), 'Chef', 'membres : prénom du profil');
select is((select (m ->> 'en_attente')::boolean from jsonb_array_elements(public.my_team() -> 'membres') m
  where m ->> 'user_id' = 'c1290000-0000-4000-8000-000000000002'), true, 'membres : jamais connecté');
select is((select count(*)::int from public.artisan_members), 2, 'patron : lit ses deux membres');
select throws_ok($$ insert into public.artisan_members (artisan_id, user_id, role)
  values ('c1291000-0000-4000-8000-000000000001', 'c1290000-0000-4000-8000-000000000004', 'chef') $$,
  '42501', null, 'écriture directe refusée');
reset role;
select is((select count(*)::int from public.audit_logs where action = 'equipe_artisan.invitation'
  and target_id in ('c1290000-0000-4000-8000-000000000002', 'c1290000-0000-4000-8000-000000000003')), 2,
  'invitations journalisées');

-- Une seule entreprise par personne ; jamais un patron ni un particulier.
update public.subscriptions set plan_code = 'entreprise' where artisan_id = 'c1291000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1290000-0000-4000-8000-000000000001',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select throws_ok($$ select public.artisan_record_team_invite('c1290000-0000-4000-8000-000000000002', 'chef') $$,
  '22023', 'Compte invité introuvable.', 'déjà membre : refusé');
select throws_ok($$ select public.artisan_record_team_invite('c1290000-0000-4000-8000-000000000005', 'chef') $$,
  '22023', 'Compte invité introuvable.', 'patron d''une autre entreprise : refusé');
select throws_ok($$ select public.artisan_record_team_invite('c1290000-0000-4000-8000-000000000006', 'chef') $$,
  '22023', 'Compte invité introuvable.', 'compte particulier : refusé');
reset role;
update public.subscriptions set plan_code = 'premium' where artisan_id = 'c1291000-0000-4000-8000-000000000001';

-- ---------- Membre actif ----------
set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1290000-0000-4000-8000-000000000002',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select is(app.my_artisan_id(), 'c1291000-0000-4000-8000-000000000001'::uuid, 'membre : fiche de son entreprise');
select is(app.my_team_role(), 'chef', 'membre : son rôle');
select is(public.my_team_context() ->> 'entreprise', 'Maçonnerie Patron', 'contexte : nom de l''entreprise');
select is((select count(*)::int from public.artisans), 1, 'membre : lit la fiche de l''entreprise, et elle seule');
select is((select count(*)::int from public.chantiers), 1, 'membre : chantiers de l''entreprise');
select is((select count(*)::int from public.artisan_members), 1, 'membre : sa seule ligne');
update public.artisans set nom_commercial = 'Piratage' where id = 'c1291000-0000-4000-8000-000000000001';
select throws_ok($$ select public.my_team() $$, '42501', null, 'membre : « Mon équipe » réservé au patron');
select throws_ok($$ select public.artisan_record_team_invite('c1290000-0000-4000-8000-000000000004', 'chef') $$,
  '42501', null, 'membre : invitation refusée');
select throws_ok($$ select public.remove_team_member('c1290000-0000-4000-8000-000000000003') $$,
  '42501', null, 'membre : retrait refusé');
reset role;
select is((select nom_commercial from public.artisans where id = 'c1291000-0000-4000-8000-000000000001'),
  'Maçonnerie Patron', 'membre : fiche de l''entreprise non modifiable');

-- Autre artisan : rien de l'équipe.
set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1290000-0000-4000-8000-000000000005',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select is((select count(*)::int from public.artisan_members), 0, 'autre artisan : aucun membre');
select is((select count(*)::int from public.chantiers), 0, 'autre artisan : aucun chantier');
select is((public.my_team() ->> 'places')::int, 1, 'sans abonnement : une seule place');
reset role;

-- Photo du journal et pièce jointe déposées par un membre (Edge Function, rôle service).
set local role service_role;
select is(public.record_chantier_photo('c1294000-0000-4000-8000-000000000001', 'c1290000-0000-4000-8000-000000000002',
  'c1294000-0000-4000-8000-000000000001/photo.jpg'), 'ok', 'membre : photo du journal');
select is(public.record_chantier_photo('c1294000-0000-4000-8000-000000000001', 'c1290000-0000-4000-8000-000000000005',
  'c1294000-0000-4000-8000-000000000001/photo2.jpg'), 'forbidden', 'autre artisan : photo refusée');
-- Chef d'équipe : tous les chantiers ; un ouvrier, seulement les siens (test 130).
select is(public.record_message_attachment('c1294000-0000-4000-8000-000000000001', 'c1290000-0000-4000-8000-000000000002',
  'photo', 'c1294000-0000-4000-8000-000000000001/piece.jpg'), 'ok', 'membre : pièce jointe');
reset role;

-- ---------- Formule réduite puis rétablie ----------
update public.subscriptions set plan_code = 'base' where artisan_id = 'c1291000-0000-4000-8000-000000000001';
select is((select count(*)::int from public.artisan_members where suspended_reason = 'places'), 2,
  'formule Base : membres suspendus, pas supprimés');
set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1290000-0000-4000-8000-000000000003',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select is(app.my_artisan_id(), null, 'membre suspendu : plus d''accès');
select is((public.my_team_context() ->> 'suspendu')::boolean, true, 'contexte : accès suspendu');
select is((select count(*)::int from public.chantiers), 0, 'membre suspendu : aucun chantier');
reset role;

update public.subscriptions set plan_code = 'premium' where artisan_id = 'c1291000-0000-4000-8000-000000000001';
select is((select count(*)::int from public.artisan_members where suspended_at is null), 2,
  'formule rétablie : membres réactivés');

-- Impayé au-delà de la période de grâce : tâche quotidienne.
update public.subscriptions set status = 'past_due', past_due_since = now() - interval '20 days'
where artisan_id = 'c1291000-0000-4000-8000-000000000001';
select is((select count(*)::int from public.artisan_members where suspended_at is null), 0,
  'impayé prolongé : membres suspendus');
update public.subscriptions set status = 'active', past_due_since = null
where artisan_id = 'c1291000-0000-4000-8000-000000000001';
select is(app.sync_all_team_seats(), 0, 'tâche quotidienne : rien à changer');

-- ---------- Choix du patron ----------
set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1290000-0000-4000-8000-000000000001',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select lives_ok($$ select public.set_team_member_active('c1290000-0000-4000-8000-000000000003', false) $$,
  'patron : suspend l''ouvrier');
select lives_ok($$ select public.artisan_record_team_invite('c1290000-0000-4000-8000-000000000004', 'ouvrier') $$,
  'place libérée : nouvel ouvrier invité');
select throws_ok($$ select public.set_team_member_active('c1290000-0000-4000-8000-000000000003', true) $$,
  '22023', 'Toutes les places de votre formule sont prises.', 'réactivation : place nécessaire');
select lives_ok($$ select public.set_team_member_role('c1290000-0000-4000-8000-000000000004', 'chef') $$,
  'patron : change un rôle');
select is((select role::text from public.artisan_members where user_id = 'c1290000-0000-4000-8000-000000000004'),
  'chef', 'rôle changé');
select is((public.remove_team_member('c1290000-0000-4000-8000-000000000004') ->> 'en_attente')::boolean, true,
  'retrait : invitation jamais utilisée');
reset role;
select is((select raw_app_meta_data ->> 'role' from auth.users where id = 'c1290000-0000-4000-8000-000000000004'),
  'particulier', 'retrait : le compte redevient particulier');
select is((select role::text from public.profiles where user_id = 'c1290000-0000-4000-8000-000000000004'),
  'particulier', 'retrait : profil à jour');
select is((select suspended_reason from public.artisan_members where user_id = 'c1290000-0000-4000-8000-000000000003'),
  'patron', 'suspendu par le patron : pas de retour automatique');
select is((select count(*)::int from public.audit_logs where action = 'equipe_artisan.retrait'), 1, 'retrait journalisé');

select * from finish();
rollback;
