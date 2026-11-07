-- Rappels aux clients par SMS (F-88, ADR 0239) : copie SMS d'un rappel au client (Premium,
-- réglage, portable français, SMS du mois), jamais pour la copie de l'artisan ni en Base, numéro
-- lu à l'envoi, centre de notifications sans doublon, réglages réservés. Données fictives (c128…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1280000-0000-4000-8000-000000000001', 'sms128.paul@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c1280000-0000-4000-8000-000000000002', 'sms128.client@example.test', false, now(), '{"role":"particulier"}', '{}'),
  ('c1280000-0000-4000-8000-000000000003', 'sms128.base@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, nom_commercial, zone_mode) values
  ('c1281000-0000-4000-8000-000000000001', 'c1280000-0000-4000-8000-000000000001', 'valide', 'PAUL 128', 'Plomberie Paul', 'communes'),
  ('c1281000-0000-4000-8000-000000000003', 'c1280000-0000-4000-8000-000000000003', 'valide', 'BASE 128', null, 'communes');
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('c1281000-0000-4000-8000-000000000001', 'premium', 'cus_c128', 'sub_c128', 'active'),
  ('c1281000-0000-4000-8000-000000000003', 'base', 'cus_c128b', 'sub_c128b', 'active');

-- Chantiers : 1 et 2 chez Paul (portable, puis fixe), 3 chez l'artisan Base.
insert into public.projects (id, user_id, status, description, trade_code, ville_code_insee, ville_nom, criteria_validated_at)
select ('c1282000-0000-4000-8000-00000000000' || n)::uuid, 'c1280000-0000-4000-8000-000000000002', 'criteres_valides',
  'Projet ' || n, 'plombier', '06004', 'Antibes', now()
from generate_series(1, 3) n;
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone, status) values
  ('c1283000-0000-4000-8000-000000000001', 'c1282000-0000-4000-8000-000000000001', 'c1281000-0000-4000-8000-000000000001',
   'c1280000-0000-4000-8000-000000000002', '+33612345678', 'acceptee'),
  ('c1283000-0000-4000-8000-000000000002', 'c1282000-0000-4000-8000-000000000002', 'c1281000-0000-4000-8000-000000000001',
   'c1280000-0000-4000-8000-000000000002', '+33412345678', 'acceptee'),
  ('c1283000-0000-4000-8000-000000000003', 'c1282000-0000-4000-8000-000000000003', 'c1281000-0000-4000-8000-000000000003',
   'c1280000-0000-4000-8000-000000000002', '+33612345678', 'acceptee');
insert into public.chantiers (id, project_id, request_id, artisan_id, particulier_id, title)
select ('c1284000-0000-4000-8000-00000000000' || n)::uuid, ('c1282000-0000-4000-8000-00000000000' || n)::uuid,
  ('c1283000-0000-4000-8000-00000000000' || n)::uuid,
  case when n = 3 then 'c1281000-0000-4000-8000-000000000003'::uuid else 'c1281000-0000-4000-8000-000000000001'::uuid end,
  'c1280000-0000-4000-8000-000000000002', 'Chantier ' || n
from generate_series(1, 3) n;

-- ---------- Copie SMS ----------
select app.notify('c1280000-0000-4000-8000-000000000002', 'rdv_rappel', jsonb_build_object(
  'destinataire', 'particulier', 'chantier_id', 'c1284000-0000-4000-8000-000000000001', 'titre', 'Chantier 1',
  'rendez_vous', now() + interval '1 day'));
select is((select count(*)::int from public.notifications where channel = 'sms'), 1, 'rendez-vous : copie SMS au client');
select is((select data ->> 'entreprise' from public.notifications where channel = 'sms'), 'Plomberie Paul',
  'au nom de l''entreprise');
select ok((select data::text not like '%+336%' from public.notifications where channel = 'sms'),
  'numéro jamais stocké dans la notification');

