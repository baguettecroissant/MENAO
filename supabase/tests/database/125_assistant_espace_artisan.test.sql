-- Assistant de l'espace artisan (F-86, ADR 0236) : résumé du compte de l'artisan connecté
-- (demandes, chantiers, devis, documents, formule), rien pour un autre compte ni un visiteur.
-- Données fictives (identifiants c125…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1250000-0000-4000-8000-000000000001', 'assistant125.paul@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c1250000-0000-4000-8000-000000000002', 'assistant125.client@example.test', false, now(), '{"role":"particulier"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, assujetti_tva) values
  ('c1251000-0000-4000-8000-000000000001', 'c1250000-0000-4000-8000-000000000001', 'valide', 'PAUL 125', 'communes', false);
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status, trial_end) values
  ('c1251000-0000-4000-8000-000000000001', 'base', 'cus_c125', 'sub_c125', 'trialing', now() + interval '20 days');
insert into public.projects (id, user_id, status, description, trade_code, ville_code_insee, ville_nom, criteria_validated_at) values
  ('c1252000-0000-4000-8000-000000000001', 'c1250000-0000-4000-8000-000000000002', 'criteres_valides', 'Fuite.', 'plombier', '06004', 'Antibes', now()),
  ('c1252000-0000-4000-8000-000000000002', 'c1250000-0000-4000-8000-000000000002', 'criteres_valides', 'Douche.', 'plombier', '06004', 'Antibes', now());
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone, status) values
  ('c1253000-0000-4000-8000-000000000001', 'c1252000-0000-4000-8000-000000000001', 'c1251000-0000-4000-8000-000000000001',
   'c1250000-0000-4000-8000-000000000002', '+33600001250', 'envoyee'),
  ('c1253000-0000-4000-8000-000000000002', 'c1252000-0000-4000-8000-000000000002', 'c1251000-0000-4000-8000-000000000001',
   'c1250000-0000-4000-8000-000000000002', '+33600001250', 'acceptee');
insert into public.chantiers (id, project_id, request_id, artisan_id, particulier_id, title) values
  ('c1254000-0000-4000-8000-000000000001', 'c1252000-0000-4000-8000-000000000002', 'c1253000-0000-4000-8000-000000000002',
   'c1251000-0000-4000-8000-000000000001', 'c1250000-0000-4000-8000-000000000002', 'Douche');
select set_config('menao.transition_chantier', 'on', true);
update public.chantiers set status = 'rdv_planifie' where id = 'c1254000-0000-4000-8000-000000000001';
select set_config('menao.transition_chantier', '', true);
insert into public.quotes (chantier_id, artisan_id) values
  ('c1254000-0000-4000-8000-000000000001', 'c1251000-0000-4000-8000-000000000001');

-- ---------- L'artisan connecté ----------
set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1250000-0000-4000-8000-000000000001',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select is(public.my_assistant_context() ->> 'dossier', 'valide', 'état du dossier');
select is((public.my_assistant_context() ->> 'franchise_tva')::boolean, true, 'franchise de TVA');
select is((public.my_assistant_context() ->> 'demandes_en_attente')::int, 1, 'demandes en attente de réponse');
select is((public.my_assistant_context() -> 'chantiers' ->> 'rdv_planifie')::int, 1, 'chantiers par étape');
select is((public.my_assistant_context() ->> 'devis_brouillons')::int, 1, 'devis à terminer');
select is(public.my_assistant_context() -> 'abonnement' ->> 'formule', 'base', 'formule');
select is(public.my_assistant_context() -> 'abonnement' ->> 'statut', 'trialing', 'essai en cours');
select ok(public.my_assistant_context()::text not like '%Antibes%' and public.my_assistant_context()::text not like '%+336%',
  'ni commune ni numéro de client');

-- ---------- Un particulier : rien ----------
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1250000-0000-4000-8000-000000000002',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'particulier'))::text, true);
select is(public.my_assistant_context(), null, 'particulier : aucun résumé');
reset role;

set local role anon;
select throws_ok($$ select public.my_assistant_context() $$, '42501', null, 'visiteur : refusé');
reset role;

select * from finish();
rollback;
