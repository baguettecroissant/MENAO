-- Demande guidée (ADR 0163) : budget approximatif enregistré avec les critères (facultatif, tranche
-- du référentiel), demande reformulée par l'IA montrée à l'artisan sans coordonnées, avec le
-- budget. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e8600000-0000-4000-8000-000000000001', 'lot86.client@example.test', false, now(), '{"role":"particulier"}', '{}'),
  ('e8600000-0000-4000-8000-000000000002', 'lot86.artisan@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode) values
  ('e8610000-0000-4000-8000-000000000002', 'e8600000-0000-4000-8000-000000000002', 'valide', 'PLOMB 86', 'communes');
insert into public.projects (id, user_id, description, trade_code, ville_code_insee, ville_nom, artisan_brief) values
  ('e8620000-0000-4000-8000-000000000001', 'e8600000-0000-4000-8000-000000000001',
   'Refaire la salle de bains, budget 8 000 euros', 'plombier', '06088', 'Nice',
   'Rénovation d''une salle de bains à Nice. Rappeler au 06 12 34 56 78 ou client@example.test.');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Budget avec les critères ----------
select pg_temp.connecter('e8600000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select lives_ok($$
  select public.save_project_criteria(
    p_project_id => 'e8620000-0000-4000-8000-000000000001', p_trade_code => 'plombier', p_lieu_type => 'appartement',
    p_room_codes => '{}', p_work_type_codes => '{}', p_surface => '10_20', p_ville_code_insee => '06088',
    p_ville_nom => 'Nice', p_code_postal => '06000', p_ville_lon => 7.26, p_ville_lat => 43.70,
    p_adresse => null, p_lon => null, p_lat => null, p_date_mode => 'inconnue', p_date_souhaitee => null,
    p_budget => '5000_15000')
$$, 'critères enregistrés avec un budget');
select is((select budget::text from public.projects where id = 'e8620000-0000-4000-8000-000000000001'),
  '5000_15000', 'budget enregistré');
select throws_ok($$
  select public.save_project_criteria(
    p_project_id => 'e8620000-0000-4000-8000-000000000001', p_trade_code => 'plombier', p_lieu_type => null,
    p_room_codes => '{}', p_work_type_codes => '{}', p_surface => null, p_ville_code_insee => '06088',
    p_ville_nom => 'Nice', p_code_postal => '06000', p_ville_lon => null, p_ville_lat => null,
    p_adresse => null, p_lon => null, p_lat => null, p_date_mode => 'inconnue', p_date_souhaitee => null,
    p_budget => 'beaucoup')
$$, '22P02', null, 'tranche hors référentiel refusée');
-- Sans budget (appel d'avant la demande guidée) : « je ne sais pas encore ».
select lives_ok($$
  select public.save_project_criteria(
    p_project_id => 'e8620000-0000-4000-8000-000000000001', p_trade_code => 'plombier', p_lieu_type => null,
    p_room_codes => '{}', p_work_type_codes => '{}', p_surface => null, p_ville_code_insee => '06088',
    p_ville_nom => 'Nice', p_code_postal => '06000', p_ville_lon => null, p_ville_lat => null,
    p_adresse => null, p_lon => null, p_lat => null, p_date_mode => 'inconnue', p_date_souhaitee => null)
$$, 'budget facultatif');
select is((select budget from public.projects where id = 'e8620000-0000-4000-8000-000000000001'),
  null::public.project_budget, 'sans budget : aucun');
reset role;

-- ---------- Ce que voit l'artisan ----------
update public.projects set budget = '5000_15000' where id = 'e8620000-0000-4000-8000-000000000001';
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone) values
  ('e8630000-0000-4000-8000-000000000001', 'e8620000-0000-4000-8000-000000000001',
   'e8610000-0000-4000-8000-000000000002', 'e8600000-0000-4000-8000-000000000001', '+33612345678');
select pg_temp.connecter('e8600000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select is(public.artisan_request_detail('e8630000-0000-4000-8000-000000000001') ->> 'budget', '5000_15000',
  'l''artisan voit le budget');
select is(public.artisan_request_detail('e8630000-0000-4000-8000-000000000001') ->> 'artisan_brief',
  'Rénovation d''une salle de bains à Nice. Rappeler au [téléphone] ou [e-mail].',
  'demande reformulée, sans coordonnées');
reset role;

select throws_ok(
  $$ update public.projects set artisan_brief = repeat('x', 801) where id = 'e8620000-0000-4000-8000-000000000001' $$,
  '23514', null, 'reformulation de 800 caractères au plus');

select * from finish();
rollback;
