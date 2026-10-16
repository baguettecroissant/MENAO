-- Connexion avec Google ou Apple pour les clients (ADR 0108) : compte particulier marqué « à
-- finaliser », nom repris du fournisseur, finalisation unique avec l'acceptation des CGU et de la
-- politique de confidentialité, comptes e-mail et artisans inchangés.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c5500000-0000-4000-8000-000000000001', 'google.nom@example.test', false, now(),
   '{"provider":"google","providers":["google"]}', '{"full_name":"Camille Exemple","email_verified":true}'),
  ('c5500000-0000-4000-8000-000000000002', 'google.prenom@example.test', false, now(),
   '{"provider":"google","providers":["google"]}', '{"given_name":"Alex","family_name":"Martin","full_name":"Alex Martin"}'),
  ('c5500000-0000-4000-8000-000000000003', 'apple.masque@example.test', false, now(),
   '{"provider":"apple","providers":["apple"]}', '{}'),
  ('c5500000-0000-4000-8000-000000000004', 'email@example.test', false, now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Sam","last_name":"Exemple","legal":{"cgu":"v1","confidentialite":"v1"}}'),
  ('c5500000-0000-4000-8000-000000000005', 'artisan@example.test', false, now(),
   '{"provider":"email","providers":["email"]}', '{"account_type":"artisan","first_name":"Lou"}');

create function pg_temp.connecter(uid uuid, anonyme boolean default false) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'is_anonymous', anonyme,
    'app_metadata', jsonb_build_object('role', 'particulier')
  )::text, true);
$$;

-- ---------- Création des comptes ----------
select results_eq(
  $$ select raw_app_meta_data ->> 'role', coalesce(raw_app_meta_data ->> 'signup_pending', 'non')
     from auth.users where id::text like 'c5500000%' order by id $$,
  $$ values ('particulier'::text, 'true'::text), ('particulier', 'true'), ('particulier', 'true'),
            ('particulier', 'non'), ('artisan_en_attente', 'non') $$,
  'Google et Apple : particulier à finaliser ; e-mail et artisan inchangés');
select results_eq(
  $$ select first_name, last_name from public.profiles where user_id::text like 'c5500000%' order by user_id $$,
  $$ values ('Camille'::text, 'Exemple'::text), ('Alex', 'Martin'), (null, null), ('Sam', 'Exemple'), ('Lou', null) $$,
  'nom repris du fournisseur (nom complet ou prénom et nom), rien si Apple ne le donne pas');
select is((select count(*)::int from public.legal_acceptances where user_id = 'c5500000-0000-4000-8000-000000000001'), 0,
  'compte Google : aucune acceptation tant qu''il n''est pas finalisé');

-- ---------- Finaliser mon compte ----------
select pg_temp.connecter('c5500000-0000-4000-8000-000000000001');
set local role authenticated;
select throws_ok(
  $$ select public.complete_oauth_signup('Camille', 'Exemple', null, false, '{"cgu":"v1"}') $$,
  '22023', 'Acceptez les conditions d''utilisation et la politique de confidentialité.',
  'politique de confidentialité non acceptée : refus');
select throws_ok(
  $$ select public.complete_oauth_signup('Camille', 'Exemple', '0612', false, '{"cgu":"v1","confidentialite":"v1"}') $$,
  '22023', 'Numéro de téléphone invalide.', 'téléphone invalide : refus');
select throws_ok(
  $$ select public.complete_oauth_signup(' ', 'Exemple', null, false, '{"cgu":"v1","confidentialite":"v1"}') $$,
  '22023', 'Indiquez votre prénom et votre nom.', 'prénom manquant : refus');
select lives_ok(
  $$ select public.complete_oauth_signup(' Camille ', 'Exemple', '+33612345678', true,
     '{"cgu":"v1","confidentialite":"v1","cgv_artisan":"v1"}') $$,
  'compte finalisé');
select throws_ok(
  $$ select public.complete_oauth_signup('Camille', 'Exemple', null, false, '{"cgu":"v1","confidentialite":"v1"}') $$,
  '22023', 'Votre compte est déjà finalisé.', 'une seule fois');
reset role;
select results_eq(
  $$ select first_name, last_name, phone, marketing_opt_in from public.profiles
     where user_id = 'c5500000-0000-4000-8000-000000000001' $$,
  $$ values ('Camille'::text, 'Exemple'::text, '+33612345678'::text, true) $$,
  'profil complété');
select results_eq(
  $$ select document::text, version from public.legal_acceptances
     where user_id = 'c5500000-0000-4000-8000-000000000001' order by document $$,
  $$ values ('cgu'::text, 'v1'::text), ('confidentialite', 'v1') $$,
  'CGU et confidentialité acceptées, jamais les CGV artisans');
select ok((select not (raw_app_meta_data ? 'signup_pending') and raw_app_meta_data ->> 'role' = 'particulier'
  from auth.users where id = 'c5500000-0000-4000-8000-000000000001'), 'marqueur retiré, rôle inchangé');

-- ---------- Comptes non concernés ----------
select pg_temp.connecter('c5500000-0000-4000-8000-000000000004');
set local role authenticated;
select throws_ok(
  $$ select public.complete_oauth_signup('Sam', 'Exemple', null, false, '{"cgu":"v1","confidentialite":"v1"}') $$,
  '22023', 'Votre compte est déjà finalisé.', 'compte e-mail : rien à finaliser');
reset role;
select pg_temp.connecter('c5500000-0000-4000-8000-000000000003', true);
set local role authenticated;
select throws_ok(
  $$ select public.complete_oauth_signup('Dom', 'Exemple', null, false, '{"cgu":"v1","confidentialite":"v1"}') $$,
  '42501', null, 'session anonyme : refus');
reset role;
set local role anon;
select throws_ok(
  $$ select public.complete_oauth_signup('Dom', 'Exemple', null, false, '{"cgu":"v1","confidentialite":"v1"}') $$,
  '42501', null, 'visiteur : refus');
reset role;
select ok((select raw_app_meta_data -> 'signup_pending' = 'true'::jsonb from auth.users
  where id = 'c5500000-0000-4000-8000-000000000003'), 'compte Apple toujours à finaliser');

select * from finish();
rollback;
