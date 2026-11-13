-- Augmenter ses prix en un geste (F-149, ADR 0312) : arrondi identique à packages/core, ouvrages à
-- prix fixé et/ou prix d'achat, annulation de la dernière hausse dans les 24 h sans écraser un prix
-- modifié depuis ; droits de chaque rôle. Données fictives (identifiants e148…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1480000-0000-4000-8000-000000000001', 'hau148.artisan@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1480000-0000-4000-8000-000000000002', 'hau148.autre@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1480000-0000-4000-8000-000000000003', 'hau148.client@example.test', false, now(), '{"role":"particulier"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode) values
  ('e1481000-0000-4000-8000-000000000001', 'e1480000-0000-4000-8000-000000000001', 'valide', 'PLOMBERIE 148', 'communes'),
  ('e1481000-0000-4000-8000-000000000002', 'e1480000-0000-4000-8000-000000000002', 'valide', 'AUTRE 148', 'communes');
insert into public.artisan_works (id, artisan_id, designation, unit, manual_price_cents, source) values
  ('e1482000-0000-4000-8000-000000000001', 'e1481000-0000-4000-8000-000000000001', 'Pose WC suspendu', 'u', 66550, 'manuel'),
  ('e1482000-0000-4000-8000-000000000002', 'e1481000-0000-4000-8000-000000000001', 'Dépose cloison', 'm2', 1400, 'manuel'),
  ('e1482000-0000-4000-8000-000000000003', 'e1481000-0000-4000-8000-000000000001', 'Ouvrage composé', 'm2', null, 'manuel'),
  ('e1482000-0000-4000-8000-000000000004', 'e1481000-0000-4000-8000-000000000002', 'Pose WC autre', 'u', 50000, 'manuel');
insert into public.artisan_supplies (id, artisan_id, designation, unit, purchase_price_cents, price_on) values
  ('e1483000-0000-4000-8000-000000000001', 'e1481000-0000-4000-8000-000000000001', 'Plaque BA13', 'm2', 250, '2026-09-01');

create function pg_temp.connecter(uid uuid, app_role text default 'artisan') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Arrondi (mêmes valeurs que packages/core) ----------
select is(app.raise_price(66550, 300, 10), 68550, '665,50 € + 3 % aux 10 centimes');
select is(app.raise_price(250, 300, 1), 258, 'moitié vers le haut au centime');
select is(app.raise_price(110, 300, 100), 110, 'jamais sous le prix de départ');

select pg_temp.connecter('e1480000-0000-4000-8000-000000000001');
set local role authenticated;

-- ---------- Refus ----------
select throws_ok($$ select public.artisan_raise_prices(3100, 'dix', true, false) $$,
  '22023', 'Hausse invalide (de 0,1 à 30 %).', 'plus de 30 % refusé');
select throws_ok($$ select public.artisan_raise_prices(300, 'dix', false, false) $$,
  '22023', 'Hausse invalide (de 0,1 à 30 %).', 'ni ouvrages ni fournitures refusé');
select throws_ok($$ select public.artisan_raise_prices(300, 'demi', true, false) $$,
  '22023', 'Hausse invalide (de 0,1 à 30 %).', 'arrondi inconnu refusé');

-- ---------- Hausse sur les ouvrages ----------
select is((public.artisan_raise_prices(300, 'dix', true, false) - 'raiseId'),
  '{"works": 2, "supplies": 0}'::jsonb, 'deux ouvrages à prix fixé augmentés');
select results_eq(
  $$ select manual_price_cents from public.artisan_works where artisan_id = 'e1481000-0000-4000-8000-000000000001' order by designation $$,
  $$ values (1440), (null::integer), (68550) $$, 'prix arrondis ; ouvrage composé inchangé');
select is((select purchase_price_cents from public.artisan_supplies where id = 'e1483000-0000-4000-8000-000000000001'), 250,
  'prix d''achat inchangés');

-- ---------- Seconde hausse, sur les prix d'achat ----------
select is((public.artisan_raise_prices(300, 'centime', false, true) - 'raiseId'),
  '{"works": 0, "supplies": 1}'::jsonb, 'prix d''achat augmenté');
select results_eq(
  $$ select purchase_price_cents, price_on = (now() at time zone 'Europe/Paris')::date from public.artisan_supplies
     where id = 'e1483000-0000-4000-8000-000000000001' $$,
  $$ values (258, true) $$, 'prix d''achat daté du jour');
select throws_ok(
  format('select public.artisan_undo_price_raise(%L)',
    (select id from public.library_price_raises where on_works order by created_at limit 1)),
  '22023', 'Cette hausse ne peut plus être annulée.', 'seule la dernière hausse est annulable');

-- ---------- Annulation ----------
select is(public.artisan_undo_price_raise((select id from public.library_price_raises where on_supplies)), 1,
  'dernière hausse annulée');
select results_eq(
  $$ select purchase_price_cents, price_on from public.artisan_supplies where id = 'e1483000-0000-4000-8000-000000000001' $$,
  $$ values (250, '2026-09-01'::date) $$, 'prix et date d''avant rétablis');
reset role;
-- Un ouvrage modifié depuis la hausse.
update public.artisan_works set manual_price_cents = 1500 where id = 'e1482000-0000-4000-8000-000000000002';
select pg_temp.connecter('e1480000-0000-4000-8000-000000000001');
set local role authenticated;
select is(public.artisan_undo_price_raise((select id from public.library_price_raises where on_works)), 1,
  'première hausse annulée ensuite : un seul prix rétabli');
select results_eq(
  $$ select manual_price_cents from public.artisan_works where id in
       ('e1482000-0000-4000-8000-000000000001', 'e1482000-0000-4000-8000-000000000002') order by designation $$,
  $$ values (1500), (66550) $$, 'prix modifié depuis laissé, l''autre rétabli');
select throws_ok(
  format('select public.artisan_undo_price_raise(%L)', (select id from public.library_price_raises where on_works)),
  '22023', 'Cette hausse ne peut plus être annulée.', 'pas deux fois');
reset role;

-- Plus de 24 h : plus annulable.
select pg_temp.connecter('e1480000-0000-4000-8000-000000000001');
set local role authenticated;
select lives_ok($$ select public.artisan_raise_prices(500, 'euro', true, false) $$, 'nouvelle hausse');
reset role;
update public.library_price_raises set created_at = now() - interval '25 hours' where undone_at is null;
select pg_temp.connecter('e1480000-0000-4000-8000-000000000001');
set local role authenticated;
select throws_ok(
  format('select public.artisan_undo_price_raise(%L)', (select id from public.library_price_raises where undone_at is null)),
  '22023', 'Cette hausse ne peut plus être annulée.', 'plus de 24 h : refusée');
reset role;

-- ---------- Autres rôles ----------
select is((select manual_price_cents from public.artisan_works where id = 'e1482000-0000-4000-8000-000000000004'), 50000,
  'l''autre entreprise n''a pas changé');
select pg_temp.connecter('e1480000-0000-4000-8000-000000000002');
set local role authenticated;
select is((select count(*)::int from public.library_price_raises), 0, 'autre entreprise : ne voit pas les hausses');
select throws_ok(
  format('select public.artisan_undo_price_raise(%L)', (select id from public.library_price_raises limit 1)),
  '22023', 'Cette hausse ne peut plus être annulée.', 'autre entreprise : pas d''annulation');
reset role;
select pg_temp.connecter('e1480000-0000-4000-8000-000000000003', 'particulier');
set local role authenticated;
select throws_ok($$ select public.artisan_raise_prices(300, 'dix', true, false) $$, '42501', null, 'client : refusé');
reset role;
set local role anon;
select throws_ok($$ select public.artisan_raise_prices(300, 'dix', true, false) $$, '42501', null, 'visiteur : refusé');
reset role;

select * from finish();
rollback;
