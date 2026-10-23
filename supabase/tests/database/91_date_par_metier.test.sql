-- Date souhaitée par métier (ADR 0169) : date propre à un lot choisie sur le chantier, reprise à la
-- création du lot, appliquée aussitôt à un lot pas encore envoyé, retour à la date du chantier,
-- lot envoyé inchangé, date devenue passée ignorée, contrôles d'accès. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e9100000-0000-4000-8000-000000000001', 'date91.client@example.test', false, now(), '{"role":"particulier"}', '{}'),
  ('e9100000-0000-4000-8000-000000000002', 'date91.autre@example.test', false, now(), '{"role":"particulier"}', '{}'),
  ('e9100000-0000-4000-8000-000000000003', 'date91.carreleur@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode) values
  ('e9110000-0000-4000-8000-000000000003', 'e9100000-0000-4000-8000-000000000003', 'valide', 'CARRELAGE 91', 'communes');
insert into public.projects (id, user_id, description, summary, trade_code, ville_code_insee, ville_nom, ville_location,
  room_codes, budget, date_mode) values
  ('e9120000-0000-4000-8000-000000000001', 'e9100000-0000-4000-8000-000000000001',
   'Refaire entièrement la salle de bains', 'Rénovation de salle de bains', 'plombier', '06088', 'Nice',
   extensions.st_setsrid(extensions.st_makepoint(7.26, 43.70), 4326)::extensions.geography,
   '{salle-de-bain}', '5000_15000', 'des_que_possible');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;
create function pg_temp.lot(p_trade text) returns uuid language sql as $$
  select id from public.projects where parent_project_id = 'e9120000-0000-4000-8000-000000000001' and trade_code = p_trade
$$;
create function pg_temp.jour(p_days int) returns date language sql as $$
  select (now() at time zone 'Europe/Paris')::date + p_days
$$;

-- ---------- Avant le lancement : date choisie sur le chantier ----------
select pg_temp.connecter('e9100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select public.set_project_lot_trades('e9120000-0000-4000-8000-000000000001', array['carreleur', 'peintre']);
select lives_ok(format('select public.set_lot_start(%L, ''carreleur'', ''date'', %L)',
  'e9120000-0000-4000-8000-000000000001', pg_temp.jour(30)), 'le particulier fixe la date du carrelage');
select is(
  (select lot_dates -> 'carreleur' from public.projects where id = 'e9120000-0000-4000-8000-000000000001'),
  jsonb_build_object('date_mode', 'date', 'date_souhaitee', pg_temp.jour(30)),
  'date du lot enregistrée sur le chantier');
select throws_ok(format('select public.set_lot_start(%L, ''carreleur'', ''date'', %L)',
  'e9120000-0000-4000-8000-000000000001', pg_temp.jour(-1)),
  '22023', 'La date de début ne peut pas être passée', 'pas de date passée');
select throws_ok($$ select public.set_lot_start('e9120000-0000-4000-8000-000000000001', 'carreleur', 'date', null) $$,
  '22023', 'La date de début ne peut pas être passée', 'une date est exigée');
select throws_ok($$ select public.set_lot_start('e9120000-0000-4000-8000-000000000001', 'electricien', 'des_que_possible', null) $$,
  '22023', 'Ce métier ne fait pas partie du chantier', 'métier du chantier seulement');
select pg_temp.connecter('e9100000-0000-4000-8000-000000000002', 'particulier');
select throws_ok($$ select public.set_lot_start('e9120000-0000-4000-8000-000000000001', 'carreleur', 'des_que_possible', null) $$,
  '42501', null, 'chantier d''un autre particulier');
reset role;

-- ---------- Lancement : chaque lot prend sa date ----------
select pg_temp.connecter('e9100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select public.validate_project_criteria('e9120000-0000-4000-8000-000000000001');
select results_eq(
  $$ select trade_code, date_mode::text, date_souhaitee
     from public.projects where parent_project_id = 'e9120000-0000-4000-8000-000000000001' order by trade_code $$,
  format($$ values ('carreleur', 'date', %L::date), ('peintre', 'des_que_possible', null::date) $$, pg_temp.jour(30)),
  'lot carrelage à sa date, peinture à celle du chantier');
select throws_ok(format('select public.set_lot_start(%L, ''peintre'', ''inconnue'', null)', pg_temp.lot('carreleur')),
  '42501', null, 'la date se choisit sur le chantier, pas sur un lot');

-- Lot pas encore envoyé : modifié aussitôt.
select public.set_lot_start('e9120000-0000-4000-8000-000000000001', 'peintre', 'inconnue', null);
select is((select date_mode::text from public.projects where id = pg_temp.lot('peintre')), 'inconnue',
  'lot pas encore envoyé : date appliquée aussitôt');
-- Retour à la date du chantier.
select public.set_lot_start('e9120000-0000-4000-8000-000000000001', 'carreleur', null, null);
select ok(not ((select lot_dates from public.projects where id = 'e9120000-0000-4000-8000-000000000001') ? 'carreleur'),
  'date propre retirée');
select results_eq(
  format($$ select date_mode::text, date_souhaitee from public.projects where id = %L $$, pg_temp.lot('carreleur')),
  $$ values ('des_que_possible', null::date) $$, 'le lot reprend la date du chantier');
reset role;

-- ---------- Lot envoyé : sa date ne change plus ----------
insert into public.requests (project_id, artisan_id, particulier_id, contact_phone) values
  (pg_temp.lot('carreleur'), 'e9110000-0000-4000-8000-000000000003',
   'e9100000-0000-4000-8000-000000000001', '+33612345678');
select pg_temp.connecter('e9100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select public.set_lot_start('e9120000-0000-4000-8000-000000000001', 'carreleur', 'date', pg_temp.jour(60));
select is((select date_mode::text from public.projects where id = pg_temp.lot('carreleur')), 'des_que_possible',
  'lot déjà envoyé : date inchangée');
reset role;

-- ---------- Date propre devenue passée : celle du chantier au relancement ----------
update public.projects
set lot_dates = jsonb_build_object('peintre', jsonb_build_object('date_mode', 'date', 'date_souhaitee', '2020-01-01'))
where id = 'e9120000-0000-4000-8000-000000000001';
select pg_temp.connecter('e9100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select public.validate_project_criteria('e9120000-0000-4000-8000-000000000001');
reset role;
select results_eq(
  format($$ select date_mode::text, date_souhaitee from public.projects where id = %L $$, pg_temp.lot('peintre')),
  $$ values ('des_que_possible', null::date) $$, 'date passée ignorée : celle du chantier');

select * from finish();
rollback;
