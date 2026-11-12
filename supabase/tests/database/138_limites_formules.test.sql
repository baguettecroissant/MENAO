-- Limites des formules (F-139, ADR 0290) : métiers (2 en Base, retirer toujours possible),
-- demandes du mois comptées hors demandes directes, limites de Base sans formule, inscription
-- tronquée sans échec, suivi de l'équipe, ligne « Appels d'offres » du comparatif.
-- Données fictives (identifiants e138…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1380000-0000-4000-8000-000000000001', 'lim138.base@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1380000-0000-4000-8000-000000000002', 'lim138.premium@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1380000-0000-4000-8000-000000000003', 'lim138.ancien@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1380000-0000-4000-8000-000000000004', 'lim138.client@example.test', false, now(), '{"role":"particulier"}', '{}'),
  ('e1380000-0000-4000-8000-000000000005', 'lim138.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('e1380000-0000-4000-8000-000000000006', 'lim138.sans@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode) values
  ('e1381000-0000-4000-8000-000000000001', 'e1380000-0000-4000-8000-000000000001', 'valide', 'BASE 138', 'communes'),
  ('e1381000-0000-4000-8000-000000000002', 'e1380000-0000-4000-8000-000000000002', 'valide', 'PREMIUM 138', 'communes'),
  ('e1381000-0000-4000-8000-000000000003', 'e1380000-0000-4000-8000-000000000003', 'valide', 'ANCIEN 138', 'communes'),
  ('e1381000-0000-4000-8000-000000000006', 'e1380000-0000-4000-8000-000000000006', 'valide', 'SANS FORMULE 138', 'communes');
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('e1381000-0000-4000-8000-000000000001', 'base', 'cus_e138a', 'sub_e138a', 'active'),
  ('e1381000-0000-4000-8000-000000000002', 'premium', 'cus_e138b', 'sub_e138b', 'active'),
  ('e1381000-0000-4000-8000-000000000003', 'base', 'cus_e138c', 'sub_e138c', 'active');
-- Inscrit avant la limite : 3 métiers.
insert into public.artisan_trades (artisan_id, trade_code) values
  ('e1381000-0000-4000-8000-000000000003', 'plombier'),
  ('e1381000-0000-4000-8000-000000000003', 'chauffagiste'),
  ('e1381000-0000-4000-8000-000000000003', 'climaticien');

-- Demandes du mois pour l'artisan Base : deux par la recherche, une directe (fiche).
insert into public.projects (id, user_id, status, description, trade_code, ville_code_insee, ville_nom, criteria_validated_at, preferred_artisan_id) values
  ('e1382000-0000-4000-8000-000000000001', 'e1380000-0000-4000-8000-000000000004', 'criteres_valides', 'Fuite fictive 1', 'plombier', '06004', 'Antibes', now(), null),
  ('e1382000-0000-4000-8000-000000000002', 'e1380000-0000-4000-8000-000000000004', 'criteres_valides', 'Fuite fictive 2', 'plombier', '06004', 'Antibes', now(), null),
  ('e1382000-0000-4000-8000-000000000003', 'e1380000-0000-4000-8000-000000000004', 'criteres_valides', 'Fuite fictive 3', 'plombier', '06004', 'Antibes', now(), 'e1381000-0000-4000-8000-000000000001');
insert into public.requests (project_id, artisan_id, particulier_id, contact_phone, status)
select p, 'e1381000-0000-4000-8000-000000000001', 'e1380000-0000-4000-8000-000000000004', '+33600001380', 'envoyee'
from unnest(array['e1382000-0000-4000-8000-000000000001', 'e1382000-0000-4000-8000-000000000002',
  'e1382000-0000-4000-8000-000000000003']::uuid[]) as p;

create function pg_temp.connecter(uid uuid, app_role text default 'artisan', aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Inscription : les premiers métiers gardés, sans échec ----------
select lives_ok(
  $$ select app.apply_artisan_signup('e1381000-0000-4000-8000-000000000006',
       '{"trade_codes": ["peintre", "plaquiste", "carreleur"]}'::jsonb) $$,
  'inscription avec 3 métiers : pas d''échec');
select results_eq(
  $$ select trade_code from public.artisan_trades where artisan_id = 'e1381000-0000-4000-8000-000000000006' order by trade_code $$,
  $$ values ('peintre'::text), ('plaquiste') $$,
  'sans formule : les 2 premiers métiers choisis sont gardés');

set local role authenticated;

-- ---------- Base ----------
select pg_temp.connecter('e1380000-0000-4000-8000-000000000001');
select is(public.my_plan_usage(),
  '{"formule": "base", "demandes": {"recues": 2, "limite": 10}, "metiers": {"nombre": 0, "limite": 2}}'::jsonb,
  'Base : 2 demandes du mois (la directe ne compte pas), limites 10 et 2');
select throws_ok(
  $$ select public.set_artisan_trades(array['plombier', 'chauffagiste', 'climaticien'], '{}', 5) $$,
  '22023', 'Votre formule permet 2 métiers au plus.', 'Base : 3 métiers refusés');
select lives_ok(
  $$ select public.set_artisan_trades(array['plombier', 'chauffagiste'], '{}', 5) $$, 'Base : 2 métiers acceptés');

-- ---------- Inscrit avant la limite ----------
select pg_temp.connecter('e1380000-0000-4000-8000-000000000003');
select lives_ok(
  $$ select public.set_artisan_trades(array['plombier', 'chauffagiste', 'climaticien'], '{}', 5) $$,
  'déjà au-dessus : il garde ses 3 métiers');
select throws_ok(
  $$ select public.set_artisan_trades(array['plombier', 'chauffagiste', 'electricien'], '{}', 5) $$,
  '22023', 'Votre formule permet 2 métiers au plus.', 'déjà au-dessus : pas de nouveau métier');
select lives_ok(
  $$ select public.set_artisan_trades(array['plombier'], '{}', 5) $$, 'retirer reste toujours possible');

-- ---------- Premium ----------
select pg_temp.connecter('e1380000-0000-4000-8000-000000000002');
select lives_ok(
  $$ select public.set_artisan_trades(array['plombier', 'chauffagiste', 'climaticien', 'electricien'], '{}', 5) $$,
  'Premium : métiers illimités');
select is(public.my_plan_usage() -> 'demandes' ->> 'limite', '25', 'Premium : 25 demandes par mois');

-- ---------- Sans formule : limites de Base ----------
select pg_temp.connecter('e1380000-0000-4000-8000-000000000006');
select is(public.my_plan_usage() ->> 'formule', null, 'sans formule');
select is(public.my_plan_usage() -> 'metiers' ->> 'limite', '2', 'sans formule : limite de Base');

-- ---------- Équipe MENAO ----------
select throws_ok('select * from public.admin_plan_usage()', '42501', null, 'artisan : suivi refusé');
select pg_temp.connecter('e1380000-0000-4000-8000-000000000005', 'admin', 'aal2');
select results_eq(
  $$ select formule, limite, recues from public.admin_plan_usage()
     where artisan_id = 'e1381000-0000-4000-8000-000000000001' $$,
  $$ values ('base'::text, 10, 2) $$,
  'admin : demandes du mois face à la limite');

reset role;
select is(
  (select valeurs ->> 'entreprise' from public.plan_features where libelle like 'Appels d''offres%'),
  'true', 'comparatif : appels d''offres en Entreprise');
select is(
  (select valeurs ->> 'premium' from public.plan_features where libelle like 'Appels d''offres%'),
  'false', 'comparatif : pas en Premium');

select * from finish();
rollback;
