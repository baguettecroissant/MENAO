-- F-10 : aperçu de sa fiche publique par l'artisan (même non visible), fiche publique réservée
-- aux artisans visibles, droits de chaque rôle (CLAUDE.md).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('b6000000-0000-4000-8000-000000000001', 'apercu.client@example.test', false, now(), '{}', '{}'),
  ('b6100000-0000-4000-8000-000000000001', 'apercu.a1@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Lina"}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- A1 : validée, sans abonnement ni paiements actifs : pas encore visible.
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, presentation) values
  ('b6200000-0000-4000-8000-000000000001', 'b6100000-0000-4000-8000-000000000001', 'valide', 'LINA DECO',
   'communes', 'Peintre décoratrice à Nice depuis dix ans, enduits et papiers peints.');
insert into public.artisan_trades (artisan_id, trade_code) values ('b6200000-0000-4000-8000-000000000001', 'peintre');

-- ---------- Artisan : aperçu de sa fiche ----------
select pg_temp.connecter('b6100000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select results_eq(
  $$ select p ->> 'display_name', p ->> 'company_name', jsonb_array_length(p -> 'trades')
     from public.my_public_profile() p $$,
  $$ values ('Lina'::text, 'LINA DECO'::text, 1) $$,
  'artisan : aperçu de sa fiche, même non visible');
select ok(
  not (public.my_public_profile() ?| array['siret', 'phone', 'email', 'base_label', 'user_id']),
  'aperçu : ni SIRET, ni téléphone, ni e-mail, ni adresse, comme la fiche publique');
select is(public.artisan_public_profile('b6200000-0000-4000-8000-000000000001'), null,
  'fiche publique : rien tant que l''artisan n''est pas visible');
reset role;

-- ---------- Client et visiteur ----------
select pg_temp.connecter('b6000000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select is(public.my_public_profile(), null, 'client : pas de fiche artisan');
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select throws_ok($$ select public.my_public_profile() $$, '42501', null, 'visiteur : pas d''aperçu');
reset role;

select * from finish();
rollback;
