-- Chantier à plusieurs métiers (ADR 0167) : choix des lots par le particulier, création au
-- lancement de la recherche (copie du chantier, travaux proposés, photos partagées), suivi des
-- photos, lot retiré ou déjà envoyé, limite de 2 chantiers ouverts comptée par chantier, accès de
-- l'artisan d'un lot aux photos et aux autres métiers. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e9000000-0000-4000-8000-000000000001', 'lot90.client@example.test', false, now(), '{"role":"particulier"}', '{}'),
  ('e9000000-0000-4000-8000-000000000002', 'lot90.autre@example.test', false, now(), '{"role":"particulier"}', '{}'),
  ('e9000000-0000-4000-8000-000000000003', 'lot90.carreleur@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode) values
  ('e9010000-0000-4000-8000-000000000003', 'e9000000-0000-4000-8000-000000000003', 'valide', 'CARRELAGE 90', 'communes');
insert into public.projects (id, user_id, description, summary, trade_code, ville_code_insee, ville_nom, ville_location,
  room_codes, budget, suggested_lots) values
  ('e9020000-0000-4000-8000-000000000001', 'e9000000-0000-4000-8000-000000000001',
   'Refaire entièrement la salle de bains', 'Rénovation de salle de bains', 'plombier', '06088', 'Nice',
   extensions.st_setsrid(extensions.st_makepoint(7.26, 43.70), 4326)::extensions.geography,
   '{salle-de-bain}', '5000_15000',
   '[{"trade_code": "carreleur", "work_type_codes": ["faience", "recherche-fuite"]}, {"trade_code": "peintre", "work_type_codes": []}]');
insert into public.project_photos (project_id, storage_path, sort_order) values
  ('e9020000-0000-4000-8000-000000000001', 'e9020000-0000-4000-8000-000000000001/sdb.jpg', 0);

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;
create function pg_temp.lot(p_trade text) returns uuid language sql as $$
  select id from public.projects where parent_project_id = 'e9020000-0000-4000-8000-000000000001' and trade_code = p_trade
$$;

-- ---------- Choix des lots ----------
select pg_temp.connecter('e9000000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select lives_ok($$ select public.set_project_lot_trades('e9020000-0000-4000-8000-000000000001',
  array['carreleur', 'peintre', 'plombier', 'carreleur']) $$, 'le particulier choisit les autres métiers');
select is((select lot_trades from public.projects where id = 'e9020000-0000-4000-8000-000000000001'),
  array['carreleur', 'peintre'], 'sans le métier principal ni doublon');
select throws_ok($$ select public.set_project_lot_trades('e9020000-0000-4000-8000-000000000001',
  array['carreleur', 'peintre', 'electricien', 'plaquiste', 'menuisier']) $$,
  '22023', 'Quatre autres métiers au plus pour un même chantier', '4 lots au plus');
select throws_ok($$ select public.set_project_lot_trades('e9020000-0000-4000-8000-000000000001', array['astronaute']) $$,
  '22023', 'Métier inconnu', 'métier du référentiel');
select pg_temp.connecter('e9000000-0000-4000-8000-000000000002', 'particulier');
select throws_ok($$ select public.set_project_lot_trades('e9020000-0000-4000-8000-000000000001', array['carreleur']) $$,
  '42501', null, 'projet d''un autre particulier');
reset role;

-- ---------- Lancement : lots créés ----------
select pg_temp.connecter('e9000000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select lives_ok($$ select public.validate_project_criteria('e9020000-0000-4000-8000-000000000001') $$,
  'lancement de la recherche');
select results_eq(
  $$ select trade_code, status::text, description, ville_code_insee, budget::text, room_codes, work_type_codes
     from public.projects where parent_project_id = 'e9020000-0000-4000-8000-000000000001' order by trade_code $$,
  $$ values
       ('carreleur', 'criteres_valides', 'Refaire entièrement la salle de bains', '06088', '5000_15000', '{salle-de-bain}'::text[], '{faience}'::text[]),
       ('peintre', 'criteres_valides', 'Refaire entièrement la salle de bains', '06088', '5000_15000', '{salle-de-bain}'::text[], '{}'::text[]) $$,
  'un lot par métier, copie du chantier, travaux proposés de son métier seulement');
select is((select count(*)::int from public.project_photos where project_id = pg_temp.lot('carreleur')), 1,
  'photos du chantier partagées');
select throws_ok(
  format('select public.set_project_lot_trades(%L, array[''peintre''])', pg_temp.lot('carreleur')),
  '42501', null, 'un lot n''a pas ses propres lots');
reset role;

