-- Statut « Radié » (ADR 0114) : radiation par un admin avec double authentification, motif
-- obligatoire, définitive (plus aucun changement de statut), profil invisible, artisan prévenu.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c5900000-0000-4000-8000-000000000001', 'radie59.artisan@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c5900000-0000-4000-8000-000000000002', 'radie59.brouillon@example.test', false, now(), '{}', '{"account_type":"artisan"}'),
  ('c5900000-0000-4000-8000-000000000003', 'radie59.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('c5900000-0000-4000-8000-000000000004', 'radie59.support@example.test', false, now(), '{"role":"support"}', '{}');

insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, connect_charges_enabled, stripe_account_id, assujetti_tva)
values ('c5910000-0000-4000-8000-000000000001', 'c5900000-0000-4000-8000-000000000001', 'valide',
  '00000056200017', 'ARTISAN RADIE', '5710', '1 RUE DE LA PAIX', '06000', 'NICE', 'communes', true,
  'acct_radie_1', true);
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status, trial_end)
values ('c5910000-0000-4000-8000-000000000001', 'base', 'cus_radie_1', 'sub_radie_1', 'trialing', now() + interval '30 days');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

select ok(app.artisan_is_visible('c5910000-0000-4000-8000-000000000001'), 'artisan visible avant la radiation');

-- ---------- Réservé aux admins avec double authentification ----------
select pg_temp.connecter('c5900000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select throws_ok(
  $$ select public.admin_radiate_artisan('c5910000-0000-4000-8000-000000000001', 'Fraude') $$,
  '42501', null, 'un artisan ne se radie pas');
reset role;
select pg_temp.connecter('c5900000-0000-4000-8000-000000000004', 'support');
set local role authenticated;
select throws_ok(
  $$ select public.admin_radiate_artisan('c5910000-0000-4000-8000-000000000001', 'Fraude') $$,
  '42501', null, 'le support ne radie pas');
reset role;
select pg_temp.connecter('c5900000-0000-4000-8000-000000000003', 'admin', 'aal1');
set local role authenticated;
select throws_ok(
  $$ select public.admin_radiate_artisan('c5910000-0000-4000-8000-000000000001', 'Fraude') $$,
  '42501', null, 'admin sans double authentification : refusé');
reset role;

-- ---------- Radiation ----------
select pg_temp.connecter('c5900000-0000-4000-8000-000000000003', 'admin');
set local role authenticated;
select throws_ok(
  $$ select public.admin_radiate_artisan('c5910000-0000-4000-8000-000000000001', '  ') $$,
  '22023', 'Indiquez le motif de la radiation (1 000 caractères au plus).', 'motif obligatoire');
select lives_ok(
  $$ select public.admin_radiate_artisan('c5910000-0000-4000-8000-000000000001', 'Faux documents d''assurance') $$,
  'radiation d''un artisan validé');
select lives_ok(
  $$ select public.admin_radiate_artisan(
       (select id from public.artisans where user_id = 'c5900000-0000-4000-8000-000000000002'), 'Fraude au SIRET') $$,
  'radiation possible avant la validation du dossier');
select throws_ok(
  $$ select public.admin_radiate_artisan('c5910000-0000-4000-8000-000000000001', 'Encore') $$,
  '22023', 'Artisan introuvable ou déjà radié.', 'pas deux radiations');
select throws_ok(
  $$ select public.admin_reactivate_artisan('c5910000-0000-4000-8000-000000000001') $$,
  '22023', null, 'pas de réactivation après une radiation');
reset role;

select results_eq(
  $$ select status::text, radiation_reason, radiated_at is not null from public.artisans
     where id = 'c5910000-0000-4000-8000-000000000001' $$,
  $$ values ('radie'::text, 'Faux documents d''assurance'::text, true) $$,
  'statut, motif et date de la radiation');
select ok(not app.artisan_is_visible('c5910000-0000-4000-8000-000000000001'), 'profil invisible');
select is(
  (select data ->> 'motif' from public.notifications
   where user_id = 'c5900000-0000-4000-8000-000000000001' and type = 'compte_radie'),
  'Faux documents d''assurance', 'artisan prévenu, avec le motif');
select ok(
  exists (select 1 from public.audit_logs where action = 'artisan.radie'
          and target_id = 'c5910000-0000-4000-8000-000000000001'),
  'radiation tracée dans le journal');

-- ---------- Définitive ----------
select throws_ok(
  $$ update public.artisans set status = 'valide' where id = 'c5910000-0000-4000-8000-000000000001' $$,
  '42501', 'Un artisan radié ne change plus de statut.', 'aucun retour, même en base');
select lives_ok($$ select app.daily_compliance() $$, 'la tâche quotidienne passe sans toucher aux radiés');
select is((select status::text from public.artisans where id = 'c5910000-0000-4000-8000-000000000001'),
  'radie', 'toujours radié');

select * from finish();
rollback;
