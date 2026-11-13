-- Import d'un catalogue (F-148, ADR 0309) : ouvrages et fournitures ajoutés d'un bloc, déjà présents
-- mis à jour ou laissés, ligne répétée comptée une fois, ligne invalide refusée ; espace privé des
-- fichiers ; droits de chaque rôle. Données fictives (identifiants e146…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1460000-0000-4000-8000-000000000001', 'imp146.artisan@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1460000-0000-4000-8000-000000000002', 'imp146.autre@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1460000-0000-4000-8000-000000000003', 'imp146.client@example.test', false, now(), '{"role":"particulier"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode) values
  ('e1461000-0000-4000-8000-000000000001', 'e1460000-0000-4000-8000-000000000001', 'valide', 'PLATRERIE 146', 'communes'),
  ('e1461000-0000-4000-8000-000000000002', 'e1460000-0000-4000-8000-000000000002', 'valide', 'AUTRE 146', 'communes');
-- Déjà dans sa bibliothèque : une cloison au m² (prix 30 €) et une fourniture.
insert into public.artisan_works (artisan_id, designation, unit, manual_price_cents, source) values
  ('e1461000-0000-4000-8000-000000000001', 'Cloison placo 72/48', 'm2', 3000, 'manuel');
insert into public.artisan_supplies (artisan_id, designation, unit, purchase_price_cents) values
  ('e1461000-0000-4000-8000-000000000001', 'Plaque BA13', 'm2', 250);

create function pg_temp.connecter(uid uuid, app_role text default 'artisan') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Espace privé des fichiers ----------
select is((select public from storage.buckets where id = 'library-imports'), false, 'fichiers déposés : espace privé');

-- ---------- Ouvrages ----------
select pg_temp.connecter('e1460000-0000-4000-8000-000000000001');
set local role authenticated;
select is(public.artisan_import_library('ouvrages', $j$[
    {"designation": "cloison placo 72/48", "unit": "m2", "priceCents": 3850, "vatRateBp": 1000},
    {"designation": "Doublage collé PSE", "unit": "m2", "priceCents": 4200},
    {"designation": "Trappe de visite", "unit": "u", "priceCents": 9000, "vatRateBp": 2000},
    {"designation": "Trappe de visite", "unit": "u", "priceCents": 9500, "vatRateBp": 2000}
  ]$j$::jsonb, true), '{"added": 2, "updated": 1}'::jsonb,
  'ouvrages : deux ajoutés, la cloison déjà présente mise à jour');
select is((select manual_price_cents from public.artisan_works where designation = 'Cloison placo 72/48'), 3850,
  'cloison : prix du fichier');
select results_eq(
  $$ select manual_price_cents, vat_rate_bp::int, source from public.artisan_works where designation = 'Trappe de visite' $$,
  $$ values (9500, 2000, 'import'::text) $$, 'ligne répétée : comptée une fois, la dernière l''emporte, origine import');
select is((select vat_rate_bp::int from public.artisan_works where designation = 'Doublage collé PSE'), 1000,
  'TVA absente : 10 %');
select is(public.artisan_import_library('ouvrages', $j$[
    {"designation": "Cloison placo 72/48", "unit": "m2", "priceCents": 9999},
    {"designation": "Plinthe", "unit": "ml", "priceCents": 800}
  ]$j$::jsonb, false), '{"added": 1, "updated": 0}'::jsonb, 'sans mise à jour : seuls les nouveaux');
select is((select manual_price_cents from public.artisan_works where designation = 'Cloison placo 72/48'), 3850,
  'cloison laissée telle quelle');
select throws_ok($$ select public.artisan_import_library('ouvrages', '[{"designation": "", "unit": "u", "priceCents": 100}]'::jsonb, true) $$,
  '22023', 'Une ligne du fichier est invalide.', 'désignation vide refusée');
select throws_ok($$ select public.artisan_import_library('ouvrages', '[{"designation": "X", "unit": "u", "priceCents": 100, "vatRateBp": 700}]'::jsonb, true) $$,
  '22023', 'Une ligne du fichier est invalide.', 'TVA inconnue refusée');
select throws_ok($$ select public.artisan_import_library('ouvrages', '[]'::jsonb, true) $$,
  '22023', 'Fichier vide ou trop long (5 000 lignes au plus).', 'fichier vide refusé');
select throws_ok($$ select public.artisan_import_library('autre', '[{"designation": "X", "unit": "u", "priceCents": 1}]'::jsonb, true) $$,
  '22023', 'Type d''import inconnu.', 'type inconnu refusé');

-- ---------- Fournitures ----------
select is(public.artisan_import_library('fournitures', $j$[
    {"designation": "plaque ba13", "unit": "m2", "priceCents": 290, "reference": "BA13-250", "supplier": "Négoce fictif"},
    {"designation": "Rail 48", "unit": "ml", "priceCents": 110}
  ]$j$::jsonb, true), '{"added": 1, "updated": 1}'::jsonb, 'fournitures : une ajoutée, une mise à jour');
select results_eq(
  $$ select purchase_price_cents, reference, supplier, price_on is not null from public.artisan_supplies where designation = 'Plaque BA13' $$,
  $$ values (290, 'BA13-250'::text, 'Négoce fictif'::text, true) $$, 'prix d''achat, référence et fournisseur, datés du jour');
reset role;

-- ---------- Autres rôles ----------
select pg_temp.connecter('e1460000-0000-4000-8000-000000000002');
set local role authenticated;
select is((select count(*)::int from public.artisan_works), 0, 'autre entreprise : rien chez elle');
select lives_ok($$ select public.artisan_import_library('ouvrages', '[{"designation": "Cloison placo 72/48", "unit": "m2", "priceCents": 1}]'::jsonb, true) $$,
  'autre entreprise : son propre import');
reset role;
select is((select manual_price_cents from public.artisan_works
  where artisan_id = 'e1461000-0000-4000-8000-000000000001' and designation = 'Cloison placo 72/48'), 3850,
  'l''import d''une autre entreprise ne touche pas la bibliothèque de la première');

select pg_temp.connecter('e1460000-0000-4000-8000-000000000003', 'particulier');
set local role authenticated;
select throws_ok($$ select public.artisan_import_library('ouvrages', '[{"designation": "X", "unit": "u", "priceCents": 1}]'::jsonb, true) $$,
  '42501', null, 'client : pas d''import');
reset role;
set local role anon;
select throws_ok($$ select public.artisan_import_library('ouvrages', '[{"designation": "X", "unit": "u", "priceCents": 1}]'::jsonb, true) $$,
  '42501', null, 'visiteur : pas d''import');
reset role;

select * from finish();
rollback;