-- Photo ajoutée puis retirée au chantier : les lots suivent.
insert into public.project_photos (project_id, storage_path, sort_order) values
  ('e9020000-0000-4000-8000-000000000001', 'e9020000-0000-4000-8000-000000000001/carrelage.jpg', 1);
select is((select count(*)::int from public.project_photos where project_id = pg_temp.lot('peintre')), 2, 'photo ajoutée aux lots');
delete from public.project_photos where project_id = 'e9020000-0000-4000-8000-000000000001' and storage_path like '%/carrelage.jpg';
select is((select count(*)::int from public.project_photos where project_id = pg_temp.lot('peintre')), 1, 'photo retirée des lots');

-- ---------- Demande sur le lot carrelage ----------
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone) values
  ('e9030000-0000-4000-8000-000000000001', pg_temp.lot('carreleur'), 'e9010000-0000-4000-8000-000000000003',
   'e9000000-0000-4000-8000-000000000001', '+33612345678');

select pg_temp.connecter('e9000000-0000-4000-8000-000000000003', 'artisan');
set local role authenticated;
select is(
  (public.artisan_request_detail('e9030000-0000-4000-8000-000000000001') -> 'autres_metiers'),
  '["Plombier", "Peintre"]'::jsonb, 'l''artisan du lot voit les autres métiers du chantier');
select ok(app.artisan_received_project_folder('e9020000-0000-4000-8000-000000000001/sdb.jpg'),
  'l''artisan du lot lit les photos du chantier');
reset role;

-- Lot retiré : supprimé tant qu'aucune demande n'est partie ; un lot envoyé reste.
select pg_temp.connecter('e9000000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select public.set_project_lot_trades('e9020000-0000-4000-8000-000000000001', '{}');
select public.validate_project_criteria('e9020000-0000-4000-8000-000000000001');
reset role;
select is(pg_temp.lot('peintre'), null, 'lot retiré sans demande : supprimé');
select isnt(pg_temp.lot('carreleur'), null, 'lot déjà envoyé : gardé');

-- ---------- Limite de 2 chantiers ouverts ----------
insert into public.requests (project_id, artisan_id, particulier_id, contact_phone) values
  ('e9020000-0000-4000-8000-000000000001', 'e9010000-0000-4000-8000-000000000003',
   'e9000000-0000-4000-8000-000000000001', '+33612345678');
insert into public.projects (id, user_id, description, trade_code, ville_code_insee, ville_nom) values
  ('e9020000-0000-4000-8000-000000000002', 'e9000000-0000-4000-8000-000000000001', 'Peinture du salon', 'peintre', '06088', 'Nice');
select is(app.particulier_open_projects('e9000000-0000-4000-8000-000000000001', 'e9020000-0000-4000-8000-000000000002'), 1,
  'le chantier et son lot envoyés comptent pour un seul chantier ouvert');
select is(app.particulier_open_projects('e9000000-0000-4000-8000-000000000001', pg_temp.lot('carreleur')), 0,
  'un autre lot du même chantier ne compte pas son propre chantier');

-- ---------- Session anonyme rattachée au compte : tout le chantier suit ----------
insert into auth.users (id, email, is_anonymous, raw_app_meta_data, raw_user_meta_data) values
  ('e9000000-0000-4000-8000-000000000009', null, true, '{}', '{}');
insert into public.projects (id, user_id, description, trade_code, ville_code_insee, ville_nom) values
  ('e9020000-0000-4000-8000-000000000009', 'e9000000-0000-4000-8000-000000000009', 'Salle de bains', 'plombier', '06088', 'Nice');
insert into public.projects (id, user_id, parent_project_id, description, trade_code, ville_code_insee, ville_nom) values
  ('e9020000-0000-4000-8000-000000000019', 'e9000000-0000-4000-8000-000000000009',
   'e9020000-0000-4000-8000-000000000009', 'Salle de bains', 'carreleur', '06088', 'Nice');
insert into public.project_transfers (project_id, from_user_id, token_hash) values
  ('e9020000-0000-4000-8000-000000000019', 'e9000000-0000-4000-8000-000000000009',
   encode(extensions.digest('jeton-lot90', 'sha256'), 'hex'));
select pg_temp.connecter('e9000000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select is(public.claim_project('jeton-lot90'), 'e9020000-0000-4000-8000-000000000019'::uuid,
  'lien de transfert ouvert depuis un lot');
reset role;
select is(
  (select count(*)::int from public.projects
   where user_id = 'e9000000-0000-4000-8000-000000000002'
     and id in ('e9020000-0000-4000-8000-000000000009', 'e9020000-0000-4000-8000-000000000019')),
  2, 'le chantier et son lot passent au compte');

select * from finish();
rollback;
