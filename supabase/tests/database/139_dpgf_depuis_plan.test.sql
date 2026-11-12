-- DPGF depuis les plans, lot 1 (F-140, ADR 0291) : formule Entreprise seulement, plans et métiers
-- vérifiés, relevé importé (pièces, éléments comptés, échelle), corrections de l'artisan
-- (« saisi »), isolement entre entreprises, suppression avec tous les fichiers.
-- Données fictives (identifiants e139…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1390000-0000-4000-8000-000000000001', 'plan139.entreprise@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1390000-0000-4000-8000-000000000002', 'plan139.premium@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1390000-0000-4000-8000-000000000003', 'plan139.autre@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, assujetti_tva) values
  ('e1391000-0000-4000-8000-000000000001', 'e1390000-0000-4000-8000-000000000001', 'valide', 'RENOVATION 139', 'communes', true),
  ('e1391000-0000-4000-8000-000000000002', 'e1390000-0000-4000-8000-000000000002', 'valide', 'PREMIUM 139', 'communes', true),
  ('e1391000-0000-4000-8000-000000000003', 'e1390000-0000-4000-8000-000000000003', 'valide', 'AUTRE 139', 'communes', true);
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('e1391000-0000-4000-8000-000000000001', 'entreprise', 'cus_e139a', 'sub_e139a', 'active'),
  ('e1391000-0000-4000-8000-000000000002', 'premium', 'cus_e139b', 'sub_e139b', 'active'),
  ('e1391000-0000-4000-8000-000000000003', 'entreprise', 'cus_e139c', 'sub_e139c', 'active');

create function pg_temp.connecter(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan')
  )::text, true);
$$;
create function pg_temp.plans() returns jsonb language sql as $$
  select '[{"path":"e1391000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c4d51.pdf","name":"Plans_APD.pdf"},
           {"path":"e1391000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c4d52.jpg","name":"Plan_WC.jpg"}]'::jsonb
$$;

select has_table('public', 'tender_rooms', 'table des pièces relevées');
select ok((select relrowsecurity from pg_class where oid = 'public.tender_rooms'::regclass), 'RLS activée sur tender_rooms');
select ok(not has_function_privilege('anon', 'public.artisan_create_plan_tender(text, jsonb, text[], text, date)', 'execute'),
  'création fermée aux visiteurs');
select is_empty($$ select 1 from pg_policies where tablename = 'tender_rooms' and cmd <> 'SELECT' $$,
  'aucune écriture directe dans les pièces');

set local role authenticated;

-- ---------- Formule ----------
select pg_temp.connecter('e1390000-0000-4000-8000-000000000002');
select throws_ok($$ select public.artisan_create_plan_tender('Maison fictive', '[]'::jsonb, array['peintre']) $$, '42501',
  'Les appels d''offres sont inclus dans la formule Entreprise.', 'Premium : création refusée');

-- ---------- Création ----------
select pg_temp.connecter('e1390000-0000-4000-8000-000000000001');
select throws_ok($$ select public.artisan_create_plan_tender('Maison', '[]'::jsonb, array['peintre']) $$, '22023',
  'Déposez de 1 à 10 plans.', 'sans plan : refusé');
select throws_ok(
  $$ select public.artisan_create_plan_tender('Maison', '[{"path":"e1391000-0000-4000-8000-000000000003/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c4d51.pdf"}]'::jsonb, array['peintre']) $$,
  '22023', 'Fichier invalide.', 'plan dans le dossier d''une autre entreprise : refusé');
select throws_ok(
  $$ select public.artisan_create_plan_tender('Maison', '[{"path":"e1391000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c4d51.exe"}]'::jsonb, array['peintre']) $$,
  '22023', 'Fichier invalide.', 'type de fichier inconnu : refusé');
select throws_ok($$ select public.artisan_create_plan_tender('Maison', pg_temp.plans(), array['metier-inconnu']) $$,
  '22023', 'Choisissez au moins un métier.', 'métier inconnu : refusé');
select lives_ok($$ select public.artisan_create_plan_tender('Maison individuelle — Mougins', pg_temp.plans(),
  array['carreleur', 'peintre', 'carreleur'], 'Atelier fictif', date '2026-11-28') $$, 'création depuis les plans');
select is(
  (select source_kind || ' ' || jsonb_array_length(plan_files) || ' ' || array_to_string(plan_trades, ',')
   from public.tenders where name like 'Maison individuelle%'),
  'plan 2 carreleur,peintre', 'deux plans, métiers sans doublon');
select is((select plan_files -> 1 ->> 'kind' from public.tenders where name like 'Maison individuelle%'), 'jpg',
  'type de chaque plan gardé');

