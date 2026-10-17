-- Inscription artisan en un seul parcours (ADR 0110) : choix du parcours enregistrés à la création
-- du compte par e-mail (valeurs invalides ignorées), finalisation d'un compte Google ou Apple en
-- compte artisan en attente.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

-- SIRET fictifs (clé de Luhn valide, absents de Sirene).
insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c5600000-0000-4000-8000-000000000001', 'express56.complet@example.test', false, now(),
   '{"provider":"email","providers":["email"]}',
   '{"account_type":"artisan","first_name":"Camille","last_name":"Exemple","phone":"+33639980056",
     "siret":"00000056200017","legal":{"cgu":"v1","confidentialite":"v1","cgv_artisan":"v1"},
     "signup":{"trade_codes":["plombier","chauffagiste","plombier"],"assujetti_tva":false,"is_dirigeant":true,
       "zone":{"mode":"rayon","base_label":"12 Avenue des Oliviers 06100 Nice","base_citycode":"06088",
               "lon":7.26,"lat":43.72,"radius_km":30}}}'),
  ('c5600000-0000-4000-8000-000000000002', 'express56.invalide@example.test', false, now(),
   '{"provider":"email","providers":["email"]}',
   '{"account_type":"artisan","first_name":"Alex","siret":"00000056200017",
     "signup":{"trade_codes":["inconnu",3,"plombier"],"assujetti_tva":"oui","is_dirigeant":null,
       "zone":{"mode":"rayon","base_label":"Nice","base_citycode":"06088","lon":"7.26","lat":43.72,"radius_km":42}}}'),
  ('c5600000-0000-4000-8000-000000000003', 'express56.particulier@example.test', false, now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Sam","signup":{"trade_codes":["plombier"]}}'),
  ('c5600000-0000-4000-8000-000000000004', 'express56.google@example.test', false, now(),
   '{"provider":"google","providers":["google"]}', '{"full_name":"Lou Exemple"}'),
  ('c5600000-0000-4000-8000-000000000005', 'express56.apple@example.test', false, now(),
   '{"provider":"apple","providers":["apple"]}', '{}');

create function pg_temp.connecter(uid uuid, anonyme boolean default false) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'is_anonymous', anonyme,
    'app_metadata', jsonb_build_object('role', 'particulier')
  )::text, true);
$$;

-- ---------- Inscription par e-mail ----------
select results_eq(
  $$ select a.siret, a.assujetti_tva, a.is_dirigeant, a.zone_mode::text, a.base_label, a.base_code_insee,
            a.radius_km::int, round(extensions.st_x(a.base_location::extensions.geometry)::numeric, 2)
     from public.artisans a where a.user_id = 'c5600000-0000-4000-8000-000000000001' $$,
  $$ values ('00000056200017'::text, false, true, 'rayon'::text, '12 Avenue des Oliviers 06100 Nice'::text,
             '06088'::text, 30, 7.26::numeric) $$,
  'fiche artisan créée avec l''entreprise, la TVA, la réponse « dirigeant » et la zone du parcours');
select results_eq(
  $$ select t.trade_code from public.artisan_trades t join public.artisans a on a.id = t.artisan_id
     where a.user_id = 'c5600000-0000-4000-8000-000000000001' order by 1 $$,
  $$ values ('chauffagiste'::text), ('plombier') $$,
  'métiers du parcours enregistrés, sans doublon');
select is(
  (select raw_user_meta_data ? 'signup' from auth.users where id = 'c5600000-0000-4000-8000-000000000001'),
  false, 'choix du parcours retirés de user_metadata');
select is((select count(*)::int from public.legal_acceptances where user_id = 'c5600000-0000-4000-8000-000000000001'),
  3, 'CGU, politique de confidentialité et CGV artisans acceptées');

select results_eq(
  $$ select a.siret, a.assujetti_tva, a.is_dirigeant, a.zone_mode::text, a.radius_km::int
     from public.artisans a where a.user_id = 'c5600000-0000-4000-8000-000000000002' $$,
  $$ values (null::text, null::boolean, null::boolean, null::text, null::int) $$,
  'valeurs invalides ignorées sans bloquer l''inscription (SIRET déjà pris, TVA, rayon, coordonnées)');
select results_eq(
  $$ select t.trade_code from public.artisan_trades t join public.artisans a on a.id = t.artisan_id
     where a.user_id = 'c5600000-0000-4000-8000-000000000002' $$,
  $$ values ('plombier'::text) $$,
  'métier inconnu ignoré, métier connu gardé');

select ok(
  not exists (select 1 from public.artisans where user_id = 'c5600000-0000-4000-8000-000000000003')
  and not (select raw_user_meta_data ? 'signup' from auth.users where id = 'c5600000-0000-4000-8000-000000000003'),
  'compte particulier : aucune fiche artisan, choix du parcours retirés');

select pg_temp.connecter('c5600000-0000-4000-8000-000000000003');
set local role authenticated;
select throws_ok(
  $$ select app.apply_artisan_signup(null, '{}') $$, '42501', null,
  'application des choix du parcours non appelable directement');
reset role;

-- ---------- Compte Google ou Apple finalisé en compte artisan ----------
set local role anon;
select throws_ok(
  $$ select public.complete_artisan_oauth_signup('Lou', 'Exemple', '+33639980057', false,
       '{"cgu":"v1","confidentialite":"v1","cgv_artisan":"v1"}', '00000057000010', '{}') $$,
  '42501', null, 'interdit sans connexion');
reset role;

select pg_temp.connecter('c5600000-0000-4000-8000-000000000004', true);
set local role authenticated;
select throws_ok(
  $$ select public.complete_artisan_oauth_signup('Lou', 'Exemple', '+33639980057', false,
       '{"cgu":"v1","confidentialite":"v1","cgv_artisan":"v1"}', '00000057000010', '{}') $$,
  '42501', 'Connexion requise', 'interdit à une session anonyme');
