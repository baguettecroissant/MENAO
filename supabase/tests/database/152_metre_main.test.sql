-- Métré à la main (F-159, lot 3, ADR 0327) : une surface tracée devient une pièce (nouvelle ou
-- existante), une longueur ou un comptage un ouvrage dans le lot choisi ; origine « trace » ;
-- tracés gardés ; mesures mal formées refusées ; isolement entre entreprises.
-- Données fictives (identifiants e152…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1520000-0000-4000-8000-000000000001', 'metre152.entreprise@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1520000-0000-4000-8000-000000000002', 'metre152.autre@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, assujetti_tva) values
  ('e1521000-0000-4000-8000-000000000001', 'e1520000-0000-4000-8000-000000000001', 'valide', 'METRE 152', 'communes', true),
  ('e1521000-0000-4000-8000-000000000002', 'e1520000-0000-4000-8000-000000000002', 'valide', 'AUTRE 152', 'communes', true);
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('e1521000-0000-4000-8000-000000000001', 'entreprise', 'cus_e152a', 'sub_e152a', 'active'),
  ('e1521000-0000-4000-8000-000000000002', 'entreprise', 'cus_e152b', 'sub_e152b', 'active');

create function pg_temp.connecter(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan')
  )::text, true);
$$;
create function pg_temp.ao() returns uuid language sql as $$
  select id from public.tenders where name = 'Maison 152'
$$;

select ok(not has_function_privilege('anon', 'public.artisan_add_plan_measures(uuid, jsonb)', 'execute'),
  'ajout fermé aux visiteurs');

set local role authenticated;
select pg_temp.connecter('e1520000-0000-4000-8000-000000000001');
select lives_ok($$ select public.artisan_create_plan_tender('Maison 152',
  '[{"path":"e1521000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c5201.jpg","name":"sols.jpg"}]'::jsonb,
  array['plaquiste', 'electricien']) $$, 'création');
select is(public.artisan_import_plan_reading(pg_temp.ao(),
  '[{"name":"chambre 1","areaCm2":113803,"perimeterMm":13520,"heightMm":2700,"source":"photo","file":1,"page":1},
    {"name":"entrée","heightMm":2700,"source":"photo","file":1,"page":1}]'::jsonb, '{}'::jsonb), 2, 'relevé : 2 pièces');

select is(public.artisan_add_plan_measures(pg_temp.ao(), jsonb_build_array(
  jsonb_build_object('kind', 'surface', 'name', 'entrée', 'file', 1, 'points', '100,100 400,100 400,300 100,300',
    'roomId', (select id from public.tender_rooms where name = 'entrée'), 'areaCm2', 66000, 'perimeterMm', 10400),
  jsonb_build_object('kind', 'surface', 'name', 'Salon', 'file', 1, 'points', '500,100 900,100 900,500 500,500',
    'areaCm2', 172400, 'perimeterMm', 16620),
  jsonb_build_object('kind', 'longueur', 'name', 'Cloison à créer', 'file', 1, 'points', '100,400 100,669',
    'quantityMilli', 2690, 'trade', 'plaquiste'),
  jsonb_build_object('kind', 'comptage', 'name', 'Prises de courant', 'file', 1, 'points', '10,10 20,20 30,30',
    'quantityMilli', 3000, 'trade', 'macon')
)), 4, 'quatre mesures ajoutées');
select results_eq(
  $$ select name, area_cm2, perimeter_mm, height_mm, source from public.tender_rooms order by position $$,
  $$ values ('chambre 1'::text, 113803, 13520, 2700, 'photo'::text),
       ('entrée', 66000, 10400, 2700, 'trace'),
       ('Salon', 172400, 16620, 2700, 'trace') $$,
  'pièce existante mesurée, nouvelle pièce ajoutée avec la hauteur du relevé, pièce lue intacte');
select results_eq(
  $$ select name, kind, quantity_milli, source, trade_code from public.tender_works order by position $$,
  $$ values ('Cloison à créer'::text, 'lineaire'::text, 2690::bigint, 'trace'::text, 'plaquiste'::text),
       ('Prises de courant', 'nombre', 3000, 'trace', null) $$,
  'longueur et comptage devenus des ouvrages ; métier hors de l''appel d''offres ignoré');
select is((select jsonb_array_length(plan_marks) from public.tenders where id = pg_temp.ao()), 4, 'tracés gardés');
select is((select plan_marks -> 2 ->> 'points' from public.tenders where id = pg_temp.ao()), '100,400 100,669',
  'points du tracé gardés');

-- ---------- Mesures mal formées ----------
select throws_ok($$ select public.artisan_add_plan_measures(pg_temp.ao(), '[]'::jsonb) $$, '22023',
  'Mesures invalides.', 'liste vide refusée');
select throws_ok($$ select public.artisan_add_plan_measures(pg_temp.ao(),
  '[{"kind":"surface","name":"X","file":1,"points":"1,1 2,2 3,3","areaCm2":0,"perimeterMm":10}]'::jsonb) $$,
  '22023', 'Mesures invalides.', 'surface nulle refusée');
select throws_ok($$ select public.artisan_add_plan_measures(pg_temp.ao(),
  '[{"kind":"comptage","name":"X","file":1,"points":"1,1","quantityMilli":2500}]'::jsonb) $$,
  '22023', 'Mesures invalides.', 'comptage non entier refusé');
select throws_ok($$ select public.artisan_add_plan_measures(pg_temp.ao(),
  '[{"kind":"longueur","name":"X","file":1,"points":"<script>","quantityMilli":2500}]'::jsonb) $$,
  '22023', 'Mesures invalides.', 'points mal écrits refusés');
select throws_ok($$ select public.artisan_add_plan_measures(pg_temp.ao(),
  '[{"kind":"surface","name":"X","file":1,"points":"1,1 2,2 3,3","roomId":"00000000-0000-4000-8000-000000000000","areaCm2":100,"perimeterMm":10}]'::jsonb) $$,
  '22023', 'Pièce introuvable.', 'pièce inconnue refusée');
select is((select count(*)::integer from public.tender_rooms), 3, 'rien d''ajouté après un refus');

-- ---------- DPGF : origine « trace » ----------
select is(public.artisan_import_plan_lines(pg_temp.ao(),
  '[{"kind":"titre","lot":"LOT 01 PLAQUISTE","code":"LOT 01","designation":"PLAQUISTE"},
    {"kind":"poste","lot":"LOT 01 PLAQUISTE","code":"1.1","designation":"Cloison à créer","unit":"ml","unitLabel":"ml","quantityMilli":2690,"source":"trace","detail":"Tracé à la main sur le plan."}]'::jsonb),
  2, 'lignes du DPGF');
select is((select quantity_source from public.tender_lines where kind = 'poste'), 'trace', 'origine « trace » gardée');

-- ---------- Autre entreprise ----------
select pg_temp.connecter('e1520000-0000-4000-8000-000000000002');
select throws_ok($$ select public.artisan_add_plan_measures(
  (select id from public.tenders where name = 'Maison 152'),
  '[{"kind":"comptage","name":"X","file":1,"points":"1,1","quantityMilli":1000}]'::jsonb) $$,
  '22023', 'Appel d''offres introuvable.', 'autre entreprise : ajout refusé');

select * from finish();
rollback;
