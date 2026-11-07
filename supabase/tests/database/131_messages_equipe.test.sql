-- Comptes d'équipe, messages, journal et notifications (F-89, ADR 0243) : auteur et côté de chaque
-- message, non lus et « lu » du côté de l'entreprise, « Prénom (Entreprise) » pour le client,
-- notifications copiées au chef et à l'ouvrier attribué, attribution d'un chantier.
-- Données fictives (c131…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1310000-0000-4000-8000-000000000001', 'msg131.patron@example.test', false, now(), now(), '{"role":"artisan"}', '{"first_name":"Paul"}'),
  ('c1310000-0000-4000-8000-000000000002', 'msg131.chef@example.test', false, now(), now(), '{"role":"artisan"}', '{"first_name":"Chloé"}'),
  ('c1310000-0000-4000-8000-000000000003', 'msg131.ouvrier@example.test', false, now(), now(), '{"role":"artisan"}', '{"first_name":"Oscar"}'),
  ('c1310000-0000-4000-8000-000000000005', 'msg131.client@example.test', false, now(), now(), '{"role":"particulier"}', '{"first_name":"Claire"}');
insert into public.artisans (id, user_id, status, raison_sociale, nom_commercial, zone_mode) values
  ('c1311000-0000-4000-8000-000000000001', 'c1310000-0000-4000-8000-000000000001', 'valide', 'PATRON 131', 'Plomberie 131', 'communes');
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('c1311000-0000-4000-8000-000000000001', 'entreprise', 'cus_c131', 'sub_c131', 'active');
insert into public.artisan_members (artisan_id, user_id, role, invited_by) values
  ('c1311000-0000-4000-8000-000000000001', 'c1310000-0000-4000-8000-000000000002', 'chef', 'c1310000-0000-4000-8000-000000000001'),
  ('c1311000-0000-4000-8000-000000000001', 'c1310000-0000-4000-8000-000000000003', 'ouvrier', 'c1310000-0000-4000-8000-000000000001');
insert into public.projects (id, user_id, status, description, trade_code, ville_code_insee, ville_nom, criteria_validated_at) values
  ('c1312000-0000-4000-8000-000000000001', 'c1310000-0000-4000-8000-000000000005', 'criteres_valides', 'Projet 131',
   'plombier', '06004', 'Antibes', now());
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone, status) values
  ('c1313000-0000-4000-8000-000000000001', 'c1312000-0000-4000-8000-000000000001', 'c1311000-0000-4000-8000-000000000001',
   'c1310000-0000-4000-8000-000000000005', '+33600001310', 'acceptee');
insert into public.chantiers (id, project_id, request_id, artisan_id, particulier_id, title) values
  ('c1314000-0000-4000-8000-000000000001', 'c1312000-0000-4000-8000-000000000001', 'c1313000-0000-4000-8000-000000000001',
   'c1311000-0000-4000-8000-000000000001', 'c1310000-0000-4000-8000-000000000005', 'Chantier 131');
select set_config('menao.transition_chantier', 'on', true);
update public.chantiers set status = 'en_cours' where id = 'c1314000-0000-4000-8000-000000000001';
select set_config('menao.transition_chantier', '', true);

-- ---------- Attribution : l'ouvrier est prévenu, une seule fois ----------
set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1310000-0000-4000-8000-000000000001',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select public.set_chantier_team('c1314000-0000-4000-8000-000000000001', array['c1310000-0000-4000-8000-000000000003']::uuid[]);
select public.set_chantier_team('c1314000-0000-4000-8000-000000000001', array['c1310000-0000-4000-8000-000000000003']::uuid[]);
select lives_ok($$ select public.send_message('c1314000-0000-4000-8000-000000000001', 'Message du patron') $$,
  'patron : message au client');
reset role;
select is((select count(*)::int from public.notifications where type = 'chantier_attribue'
  and user_id = 'c1310000-0000-4000-8000-000000000003' and data ->> 'chantier_id' = 'c1314000-0000-4000-8000-000000000001'),
  1, 'attribution : ouvrier prévenu une fois');
select is((select data ->> 'entreprise' from public.notifications where type = 'chantier_attribue'
  and user_id = 'c1310000-0000-4000-8000-000000000003'), 'Plomberie 131', 'attribution : nom de l''entreprise');

-- ---------- Message du client : patron, chef et ouvrier du chantier ----------
set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1310000-0000-4000-8000-000000000005',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'particulier'))::text, true);
select lives_ok($$ select public.send_message('c1314000-0000-4000-8000-000000000001', 'Bonjour') $$, 'client : message');
reset role;
select is((select count(*)::int from public.notifications where type = 'nouveaux_messages'
  and data ->> 'chantier_id' = 'c1314000-0000-4000-8000-000000000001' and data ->> 'destinataire' = 'artisan'),
  3, 'message du client : patron, chef et ouvrier prévenus');

