-- Bibliothèque MENAO par défaut (F-147, ADR 0306) : catalogue lisible par les utilisateurs
-- connectés, non modifiable ; copie des ouvrages des métiers choisis dans la bibliothèque de
-- l'entreprise (temps de pose, fournitures sans prix), sans doublon ; premier passage enregistré ;
-- droits de chaque rôle. Données fictives (identifiants e145…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1450000-0000-4000-8000-000000000001', 'bib145.artisan@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1450000-0000-4000-8000-000000000002', 'bib145.autre@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1450000-0000-4000-8000-000000000003', 'bib145.client@example.test', false, now(), '{"role":"particulier"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode) values
  ('e1451000-0000-4000-8000-000000000001', 'e1450000-0000-4000-8000-000000000001', 'valide', 'PLATRERIE 145', 'communes'),
  ('e1451000-0000-4000-8000-000000000002', 'e1450000-0000-4000-8000-000000000002', 'valide', 'AUTRE 145', 'communes');
-- Un ouvrage à lui, de même désignation qu'un ouvrage MENAO : pas de doublon.
insert into public.artisan_works (artisan_id, designation, unit, manual_price_cents, source) values
  ('e1451000-0000-4000-8000-000000000001', 'Pose d''un WC suspendu', 'u', 66550, 'devis');

create function pg_temp.connecter(uid uuid, app_role text default 'artisan') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Catalogue ----------
select is((select count(distinct trade_code)::int from public.menao_works), 5, 'catalogue : cinq métiers');
select ok((select count(*) from public.menao_works) >= 30, 'catalogue : au moins 30 ouvrages');
select is((select count(*)::int from public.menao_supplies where price_min_cents is not null), 0,
  'aucun prix tant qu''aucune source n''est branchée');
select is((select count(*)::int from public.menao_works w
  where not exists (select 1 from public.menao_work_components c where c.work_id = w.id)
    and w.code <> 'depose_carrelage'), 0, 'chaque ouvrage a ses fournitures (sauf la dépose)');

select pg_temp.connecter('e1450000-0000-4000-8000-000000000003', 'particulier');
set local role authenticated;
select ok((select count(*) from public.menao_works) > 0, 'utilisateur connecté : catalogue lisible');
select throws_ok($$ insert into public.menao_works (code, trade_code, position, designation, unit, hours_milli)
  values ('intrus', 'peintre', 999, 'Intrus', 'u', 1000) $$, '42501', null, 'catalogue non modifiable');
select throws_ok($$ update public.menao_supplies set price_min_cents = 1 $$, '42501', null, 'prix du catalogue non modifiables');
select throws_ok($$ select public.artisan_adopt_menao_library(array['peintre']) $$, '42501', null,
  'client : pas de bibliothèque');
reset role;
set local role anon;
select throws_ok($$ select count(*) from public.menao_works $$, '42501', null, 'visiteur : catalogue fermé');
reset role;

-- ---------- Premier passage : bibliothèque MENAO ----------
select pg_temp.connecter('e1450000-0000-4000-8000-000000000001');
set local role authenticated;
select throws_ok($$ select public.artisan_adopt_menao_library(array[]::text[]) $$, '22023',
  'Choisissez au moins un métier.', 'au moins un métier');
select throws_ok($$ select public.artisan_adopt_menao_library(array['charpentier']) $$, '22023',
  'Métier sans ouvrage MENAO.', 'métier sans ouvrage refusé');
select is(public.artisan_adopt_menao_library(array['plaquiste', 'peintre']),
  (select count(*)::int from public.menao_works where trade_code in ('plaquiste', 'peintre')),
  'ouvrages de plâtrerie et de peinture copiés');
select results_eq(
  $$ select c.position::int, c.kind, c.quantity_milli, s.purchase_price_cents is null
     from public.artisan_works w
     join public.artisan_work_components c on c.work_id = w.id
     left join public.artisan_supplies s on s.id = c.supply_id
     where w.designation = 'Cloison en plaques de plâtre BA13 sur ossature 72/48'
     order by c.position limit 2 $$,
  $$ values (1, 'heures'::text, 550, true), (2, 'fourniture'::text, 2100, true) $$,
  'cloison : temps de pose d''abord, puis les fournitures, sans prix d''achat');
select is((select source from public.artisan_works where designation = 'Cloison en plaques de plâtre BA13 sur ossature 72/48'),
  'menao', 'origine MENAO');
select is((select count(*)::int from public.artisan_supplies where menao_supply_id is not null),
  (select count(distinct c.supply_id)::int from public.menao_works w join public.menao_work_components c on c.work_id = w.id
   where w.trade_code in ('plaquiste', 'peintre')),
  'une fourniture par fourniture MENAO utilisée');
select ok((select library_onboarded_at is not null from public.artisan_pricing_settings), 'premier passage enregistré');
select is(public.artisan_adopt_menao_library(array['plaquiste']), 0, 'deuxième copie : aucun doublon');
select is(public.artisan_adopt_menao_library(array['plombier']),
  (select count(*)::int - 1 from public.menao_works where trade_code = 'plombier'),
  'plomberie ajoutée, sauf le WC suspendu déjà présent');
select is((select count(*)::int from public.artisan_works where lower(designation) = lower('Pose d''un WC suspendu')), 1,
  'son WC suspendu reste le seul');
reset role;

-- ---------- Autre entreprise ----------
select pg_temp.connecter('e1450000-0000-4000-8000-000000000002');
set local role authenticated;
select is((select count(*)::int from public.artisan_works), 0, 'autre entreprise : rien de copié chez elle');
select lives_ok($$ select public.artisan_dismiss_menao_library() $$, 'autre choix au premier passage');
select ok((select library_onboarded_at is not null from public.artisan_pricing_settings), 'premier passage enregistré sans copie');
select is((select count(*)::int from public.artisan_supplies), 0, 'aucune fourniture copiée');
reset role;

select * from finish();
rollback;
