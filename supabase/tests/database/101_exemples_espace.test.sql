-- Exemples de l'espace artisan (ADR 0184) : l'artisan masque les exemples de son espace pour sa
-- fiche seulement ; un deuxième appel garde la première date ; rien pour un visiteur ni pour un
-- compte sans fiche. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('fe100000-0000-4000-8000-000000000001', 'exemples101.a@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('fe100000-0000-4000-8000-000000000002', 'exemples101.b@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('fe100000-0000-4000-8000-000000000003', 'exemples101.client@example.test', false, now(), '{}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode) values
  ('fe200000-0000-4000-8000-000000000001', 'fe100000-0000-4000-8000-000000000001', 'valide', 'EXEMPLES A', 'communes'),
  ('fe200000-0000-4000-8000-000000000002', 'fe100000-0000-4000-8000-000000000002', 'valide', 'EXEMPLES B', 'communes');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

select is((select examples_hidden_at from public.artisans where id = 'fe200000-0000-4000-8000-000000000001'),
  null, 'exemples affichés par défaut');

select pg_temp.connecter('fe100000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select lives_ok('select public.hide_space_examples()', 'l''artisan masque les exemples');
select ok((select examples_hidden_at is not null from public.artisans where id = 'fe200000-0000-4000-8000-000000000001'),
  'il lit son choix sur sa fiche');
reset role;
update public.artisans set examples_hidden_at = now() - interval '1 day'
where id = 'fe200000-0000-4000-8000-000000000001';
select pg_temp.connecter('fe100000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select lives_ok('select public.hide_space_examples()', 'second appel sans erreur');
reset role;
select ok((select examples_hidden_at < now() from public.artisans where id = 'fe200000-0000-4000-8000-000000000001'),
  'la première date est gardée');
select is((select examples_hidden_at from public.artisans where id = 'fe200000-0000-4000-8000-000000000002'),
  null, 'la fiche d''un autre artisan ne change pas');

-- Compte sans fiche artisan : rien ne change, sans erreur.
select pg_temp.connecter('fe100000-0000-4000-8000-000000000003', 'particulier');
set local role authenticated;
select lives_ok('select public.hide_space_examples()', 'compte sans fiche : sans effet');
reset role;
select is((select count(*)::int from public.artisans where examples_hidden_at is not null
  and id::text like 'fe2%'), 1, 'une seule fiche a masqué les exemples');

-- Visiteur : pas d'accès.
set local role anon;
select throws_ok('select public.hide_space_examples()', '42501', null, 'visiteur : refusé');
reset role;

select * from finish();
rollback;
