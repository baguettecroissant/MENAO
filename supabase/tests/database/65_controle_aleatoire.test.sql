-- Contrôle aléatoire des dossiers (ADR 0121) : 5 % des artisans validés tirés chaque mois, en
-- priorité ceux non contrôlés depuis un an ; tirage idempotent ; résultat noté par un admin (note
-- obligatoire si non conforme) ; lecture par l'équipe seulement ; journal. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c6500000-0000-4000-8000-000000000001', 'ctrl65.artisan@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c6500000-0000-4000-8000-000000000002', 'ctrl65.admin@example.test', false, now(), '{"role":"admin"}', '{}');
insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, assujetti_tva)
values ('c6510000-0000-4000-8000-000000000001', 'c6500000-0000-4000-8000-000000000001', 'valide',
  '00000065000002', 'CONTROLE EXEMPLE', '5710', '1 RUE DE L''EXEMPLE', '06000', 'NICE', 'communes', true);

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Cible : 5 % arrondis au supérieur ----------
select is(app.spot_check_target(0), 0, 'aucun artisan validé : aucun contrôle');
select is(app.spot_check_target(1), 1, '1 artisan : 1 contrôle');
select is(app.spot_check_target(20), 1, '20 artisans : 1 contrôle');
select is(app.spot_check_target(21), 2, '21 artisans : 2 contrôles');

-- ---------- Priorité aux dossiers non contrôlés depuis un an ----------
insert into public.artisan_spot_checks (artisan_id, period, result)
select id, '2029-12-01', 'conforme' from public.artisans
where status = 'valide' and id <> 'c6510000-0000-4000-8000-000000000001';
select ok(app.draw_spot_checks('2030-01-01') >= 1, 'tirage d''un mois');
select ok(exists (select 1 from public.artisan_spot_checks
                  where period = '2030-01-01' and artisan_id = 'c6510000-0000-4000-8000-000000000001'),
  'le dossier jamais contrôlé est tiré en premier');
select is(
  (select count(*)::int from public.artisan_spot_checks where period = '2030-01-01'),
  app.spot_check_target((select count(*)::int from public.artisans where status = 'valide')),
  'nombre tiré : 5 % des artisans validés');
select is(app.draw_spot_checks('2030-01-01'), 0, 'second tirage du même mois : sans effet');
select ok(not exists (
    select 1 from public.artisan_spot_checks s join public.artisans a on a.id = s.artisan_id
    where s.period = '2030-01-01' and a.status <> 'valide'),
  'seuls des artisans validés sont tirés');
select is(
  (select count(*)::int from public.audit_logs where action = 'artisan.controle_tire' and data ->> 'periode' = '2030-01-01'),
  (select count(*)::int from public.artisan_spot_checks where period = '2030-01-01'),
  'chaque tirage est inscrit au journal');

-- ---------- Réservé aux admins ----------
select pg_temp.connecter('c6500000-0000-4000-8000-000000000001', 'artisan', 'aal1');
set local role authenticated;
select throws_ok($$ select public.admin_draw_spot_checks() $$, '42501', null, 'artisan : tirage impossible');
select is_empty($$ select 1 from public.artisan_spot_checks $$, 'artisan : aucun contrôle visible');
select throws_ok(
  $$ select public.admin_complete_spot_check(gen_random_uuid(), 'conforme') $$, '42501', null,
  'artisan : résultat impossible');
reset role;

-- ---------- Tirage du mois par un admin, puis résultat ----------
select pg_temp.connecter('c6500000-0000-4000-8000-000000000002', 'admin');
set local role authenticated;
select lives_ok($$ select public.admin_draw_spot_checks() $$, 'admin : tirage du mois en cours');
select isnt_empty($$ select 1 from public.artisan_spot_checks $$, 'admin : contrôles visibles');
select throws_ok(
  $$ select public.admin_complete_spot_check(
       (select id from public.artisan_spot_checks where period = '2030-01-01' limit 1), 'non_conforme', ' ') $$,
  '22023', 'Une note est obligatoire pour un contrôle non conforme.', 'non conforme sans note : impossible');
select throws_ok(
  $$ select public.admin_complete_spot_check(
       (select id from public.artisan_spot_checks where period = '2030-01-01' limit 1), 'peut-etre') $$,
  '22023', 'Résultat attendu : conforme ou non conforme.', 'résultat hors liste : impossible');
select lives_ok(
  $$ select public.admin_complete_spot_check(
       (select id from public.artisan_spot_checks
        where period = '2030-01-01' and artisan_id = 'c6510000-0000-4000-8000-000000000001'),
       'non_conforme', 'Attestation RC Pro résiliée selon l''assureur', true) $$,
  'non conforme avec note et appel à l''assureur');
reset role;

select results_eq(
  $$ select result, insurer_called, checked_by is not null from public.artisan_spot_checks
     where period = '2030-01-01' and artisan_id = 'c6510000-0000-4000-8000-000000000001' $$,
  $$ values ('non_conforme'::text, true, true) $$,
  'résultat, appel à l''assureur et auteur enregistrés');
select is(
  (select data ->> 'note' from public.audit_logs
   where action = 'artisan.controle_non_conforme' and target_id = 'c6510000-0000-4000-8000-000000000001'),
  'Attestation RC Pro résiliée selon l''assureur', 'résultat inscrit au journal');

select is((select count(*)::int from cron.job where jobname = 'menao-controle-aleatoire'), 1,
  'tirage planifié chaque mois');

select * from finish();
rollback;
