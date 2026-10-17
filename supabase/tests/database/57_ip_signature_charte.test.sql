-- Adresse IP de la signature de la charte qualité (ADR 0111) : celle transmise par le site, sinon
-- celle de la requête (application) ; une valeur invalide n'empêche pas la signature.
-- Adresses de documentation uniquement (RFC 5737).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('c5700000-0000-4000-8000-000000000001', 'ip57.site@example.test', '{}', '{"account_type":"artisan"}'),
  ('c5700000-0000-4000-8000-000000000002', 'ip57.app@example.test', '{}', '{"account_type":"artisan"}'),
  ('c5700000-0000-4000-8000-000000000003', 'ip57.invalide@example.test', '{}', '{"account_type":"artisan"}');

create function pg_temp.connecter(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1',
    'app_metadata', jsonb_build_object('role', 'artisan_en_attente')
  )::text, true);
$$;

-- Site : adresse du visiteur transmise par le serveur, prioritaire sur celle de la requête.
select pg_temp.connecter('c5700000-0000-4000-8000-000000000001');
select set_config('request.headers', '{"x-forwarded-for":"198.51.100.20"}', true);
set local role authenticated;
select lives_ok(
  $$ select public.accept_artisan_charter('V5', 25, 'Alex Exemple', 'EXEMPLE', '00000056200017',
       'M 10 10 L 200 80', '203.0.113.7') $$,
  'signature depuis le site avec l''adresse du visiteur');
reset role;

-- Application : adresse de la requête (première de x-forwarded-for).
select pg_temp.connecter('c5700000-0000-4000-8000-000000000002');
select set_config('request.headers', '{"x-forwarded-for":"203.0.113.8, 10.0.0.1"}', true);
set local role authenticated;
select lives_ok(
  $$ select public.accept_artisan_charter('V5', 25, 'Sam Exemple', 'EXEMPLE', '00000057000010',
       'M 10 10 L 200 80') $$,
  'signature depuis l''application, sans adresse transmise');
reset role;

-- Adresse transmise invalide, aucune en-tête : signature enregistrée sans adresse.
select pg_temp.connecter('c5700000-0000-4000-8000-000000000003');
select set_config('request.headers', '{}', true);
set local role authenticated;
select lives_ok(
  $$ select public.accept_artisan_charter('V5', 25, 'Lou Exemple', 'EXEMPLE', '00000058800012',
       'M 10 10 L 200 80', 'pas-une-adresse') $$,
  'adresse invalide ignorée');
reset role;

select results_eq(
  $$ select u.email::text, host(c.signer_ip)
     from public.artisan_charter_acceptances c
     join public.artisans a on a.id = c.artisan_id
     join auth.users u on u.id = a.user_id
     where u.email like 'ip57.%' order by u.email $$,
  $$ values ('ip57.app@example.test'::text, '203.0.113.8'::text),
            ('ip57.invalide@example.test', null),
            ('ip57.site@example.test', '203.0.113.7') $$,
  'adresse du visiteur, sinon celle de la requête, sinon rien');

select * from finish();
rollback;