-- Copie adressée à l'artisan : pas de SMS.
select app.notify('c1280000-0000-4000-8000-000000000001', 'rdv_rappel', jsonb_build_object(
  'destinataire', 'artisan', 'chantier_id', 'c1284000-0000-4000-8000-000000000001', 'titre', 'Chantier 1'));
select is((select count(*)::int from public.notifications where channel = 'sms'), 1, 'copie de l''artisan : pas de SMS');

-- Demande d'avis : désactivée par défaut.
select app.notify('c1280000-0000-4000-8000-000000000002', 'avis_relance', jsonb_build_object(
  'chantier_id', 'c1284000-0000-4000-8000-000000000001', 'titre', 'Chantier 1'));
select is((select count(*)::int from public.notifications where channel = 'sms'), 1, 'avis : désactivé par défaut');

-- Fixe et formule Base : pas de SMS.
select app.notify('c1280000-0000-4000-8000-000000000002', 'rdv_rappel', jsonb_build_object(
  'destinataire', 'particulier', 'chantier_id', 'c1284000-0000-4000-8000-000000000002', 'titre', 'Chantier 2'));
select app.notify('c1280000-0000-4000-8000-000000000002', 'rdv_rappel', jsonb_build_object(
  'destinataire', 'particulier', 'chantier_id', 'c1284000-0000-4000-8000-000000000003', 'titre', 'Chantier 3'));
select is((select count(*)::int from public.notifications where channel = 'sms'), 1, 'fixe ou formule Base : pas de SMS');

-- ---------- Réglages de l'artisan ----------
set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1280000-0000-4000-8000-000000000001',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select is((public.my_client_reminders() ->> 'sms_inclus')::int, 100, 'Premium : 100 SMS par mois');
select is((public.my_client_reminders() ->> 'sms_utilises')::int, 1, 'SMS du mois');
select is((public.my_client_reminders() ->> 'rdv')::boolean, true, 'rendez-vous activé par défaut');
select lives_ok($$ select public.save_client_reminder_settings(true, true, false, true) $$, 'avis activé');
reset role;

select app.notify('c1280000-0000-4000-8000-000000000002', 'avis_relance', jsonb_build_object(
  'chantier_id', 'c1284000-0000-4000-8000-000000000001', 'titre', 'Chantier 1'));
select is((select count(*)::int from public.notifications where channel = 'sms'), 2, 'avis activé : SMS');

-- SMS du mois épuisés : l'e-mail part, pas le SMS.
update public.plans set limites = jsonb_set(limites, '{agents,sms_mois}', '2') where code = 'premium';
select app.notify('c1280000-0000-4000-8000-000000000002', 'rdv_rappel', jsonb_build_object(
  'destinataire', 'particulier', 'chantier_id', 'c1284000-0000-4000-8000-000000000001', 'titre', 'Chantier 1'));
select is((select count(*)::int from public.notifications where channel = 'sms'), 2, 'SMS du mois épuisés : plus de SMS');

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1280000-0000-4000-8000-000000000003',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select throws_ok($$ select public.save_client_reminder_settings(true, true, true, true) $$, '42501', null,
  'Base : réglages refusés');
select is((public.my_client_reminders() ->> 'inclus')::boolean, false, 'Base : rappels SMS non inclus');

-- Centre de notifications du client : aucun doublon.
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1280000-0000-4000-8000-000000000002',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'particulier'))::text, true);
select is((select count(*)::int from public.my_notifications()), 6, 'centre : les rappels sans les copies SMS');
select is(public.my_unread_notifications(), 6, 'non lues : sans les copies SMS');
reset role;

-- ---------- Envoi ----------
set local role service_role;
select is((select count(*)::int from public.claim_sms_notifications(10) where phone = '+33612345678'), 2,
  'envoi : numéro lu dans la demande du chantier');
reset role;
set local role authenticated;
select throws_ok($$ select * from public.claim_sms_notifications(10) $$, '42501', null, 'artisan : envoi réservé au serveur');
reset role;

select * from finish();
rollback;