reset role;

select pg_temp.connecter('c5600000-0000-4000-8000-000000000004');
set local role authenticated;
select throws_ok(
  $$ select public.complete_artisan_oauth_signup('Lou', 'Exemple', null, false,
       '{"cgu":"v1","confidentialite":"v1","cgv_artisan":"v1"}', '00000057000010', '{}') $$,
  '22023', 'Le téléphone est obligatoire pour un compte professionnel.', 'téléphone obligatoire');
select throws_ok(
  $$ select public.complete_artisan_oauth_signup('Lou', 'Exemple', '+33639980057', false,
       '{"cgu":"v1","confidentialite":"v1"}', '00000057000010', '{}') $$,
  '22023', 'Acceptez les conditions d''utilisation, la politique de confidentialité et les conditions de vente artisans.',
  'CGV artisans obligatoires');
select throws_ok(
  $$ select public.complete_artisan_oauth_signup('Lou', 'Exemple', '06 39 98 00 57', false,
       '{"cgu":"v1","confidentialite":"v1","cgv_artisan":"v1"}', '00000057000010', '{}') $$,
  '22023', 'Le téléphone est obligatoire pour un compte professionnel.',
  'téléphone attendu au format international (normalisé par le site)');
select lives_ok(
  $$ select public.complete_artisan_oauth_signup('Lou', 'Exemple', '+33639980057', true,
       '{"cgu":"v1","confidentialite":"v1","cgv_artisan":"v1"}', '000 000 570 00010',
       '{"trade_codes":["electricien"],"assujetti_tva":true,"is_dirigeant":false,
         "zone":{"mode":"rayon","base_label":"Antibes (06600)","base_citycode":"06004","lon":7.12,"lat":43.58,"radius_km":20}}') $$,
  'finalisation en compte artisan');
select throws_ok(
  $$ select public.complete_artisan_oauth_signup('Lou', 'Exemple', '+33639980057', false,
       '{"cgu":"v1","confidentialite":"v1","cgv_artisan":"v1"}', '00000057000010', '{}') $$,
  '22023', 'Votre compte est déjà finalisé.', 'finalisation possible une seule fois');
reset role;

select results_eq(
  $$ select u.raw_app_meta_data ->> 'role', coalesce(u.raw_app_meta_data ->> 'signup_pending', 'non'),
            p.role::text, p.first_name, p.last_name, p.phone, p.marketing_opt_in
     from auth.users u join public.profiles p on p.user_id = u.id
     where u.id = 'c5600000-0000-4000-8000-000000000004' $$,
  $$ values ('artisan_en_attente'::text, 'non'::text, 'artisan_en_attente'::text, 'Lou'::text, 'Exemple'::text,
             '+33639980057'::text, true) $$,
  'compte artisan en attente, plus à finaliser, nom et téléphone enregistrés');
select results_eq(
  $$ select a.siret, a.assujetti_tva, a.is_dirigeant, a.base_code_insee, a.radius_km::int, a.status::text
     from public.artisans a where a.user_id = 'c5600000-0000-4000-8000-000000000004' $$,
  $$ values ('00000057000010'::text, true, false, '06004'::text, 20, 'brouillon'::text) $$,
  'fiche artisan en brouillon avec les choix du parcours');
select results_eq(
  $$ select t.trade_code from public.artisan_trades t join public.artisans a on a.id = t.artisan_id
     where a.user_id = 'c5600000-0000-4000-8000-000000000004' $$,
  $$ values ('electricien'::text) $$,
  'métier enregistré');
select results_eq(
  $$ select document::text from public.legal_acceptances
     where user_id = 'c5600000-0000-4000-8000-000000000004' order by 1 $$,
  $$ values ('cgu'::text), ('cgv_artisan'), ('confidentialite') $$,
  'acceptations enregistrées');

-- Un compte déjà artisan (ou déjà client) ne passe pas par là.
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"signup_pending":true}'
where id = 'c5600000-0000-4000-8000-000000000004';
select pg_temp.connecter('c5600000-0000-4000-8000-000000000004');
set local role authenticated;
select throws_ok(
  $$ select public.complete_artisan_oauth_signup('Lou', 'Exemple', '+33639980057', false,
       '{"cgu":"v1","confidentialite":"v1","cgv_artisan":"v1"}', '00000058800012', '{}') $$,
  '22023', 'Ce compte ne peut pas devenir un compte professionnel.',
  'refusé pour un compte qui n''est plus un compte particulier tout neuf');
reset role;

select pg_temp.connecter('c5600000-0000-4000-8000-000000000001');
set local role authenticated;
select throws_ok(
  $$ select public.complete_artisan_oauth_signup('Camille', 'Exemple', '+33639980056', false,
       '{"cgu":"v1","confidentialite":"v1","cgv_artisan":"v1"}', '00000058800012', '{}') $$,
  '22023', 'Votre compte est déjà finalisé.', 'refusé pour un compte inscrit par e-mail');
reset role;

-- Compte Apple sans nom : SIRET déjà pris, la fiche est créée sans lui.
select pg_temp.connecter('c5600000-0000-4000-8000-000000000005');
set local role authenticated;
select lives_ok(
  $$ select public.complete_artisan_oauth_signup('Sam', 'Exemple', '+33639980058', false,
       '{"cgu":"v1","confidentialite":"v1","cgv_artisan":"v1"}', '00000056200017', null) $$,
  'finalisation sans choix du parcours');
reset role;
select is((select siret from public.artisans where user_id = 'c5600000-0000-4000-8000-000000000005'),
  null, 'SIRET déjà utilisé non repris');

select * from finish();
rollback;
