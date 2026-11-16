-- Formule choisie avant la validation (F-163, lot 62, ADR 0353) : le titulaire choisit et change
-- sa formule sans abonnement ; refus pour une formule inconnue ou fermée, pour un dossier refusé
-- et pour un visiteur. Données fictives (identifiants e167…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1670000-0000-4000-8000-000000000001', 'formule167.brouillon@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1670000-0000-4000-8000-000000000002', 'formule167.refuse@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, assujetti_tva) values
  ('e1671000-0000-4000-8000-000000000001', 'e1670000-0000-4000-8000-000000000001', 'brouillon', 'FORMULE 167', 'communes', true),
  ('e1671000-0000-4000-8000-000000000002', 'e1670000-0000-4000-8000-000000000002', 'refuse', 'REFUS 167', 'communes', true);
insert into public.plans (code, nom, prix_mensuel_ht_centimes, stripe_lookup_key, stripe_lookup_key_annuel, ouverte, ordre) values
  ('fermeetest', 'Fermée 167', 10000, 'menao_fermee_167', 'menao_fermee_167_annuel', false, 99);

create function pg_temp.connecter(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1',
    'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
$$;

set local role authenticated;
select pg_temp.connecter('e1670000-0000-4000-8000-000000000001');

select lives_ok($$ select public.artisan_choose_plan('premium') $$, 'choix en brouillon, sans abonnement');
select is((select plan_choisi from public.artisans where id = 'e1671000-0000-4000-8000-000000000001'),
  'premium', 'choix gardé');
select lives_ok($$ select public.artisan_choose_plan('entreprise') $$, 'changement de formule');
select is((select plan_choisi from public.artisans where id = 'e1671000-0000-4000-8000-000000000001'),
  'entreprise', 'nouveau choix gardé');
select is((select count(*)::int from public.subscriptions where artisan_id = 'e1671000-0000-4000-8000-000000000001'),
  0, 'aucun abonnement créé');
select throws_ok($$ select public.artisan_choose_plan('inconnue') $$, '22023', 'plan_unavailable', 'formule inconnue refusée');
select throws_ok($$ select public.artisan_choose_plan('fermeetest') $$, '22023', 'plan_unavailable', 'formule fermée refusée');

select pg_temp.connecter('e1670000-0000-4000-8000-000000000002');
select throws_ok($$ select public.artisan_choose_plan('premium') $$, '42501', 'forbidden', 'dossier refusé : pas de choix');

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$ select public.artisan_choose_plan('premium') $$, '42501', null, 'visiteur refusé');

reset role;
select * from finish();
rollback;
