-- Engagement de l'artisan (ADR 0117) : certifié avec la charte, d'une seule signature (date, heure,
-- adresse IP, version) ; refusé sans l'engagement en vigueur ; une signature antérieure, sans
-- engagement, laisse l'étape « charte » à faire, et l'artisan peut signer de nouveau.
-- Adresses de documentation uniquement (RFC 5737).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('c6100000-0000-4000-8000-000000000001', 'eng61.nouveau@example.test', '{}', '{"account_type":"artisan"}'),
  ('c6100000-0000-4000-8000-000000000002', 'eng61.ancien@example.test', '{}', '{"account_type":"artisan"}');

create function pg_temp.connecter(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1',
    'app_metadata', jsonb_build_object('role', 'artisan_en_attente')
  )::text, true);
$$;
create function pg_temp.artisan(uid uuid) returns uuid language sql as $$
  select id from public.artisans where user_id = uid
$$;

select is(app.current_engagement_version(), 'B1', 'version en vigueur : brouillon B1');

-- ---------- Signature sans l'engagement en vigueur : refusée ----------
select pg_temp.connecter('c6100000-0000-4000-8000-000000000001');
select set_config('request.headers', '{"x-forwarded-for":"203.0.113.61"}', true);
set local role authenticated;
select throws_ok(
  $$ select public.accept_artisan_charter('V5', 25, 'Alex Exemple', 'EXEMPLE', '00000001800010',
       'M 10 10 L 200 80') $$,
  '22023', 'L''engagement de l''artisan en vigueur doit être certifié.', 'sans engagement : refus');
select throws_ok(
  $$ select public.accept_artisan_charter('V5', 25, 'Alex Exemple', 'EXEMPLE', '00000001800010',
       'M 10 10 L 200 80', p_engagement_version => 'B0') $$,
  '22023', 'L''engagement de l''artisan en vigueur doit être certifié.', 'engagement périmé : refus');
reset role;
select ok('charte' = any (app.onboarding_missing_steps(pg_temp.artisan('c6100000-0000-4000-8000-000000000001'))),
  'rien de signé : étape « charte » à faire');

-- ---------- Charte et engagement d'une seule signature ----------
set local role authenticated;
select lives_ok(
  $$ select public.accept_artisan_charter('V5', 25, 'Alex Exemple', 'EXEMPLE', '00000001800010',
       'M 10 10 L 200 80', p_engagement_version => 'B1') $$,
  'charte et engagement signés');
select is(
  public.accept_artisan_charter('V5', 25, 'Alex Exemple', 'EXEMPLE', '00000001800010',
    'M 10 10 L 20 20', p_engagement_version => 'B1'),
  (select accepted_at from public.artisan_charter_acceptances),
  'seconde signature : sans effet, même horodatage');
reset role;
select results_eq(
  $$ select version, engagement_version, host(signer_ip), (count(*) over ())::int
     from public.artisan_charter_acceptances
     where artisan_id = pg_temp.artisan('c6100000-0000-4000-8000-000000000001') $$,
  $$ values ('V5'::text, 'B1'::text, '203.0.113.61'::text, 1) $$,
  'version de la charte, version de l''engagement et adresse IP enregistrées');
select ok(not ('charte' = any (app.onboarding_missing_steps(pg_temp.artisan('c6100000-0000-4000-8000-000000000001')))),
  'étape « charte » terminée');

-- ---------- Signature antérieure, sans engagement ----------
insert into public.artisan_charter_acceptances (artisan_id, version, rules_count, signer_name, company, siret, signature_path)
values (pg_temp.artisan('c6100000-0000-4000-8000-000000000002'), 'V5', 25, 'Sam Exemple', 'EXEMPLE',
        '00000057000010', 'M 10 10 L 200 80');
select ok('charte' = any (app.onboarding_missing_steps(pg_temp.artisan('c6100000-0000-4000-8000-000000000002'))),
  'charte signée sans engagement : étape « charte » à refaire');
select pg_temp.connecter('c6100000-0000-4000-8000-000000000002');
set local role authenticated;
select lives_ok(
  $$ select public.accept_artisan_charter('V5', 25, 'Sam Exemple', 'EXEMPLE', '00000057000010',
       'M 10 10 L 200 80', p_engagement_version => 'B1') $$,
  'nouvelle signature avec l''engagement');
reset role;
select is(
  (select count(*)::int from public.artisan_charter_acceptances
   where artisan_id = pg_temp.artisan('c6100000-0000-4000-8000-000000000002')),
  2, 'les deux signatures sont conservées');
select ok(not ('charte' = any (app.onboarding_missing_steps(pg_temp.artisan('c6100000-0000-4000-8000-000000000002')))),
  'étape « charte » terminée après la nouvelle signature');

select * from finish();
rollback;
