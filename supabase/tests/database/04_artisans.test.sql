-- F-14 : inscription artisan, fiche artisan, référentiels, étapes 1 à 3, Sirene, limitation de débit.
-- SIRET fictifs (inexistants dans Sirene, vérifié via l'API : 404) ; La Poste : identifiant public.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

-- Utilisateurs fictifs
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('a1a1a1a1-0000-4000-8000-000000000001', 'art.a1@example.test', '{}',
   '{"account_type":"artisan","siret":"00000001800010","phone":"+33639980002",
     "legal":{"cgu":"v1","confidentialite":"v1","cgv_artisan":"v1"}}'),
  ('a2a2a2a2-0000-4000-8000-000000000002', 'art.a2@example.test', '{}',
   '{"account_type":"artisan","siret":"00000002600013"}'),
  ('a3a3a3a3-0000-4000-8000-000000000003', 'art.a3@example.test', '{}',
   '{"account_type":"artisan","siret":"00000001800010"}'),
  ('a4a4a4a4-0000-4000-8000-000000000004', 'art.a4@example.test', '{}',
   '{"account_type":"artisan","siret":"12345678901234"}'),
  ('b0b0b0b0-0000-4000-8000-000000000005', 'part.p@example.test', '{}',
   '{"account_type":"admin"}'),
  ('c0c0c0c0-0000-4000-8000-000000000006', 'supp.s@example.test', '{"role":"support"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Inscription ----------
select is(
  (select raw_app_meta_data ->> 'role' from auth.users where id = 'a1a1a1a1-0000-4000-8000-000000000001'),
  'artisan_en_attente', 'account_type artisan → rôle artisan_en_attente dans app_metadata');
select is(
  (select raw_app_meta_data ->> 'role' from auth.users where id = 'b0b0b0b0-0000-4000-8000-000000000005'),
  'particulier', 'account_type « admin » → particulier (seules deux issues possibles)');
select results_eq(
  $$ select siret, status::text from public.artisans where user_id = 'a1a1a1a1-0000-4000-8000-000000000001' $$,
  $$ values ('00000001800010'::text, 'brouillon'::text) $$,
  'fiche artisan créée en brouillon avec le SIRET saisi');
select is(
  (select siret from public.artisans where user_id = 'a3a3a3a3-0000-4000-8000-000000000003'),
  null, 'SIRET déjà utilisé : fiche créée sans SIRET');
select is(
  (select siret from public.artisans where user_id = 'a4a4a4a4-0000-4000-8000-000000000004'),
  null, 'SIRET invalide : fiche créée sans SIRET');
select is_empty(
  $$ select 1 from public.artisans where user_id = 'b0b0b0b0-0000-4000-8000-000000000005' $$,
  'pas de fiche artisan pour un particulier');
select ok(
  not exists (select 1 from auth.users where id = 'a1a1a1a1-0000-4000-8000-000000000001'
    and raw_user_meta_data ?| array['siret', 'account_type', 'phone', 'legal']),
  'SIRET et type de compte retirés de user_metadata');
select is(
  (select count(*)::int from public.legal_acceptances where user_id = 'a1a1a1a1-0000-4000-8000-000000000001'),
  3, 'CGU, confidentialité et CGV artisans enregistrées');

-- ---------- Fonctions utilitaires ----------
select ok(
  app.is_valid_siret('00000001800010') and app.is_valid_siret('35600000000048')
    and app.is_valid_siret('35600000049837') and not app.is_valid_siret('00000001800011')
    and not app.is_valid_siret('123') and not app.is_valid_siret(null),
  'is_valid_siret : Luhn, exception La Poste, formats invalides');
select is(app.french_vat_number('000000018'), 'FR66000000018', 'TVA intracommunautaire déduite du SIREN');

-- Données de départ pour A2 (écrites directement, hors RLS).
insert into public.artisan_trades (artisan_id, trade_code)
  values ((select id from public.artisans where user_id = 'a2a2a2a2-0000-4000-8000-000000000002'), 'peintre');

-- ---------- Serveur (service_role) ----------
set local role service_role;

select public.record_sirene_result(
  (select id from public.artisans where user_id = 'a1a1a1a1-0000-4000-8000-000000000001'), '00000001800010',
  '{"active":true,"partialDiffusion":false,"raisonSociale":"ELECTRICITE EXEMPLE","formeJuridiqueCode":"5499",
    "apeCode":"43.21A","adresse":{"ligne":"12 AV DES EXEMPLES","codePostal":"06000","commune":"NICE","codeInsee":"06088"}}');
select results_eq(
  $$ select raison_sociale, sirene_active, ape_eligible, adresse_code_insee, sirene_checked_at is not null
     from public.artisans where user_id = 'a1a1a1a1-0000-4000-8000-000000000001' $$,
  $$ values ('ELECTRICITE EXEMPLE'::text, true, true, '06088'::text, true) $$,
  'résultat Sirene enregistré, APE 43.21A reconnu bâtiment');

select public.record_sirene_result(
  (select id from public.artisans where user_id = 'a2a2a2a2-0000-4000-8000-000000000002'), '00000002600013',
  '{"active":true,"partialDiffusion":false,"raisonSociale":"CONSEIL EXEMPLE","apeCode":"62.01Z","adresse":{}}');
select is(
  (select ape_eligible from public.artisans where user_id = 'a2a2a2a2-0000-4000-8000-000000000002'),
  false, 'APE 62.01Z hors bâtiment : signalé (pas de refus)');

select public.record_sirene_result(
  (select id from public.artisans where user_id = 'a2a2a2a2-0000-4000-8000-000000000002'), '00000009999999',
  '{"active":false,"raisonSociale":"AUTRE"}');
select is(
  (select raison_sociale from public.artisans where user_id = 'a2a2a2a2-0000-4000-8000-000000000002'),
  'CONSEIL EXEMPLE', 'résultat ignoré si le SIRET ne correspond plus');

select results_eq(
  $$ select public.consume_rate_limit('test:cle', 2, 3600) from generate_series(1, 3) $$,
  array[true, true, false],
  'limitation de débit : 2 appels autorisés, le 3e refusé');

reset role;

-- ---------- Artisan A1 ----------
select pg_temp.connecter('a1a1a1a1-0000-4000-8000-000000000001', 'artisan_en_attente');
set local role authenticated;

select results_eq('select user_id from public.artisans',
  $$ values ('a1a1a1a1-0000-4000-8000-000000000001'::uuid) $$, 'artisan : ne voit que sa fiche');

select results_eq(
  $$ update public.artisans set nom_commercial = 'Exemple Élec' where user_id = 'a1a1a1a1-0000-4000-8000-000000000001'
     returning nom_commercial $$,
  $$ values ('Exemple Élec'::text) $$, 'artisan : peut modifier son nom commercial');

select throws_ok($$ update public.artisans set status = 'valide' $$, '42501', null,
  'artisan : ne peut pas changer son statut');
select throws_ok($$ update public.artisans set sirene_active = true $$, '42501', null,
  'artisan : ne peut pas modifier le résultat Sirene');
select throws_ok($$ update public.artisans set raison_sociale = 'Autre nom' $$, '42501', null,
  'artisan : raison sociale Sirene non modifiable (diffusion complète)');

update public.artisans set siret = '00000004200010', assujetti_tva = true;
select results_eq(
  $$ select siret, raison_sociale, sirene_checked_at, tva_intracom from public.artisans $$,
  $$ values ('00000004200010'::text, null::text, null::timestamptz, 'FR41000000042'::text) $$,
  'nouveau SIRET en brouillon : données Sirene effacées, TVA recalculée');

select throws_ok($$ update public.artisans set siret = '00000001800011' $$, '23514', null,
  'SIRET invalide refusé par la base');

select lives_ok(
  $$ select public.set_artisan_trades(array['electricien', 'plombier'], array['tableau-electrique'], 12) $$,
  'étape 2 : métiers et spécialité enregistrés');
select results_eq(
  $$ select (select count(*)::int from public.artisan_trades), (select count(*)::int from public.artisan_work_types),
            (select experience_years::int from public.artisans) $$,
  $$ values (2, 1, 12) $$, 'étape 2 : 2 métiers, 1 spécialité, 12 ans d''expérience');
select throws_ok(
  $$ select public.set_artisan_trades(array['peintre'], array['tableau-electrique'], 3) $$, '22023', null,
  'spécialité hors des métiers choisis refusée');
select throws_ok(
  $$ select public.set_artisan_trades(array['astronaute'], array[]::text[], 3) $$, '22023', null,
  'métier inconnu refusé');

select lives_ok(
  $$ select public.set_artisan_zone('rayon', 'Promenade des Anglais 06200 Nice', '06088', 7.24, 43.69, 30) $$,
  'étape 3 : zone en rayon');
select results_eq(
  $$ select zone_mode::text, radius_km::int, base_location is not null from public.artisans $$,
  $$ values ('rayon'::text, 30, true) $$, 'zone en rayon enregistrée avec un point PostGIS');

select lives_ok(
  $$ select public.set_artisan_zone('communes', p_communes => '[{"code":"06088","nom":"Nice"},{"code":"06004","nom":"Antibes"}]') $$,
  'étape 3 : zone en communes');
select results_eq(
  $$ select zone_mode::text, base_location is null, (select count(*)::int from public.artisan_zones) from public.artisans $$,
  $$ values ('communes'::text, true, 2) $$, 'zone en communes : rayon effacé, 2 communes');
select throws_ok(
  $$ select public.set_artisan_zone('communes', p_communes => '[]') $$, '22023', null, 'au moins une commune');

select throws_ok(
  $$ insert into public.artisan_zones (artisan_id, code_insee, nom)
     values ((select id from public.artisans where user_id = 'a1a1a1a1-0000-4000-8000-000000000001'), '06029', 'Cannes') $$,
  '42501', null, 'écriture directe des communes interdite (fonction uniquement)');

select lives_ok(
  $$ insert into public.certifications (artisan_id, type, numero, date_fin)
     values (app.my_artisan_id(), 'rge', 'E-12345', '2027-06-30') $$,
  'certification ajoutée');
select throws_ok(
  $$ insert into public.certifications (artisan_id, type, numero, date_fin, verified_at)
     values (app.my_artisan_id(), 'rge', 'E-1', '2027-06-30', now()) $$,
  '42501', null, 'certification : verified_at non modifiable');
select throws_ok(
  $$ insert into public.certifications (artisan_id, type, numero, date_fin)
     values ('00000000-0000-4000-8000-000000000000', 'rge', 'E-2', '2027-06-30') $$,
  '42501', null, 'certification : impossible pour une autre fiche');

select is_empty(
  $$ select 1 from public.artisan_trades where trade_code = 'peintre' $$,
  'artisan : ne voit pas les métiers des autres artisans');
select ok((select count(*) from public.trades) = 15, 'référentiel des métiers lisible');
select throws_ok($$ select public.record_sirene_result(gen_random_uuid(), 'x', '{}') $$, '42501', null,
  'artisan : ne peut pas écrire un résultat Sirene');
select throws_ok($$ select public.consume_rate_limit('x', 1, 60) $$, '42501', null,
  'artisan : ne peut pas manipuler la limitation de débit');

reset role;

-- ---------- Artisan A2 : SIRET verrouillé après envoi en vérification, diffusion partielle ----------
update public.artisans set status = 'en_verification' where user_id = 'a2a2a2a2-0000-4000-8000-000000000002';
select pg_temp.connecter('a2a2a2a2-0000-4000-8000-000000000002', 'artisan_en_attente');
set local role authenticated;
select throws_ok($$ update public.artisans set siret = '00000005900014' $$, '42501', null,
  'SIRET non modifiable après envoi en vérification');
reset role;

set local role service_role;
select public.record_sirene_result(
  (select id from public.artisans where user_id = 'a2a2a2a2-0000-4000-8000-000000000002'), '00000002600013',
  '{"active":true,"partialDiffusion":true,"raisonSociale":null,"apeCode":"43.34Z","adresse":{"commune":"NICE"}}');
reset role;
select pg_temp.connecter('a2a2a2a2-0000-4000-8000-000000000002', 'artisan_en_attente');
set local role authenticated;
select results_eq(
  $$ update public.artisans set raison_sociale = 'Peinture Exemple' returning raison_sociale $$,
  $$ values ('Peinture Exemple'::text) $$, 'diffusion partielle : l''artisan saisit sa raison sociale');
reset role;

-- ---------- Particulier ----------
select pg_temp.connecter('b0b0b0b0-0000-4000-8000-000000000005', 'particulier');
set local role authenticated;
select is_empty('select 1 from public.artisans', 'particulier : aucune fiche artisan visible');
select throws_ok($$ select public.set_artisan_trades(array['peintre'], array[]::text[], 1) $$, '42501', null,
  'particulier : pas d''onboarding artisan');
reset role;

-- ---------- Support ----------
select pg_temp.connecter('c0c0c0c0-0000-4000-8000-000000000006', 'support');
set local role authenticated;
select is(
  (select count(*)::int from public.artisans where user_id in (
    'a1a1a1a1-0000-4000-8000-000000000001', 'a2a2a2a2-0000-4000-8000-000000000002',
    'a3a3a3a3-0000-4000-8000-000000000003', 'a4a4a4a4-0000-4000-8000-000000000004')),
  4, 'support : voit les fiches artisans');
select ok(exists (select 1 from public.artisan_trades where trade_code = 'peintre'),
  'support : voit les métiers des artisans');
select is_empty($$ update public.artisans set nom_commercial = 'X' returning 1 $$,
  'support : ne modifie pas les fiches artisans');
reset role;

-- ---------- Visiteur ----------
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select is((select count(*)::int from public.trades), 15, 'visiteur : référentiel des métiers lisible');
select throws_ok('select 1 from public.artisans', '42501', null, 'visiteur : aucune fiche artisan');
select throws_ok($$ select public.set_artisan_zone('communes') $$, '42501', null,
  'visiteur : pas d''écriture de zone');
reset role;

select * from finish();
rollback;