-- ---------- Message de l'ouvrier : le client voit « Prénom (Entreprise) » ----------
set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1310000-0000-4000-8000-000000000003',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select lives_ok($$ select public.send_message('c1314000-0000-4000-8000-000000000001', 'Je passe demain') $$,
  'ouvrier : message au client');
select lives_ok($$ select public.artisan_add_chantier_message('c1314000-0000-4000-8000-000000000001', 'Pose terminée') $$,
  'ouvrier : journal');
reset role;
select ok(exists (select 1 from public.notifications where type = 'nouveaux_messages'
  and user_id = 'c1310000-0000-4000-8000-000000000005'), 'message de l''entreprise : client prévenu');

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1310000-0000-4000-8000-000000000005',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'particulier'))::text, true);
select is((select author_name from public.chantier_messages('c1314000-0000-4000-8000-000000000001') where body = 'Je passe demain'),
  'Oscar (Plomberie 131)', 'client : message d''un membre signé « Prénom (Entreprise) »');
select is((select author_name from public.chantier_messages('c1314000-0000-4000-8000-000000000001') where body = 'Message du patron'),
  null, 'client : message du patron au nom de l''entreprise');
select is((select count(*)::int from public.chantier_messages('c1314000-0000-4000-8000-000000000001') where mine), 1,
  'client : seul son message est le sien');
select is((select value #>> '{}' from jsonb_each(public.chantier_update_authors('c1314000-0000-4000-8000-000000000001'))),
  'Oscar (Plomberie 131)', 'client : auteur de l''entrée du journal');
select is(public.my_unread_messages(), 2, 'client : deux messages de l''entreprise non lus');

-- ---------- Chef : côté de l'entreprise, non lus et « lu » ----------
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1310000-0000-4000-8000-000000000002',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select is((select count(*)::int from public.chantier_messages('c1314000-0000-4000-8000-000000000001') where mine), 2,
  'chef : les messages de l''entreprise sont de son côté');
select is((select author_name from public.chantier_messages('c1314000-0000-4000-8000-000000000001') where body = 'Je passe demain'),
  'Oscar', 'chef : prénom du collègue');
select is((select author_name from public.chantier_messages('c1314000-0000-4000-8000-000000000001') where body = 'Message du patron'),
  'Paul', 'chef : prénom du patron');
select is(public.my_unread_messages(), 1, 'chef : seul le message du client est non lu');
select is((select unread from public.my_conversations() where chantier_id = 'c1314000-0000-4000-8000-000000000001'), 1,
  'chef : conversation avec un non lu');
select is((select value #>> '{}' from jsonb_each(public.chantier_update_authors('c1314000-0000-4000-8000-000000000001'))),
  'Oscar', 'chef : auteur de l''entrée du journal');
select is(public.mark_conversation_read('c1314000-0000-4000-8000-000000000001'), 1, 'chef : marque lu le message du client');
reset role;
select is((select count(*)::int from public.messages where chantier_id = 'c1314000-0000-4000-8000-000000000001'
  and read_at is null), 2, 'les messages de l''entreprise restent non lus pour le client');

-- ---------- Autres notifications : copies au chef et à l'ouvrier attribué ----------
select app.notify('c1310000-0000-4000-8000-000000000001', 'devis_signe',
  jsonb_build_object('chantier_id', 'c1314000-0000-4000-8000-000000000001'));
select app.notify('c1310000-0000-4000-8000-000000000001', 'rdv_modifie',
  jsonb_build_object('chantier_id', 'c1314000-0000-4000-8000-000000000001'));
select app.notify('c1310000-0000-4000-8000-000000000001', 'dossier_valide', '{}'::jsonb);
select is((select array_agg(type::text order by type::text) from public.notifications
  where user_id = 'c1310000-0000-4000-8000-000000000002' and type in ('devis_signe', 'rdv_modifie', 'dossier_valide')),
  array['devis_signe', 'rdv_modifie'], 'chef : devis et rendez-vous, pas le dossier');
select is((select array_agg(type::text) from public.notifications
  where user_id = 'c1310000-0000-4000-8000-000000000003' and type in ('devis_signe', 'rdv_modifie', 'dossier_valide')),
  array['rdv_modifie'], 'ouvrier : seulement le changement de rendez-vous de son chantier');
select is((select count(*)::int from public.notifications
  where user_id = 'c1310000-0000-4000-8000-000000000001' and type in ('devis_signe', 'rdv_modifie', 'dossier_valide')),
  3, 'patron : tout, comme avant');

select * from finish();
rollback;
