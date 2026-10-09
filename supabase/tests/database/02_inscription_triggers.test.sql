-- Triggers sur auth.users : rôle par défaut, création du profil, acceptations légales,
-- nettoyage de user_metadata, synchronisation du rôle.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('11111111-1111-4111-8111-111111111111', 'inscription.a@example.test', '{"provider":"email"}',
   '{"first_name":"  Alice ","last_name":"Test","phone":"+33639980001","marketing_opt_in":true,
     "legal":{"cgu":"v1","confidentialite":"v1","inconnu":"v1"}}'),
  ('22222222-2222-4222-8222-222222222222', 'inscription.b@example.test', null,
   '{"phone":"pas-un-numero","marketing_opt_in":"oui","role":"admin"}'),
  ('33333333-3333-4333-8333-333333333333', 'inscription.admin@example.test', '{"role":"admin"}', '{}');

select is(
  (select raw_app_meta_data ->> 'role' from auth.users where id = '11111111-1111-4111-8111-111111111111'),
  'particulier',
  'rôle par défaut « particulier » ajouté dans app_metadata'
);

select is(
  (select raw_app_meta_data ->> 'provider' from auth.users where id = '11111111-1111-4111-8111-111111111111'),
  'email',
  'les autres clés de app_metadata sont conservées'
);

select is(
  (select role::text from public.profiles where user_id = '22222222-2222-4222-8222-222222222222'),
  'particulier',
  'un rôle glissé dans user_metadata est ignoré'
);

select is(
  (select role::text from public.profiles where user_id = '33333333-3333-4333-8333-333333333333'),
  'admin',
  'un rôle valide fixé côté serveur dans app_metadata est conservé'
);

select results_eq(
  $$ select first_name, last_name, phone, marketing_opt_in from public.profiles
     where user_id = '11111111-1111-4111-8111-111111111111' $$,
  $$ values ('Alice'::text, 'Test'::text, '+33639980001'::text, true) $$,
  'profil créé avec les données d''inscription nettoyées'
);

select results_eq(
  $$ select phone, marketing_opt_in from public.profiles
     where user_id = '22222222-2222-4222-8222-222222222222' $$,
  $$ values (null::text, false) $$,
  'téléphone invalide ignoré, consentement marketing non booléen = refus'
);

select results_eq(
  $$ select document::text, version from public.legal_acceptances
     where user_id = '11111111-1111-4111-8111-111111111111' order by document $$,
  $$ values ('cgu'::text, 'v1'::text), ('confidentialite', 'v1') $$,
  'acceptations CGU et confidentialité enregistrées, document inconnu ignoré'
);

select ok(
  not exists (
    select 1 from auth.users
    where id = '11111111-1111-4111-8111-111111111111'
      and raw_user_meta_data ?| array['phone', 'marketing_opt_in', 'legal']
  ),
  'téléphone, consentement et acceptations retirés de user_metadata'
);

select is(
  (select raw_user_meta_data ->> 'first_name' from auth.users where id = '11111111-1111-4111-8111-111111111111'),
  '  Alice ',
  'les autres clés de user_metadata sont conservées'
);

select throws_ok(
  $$ insert into auth.users (id, email, raw_app_meta_data)
     values ('44444444-4444-4444-8444-444444444444', 'inscription.root@example.test', '{"role":"root"}') $$,
  '22023',
  null,
  'un rôle inconnu dans app_metadata est refusé à la création'
);

update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"role":"artisan_en_attente"}'
where id = '22222222-2222-4222-8222-222222222222';

select is(
  (select role::text from public.profiles where user_id = '22222222-2222-4222-8222-222222222222'),
  'artisan_en_attente',
  'un changement de rôle dans app_metadata est recopié dans profiles'
);

select throws_ok(
  $$ update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"root"}'
     where id = '22222222-2222-4222-8222-222222222222' $$,
  '22023',
  null,
  'un rôle inconnu est refusé à la modification'
);

select throws_ok(
  $$ update auth.users set raw_app_meta_data = raw_app_meta_data - 'role'
     where id = '22222222-2222-4222-8222-222222222222' $$,
  '22023',
  null,
  'le rôle ne peut pas être retiré'
);

select * from finish();
rollback;