-- ---------- Relevé importé ----------
select is(public.artisan_import_plan_reading(
  (select id from public.tenders where name like 'Maison individuelle%'),
  '[{"level":"RDC","name":"Séjour-cuisine","areaCm2":451400,"perimeterMm":27000,"heightMm":2500,"wet":false,"habitable":true,"source":"plan","file":1,"page":2,"uncertain":false},
    {"level":"RDC","name":"Dégagement","areaCm2":82200,"perimeterMm":16100,"heightMm":2500,"source":"cotes","file":1,"page":2},
    {"level":"R+1","name":"WC","areaCm2":16500,"perimeterMm":5200,"heightMm":2500,"wet":true,"source":"photo","file":2,"page":1,"uncertain":true}]'::jsonb,
  '{"portes": 9, "fenetres": 11, "wc": 2.5, "intrus": 4}'::jsonb, '1/50'), 3, 'relevé : 3 pièces');
select results_eq(
  $$ select name, area_cm2, source, file_index::integer, page::integer from public.tender_rooms order by position $$,
  $$ values ('Séjour-cuisine'::text, 451400, 'plan'::text, 1, 2), ('Dégagement', 82200, 'cotes', 1, 2), ('WC', 16500, 'photo', 2, 1) $$,
  'pièces enregistrées dans l''ordre, avec leur origine');
select is((select plan_counts from public.tenders where name like 'Maison individuelle%'),
  '{"wc": null, "eviers": null, "portes": 9, "douches": null, "lavabos": null, "fenetres": 11, "escaliers": null, "baignoires": null}'::jsonb,
  'éléments comptés remis en forme (entiers, clés connues)');
select is((select plan_scale from public.tenders where name like 'Maison individuelle%'), '1/50', 'échelle gardée');

-- ---------- Corrections de l'artisan ----------
select lives_ok($$ select public.artisan_save_plan_rooms(
  (select id from public.tenders where name like 'Maison individuelle%'),
  jsonb_build_array(
    (select jsonb_build_object('id', id, 'level', level, 'name', name, 'areaCm2', area_cm2, 'perimeterMm', perimeter_mm,
       'heightMm', height_mm, 'wet', wet, 'habitable', habitable) from public.tender_rooms where name = 'Séjour-cuisine'),
    (select jsonb_build_object('id', id, 'level', level, 'name', name, 'areaCm2', 18000, 'perimeterMm', perimeter_mm,
       'heightMm', height_mm, 'wet', wet, 'habitable', habitable) from public.tender_rooms where name = 'WC'),
    jsonb_build_object('level', 'R+1', 'name', 'Palier', 'areaCm2', 46000, 'perimeterMm', null, 'heightMm', 2500)
  ),
  '{"portes": 10}'::jsonb) $$, 'relevé corrigé');
select results_eq(
  $$ select name, area_cm2, source, uncertain, page::integer from public.tender_rooms order by position $$,
  $$ values ('Séjour-cuisine'::text, 451400, 'plan'::text, false, 2), ('WC', 18000, 'saisi', false, 1), ('Palier', 46000, 'saisi', false, null) $$,
  'pièce inchangée gardée, pièce corrigée et pièce ajoutée « saisi », pièce retirée supprimée');
select is((select plan_counts ->> 'portes' from public.tenders where name like 'Maison individuelle%'), '10', 'portes corrigées');
select throws_ok($$ select public.artisan_save_plan_rooms(
  (select id from public.tenders where name like 'Maison individuelle%'), '[{"name":"  "}]'::jsonb, '{}'::jsonb) $$,
  '22023', 'Chaque pièce doit avoir un nom.', 'pièce sans nom refusée');

-- ---------- Autre entreprise ----------
select pg_temp.connecter('e1390000-0000-4000-8000-000000000003');
select is_empty($$ select 1 from public.tender_rooms $$, 'autre entreprise : aucune pièce visible');
select throws_ok($$ select public.artisan_save_plan_rooms(
  (select id from public.tenders where name like 'Maison individuelle%'), '[]'::jsonb, '{}'::jsonb) $$,
  '22023', 'Appel d''offres introuvable.', 'autre entreprise : relevé non modifiable');
select throws_ok(
  $$ select public.artisan_import_plan_reading('00000000-0000-4000-8000-000000000000', '[]'::jsonb, '{}'::jsonb) $$,
  '22023', 'Appel d''offres introuvable.', 'appel d''offres inconnu');

-- ---------- Suppression : tous les fichiers ----------
select pg_temp.connecter('e1390000-0000-4000-8000-000000000001');
select is(public.artisan_delete_tender((select id from public.tenders where name like 'Maison individuelle%')),
  array['e1391000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c4d51.pdf',
        'e1391000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c4d52.jpg'],
  'suppression : chemins des plans rendus');
select is_empty($$ select 1 from public.tender_rooms $$, 'pièces supprimées avec l''appel d''offres');

select * from finish();
rollback;
