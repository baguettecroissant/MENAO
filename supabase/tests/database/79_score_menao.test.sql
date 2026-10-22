-- Score MENAO sur 100 (ADR 0155) : mêmes exemples que `menaoScore` (@menao/core) ; diplôme déclaré
-- par l'artisan ; avis Google saisis par un admin, journalisés ; date de création Sirene ; score
-- publié sur la fiche, dans les résultats et pour l'artisan connecté. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c7900000-0000-4000-8000-000000000001', 'score79.artisan@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c7900000-0000-4000-8000-000000000002', 'score79.brouillon@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c7900000-0000-4000-8000-000000000003', 'score79.admin@example.test', false, now(), '{"role":"admin"}', '{}');

-- Nouveau plombier sérieux : vérifié, 12 ans d'expérience, photo, 3 réalisations, présentation
-- développée, ni spécialité ni certification (fiche à 80 %), aucune demande, aucun avis.
insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, assujetti_tva, sirene_checked_at, sirene_active,
  decennale_non_soumis, experience_years, presentation, connect_charges_enabled)
values
  ('c7910000-0000-4000-8000-000000000001', 'c7900000-0000-4000-8000-000000000001', 'valide',
   '00000079100012', 'SCORE EXEMPLE', '5710', '1 RUE DE L''EXEMPLE', '06000', 'NICE', 'communes', true, now(), true,
   true, 12, repeat('Plomberie et chauffage à Nice. ', 12), true),
  ('c7910000-0000-4000-8000-000000000002', 'c7900000-0000-4000-8000-000000000002', 'brouillon',
   '00000079200010', 'BROUILLON EXEMPLE', '5710', '2 RUE DE L''EXEMPLE', '06000', 'NICE', 'communes', true, now(), true,
   false, null, null, false);
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, status, date_emission, date_fin)
values
  ('c7910000-0000-4000-8000-000000000001', 'rc_pro', 'c79/rc_pro.pdf', 'application/pdf', 1000, 'valide', null, current_date + 200),
  ('c7910000-0000-4000-8000-000000000001', 'urssaf', 'c79/urssaf.pdf', 'application/pdf', 1000, 'valide', current_date - 10, null);
update public.profiles set avatar_path = 'c7900000-0000-4000-8000-000000000001/a.jpg'
where user_id = 'c7900000-0000-4000-8000-000000000001';
insert into public.artisan_photos (artisan_id, storage_path)
select 'c7910000-0000-4000-8000-000000000001', 'c79/p' || n || '.jpg' from generate_series(1, 3) n;

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;
create function pg_temp.score() returns smallint language sql as $$
  select score from app.artisan_menao_score('c7910000-0000-4000-8000-000000000001')
$$;

-- ---------- Diplôme déclaré par l'artisan ----------
select pg_temp.connecter('c7900000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select throws_ok($$ select public.set_artisan_diploma('doctorat') $$, '22023', 'Diplôme inconnu.', 'diplôme inconnu refusé');
select lives_ok($$ select public.set_artisan_diploma('bts') $$, 'diplôme enregistré');
select lives_ok($$ select public.set_artisan_diploma('') $$, 'diplôme retiré');
select lives_ok($$ select public.set_artisan_diploma('cap') $$, 'CAP déclaré');
select throws_ok($$ update public.artisans set google_rating = 5 where id = app.my_artisan_id() $$, '42501', null,
  'l''artisan ne modifie pas ses avis Google');
reset role;
select is((select diplome_metier::text from public.artisans where id = 'c7910000-0000-4000-8000-000000000001'), 'cap',
  'CAP enregistré');

-- ---------- Barème : nouveau plombier sérieux ----------
select ok(app.artisan_verified_badge('c7910000-0000-4000-8000-000000000001'), 'badge « Assuré et vérifié »');
select results_eq(
  $$ select score, verifie, experience, diplomes, profil, reactivite, avis, profil_pct
     from app.artisan_menao_score('c7910000-0000-4000-8000-000000000001') $$,
  $$ values (74::smallint, 20::numeric, 10::numeric, 5::numeric, 8.0::numeric, 7.0::numeric, 24.0::numeric, 80) $$,
  'nouveau sérieux : 20 + 10 + 5 + 8 + 7 + 24 = 74');
select is((select profil_pct from app.artisan_menao_score('c7910000-0000-4000-8000-000000000001')),
  80, 'même jauge que « Fiche complète » (profileStrength)');

-- Ancienneté : la plus grande valeur entre les années déclarées et l'âge de l'entreprise.
update public.artisans set experience_years = 1, date_creation_entreprise = current_date - interval '6 years'
where id = 'c7910000-0000-4000-8000-000000000001';
select is((select experience from app.artisan_menao_score('c7910000-0000-4000-8000-000000000001')), 8::numeric,
  'entreprise créée il y a 6 ans : 8 points');
update public.artisans set experience_years = 12, date_creation_entreprise = null
where id = 'c7910000-0000-4000-8000-000000000001';

-- ---------- Avis Google saisis par un admin ----------
select pg_temp.connecter('c7900000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select throws_ok(
  $$ select public.admin_set_google_reviews('c7910000-0000-4000-8000-000000000001', 'https://maps.app.goo.gl/x', 5, 10) $$,
  '42501', null, 'saisie des avis Google réservée aux admins');
reset role;
select pg_temp.connecter('c7900000-0000-4000-8000-000000000003', 'admin');
set local role authenticated;
select throws_ok(
  $$ select public.admin_set_google_reviews('c7910000-0000-4000-8000-000000000001', 'https://exemple.test/fiche', 4.7, 38) $$,
  '22023', 'Indiquez le lien de la fiche Google de l''entreprise.', 'lien hors Google refusé');
select throws_ok(
  $$ select public.admin_set_google_reviews('c7910000-0000-4000-8000-000000000001', 'https://maps.app.goo.gl/x', 6, 38) $$,
  '22023', 'Note Google entre 1 et 5.', 'note hors bornes refusée');
select lives_ok(
  $$ select public.admin_set_google_reviews('c7910000-0000-4000-8000-000000000001', 'https://maps.app.goo.gl/abc123', 4.7, 38) $$,
  'avis Google saisis');
reset role;
select is(pg_temp.score(), 88::smallint, 'avec une fiche Google à 4,7 sur 5 : 88');
select is((select count(*)::int from public.audit_logs where action = 'avis_google.saisis'
           and target_id = 'c7910000-0000-4000-8000-000000000001'), 1, 'saisie journalisée');

-- Avis MENAO : poids n / (n + 5) ; 20 avis à 4,8 (96 %) sur une base Google de 4,5 : 37,9 points.
select pg_temp.connecter('c7900000-0000-4000-8000-000000000003', 'admin');
set local role authenticated;
select lives_ok(
  $$ select public.admin_set_google_reviews('c7910000-0000-4000-8000-000000000001', 'https://www.google.com/maps/place/x', 4.5, 12) $$,
  'avis Google mis à jour');
reset role;
insert into public.artisan_scores (artisan_id, review_count, quality, delays, communication, value_for_money, global_score)
values ('c7910000-0000-4000-8000-000000000001', 20, 96, 96, 96, 96, 96);
select is((select avis from app.artisan_menao_score('c7910000-0000-4000-8000-000000000001')), 37.9::numeric,
  '20 avis MENAO à 4,8 et Google à 4,5 : 37,9 sur 40');

select pg_temp.connecter('c7900000-0000-4000-8000-000000000003', 'admin');
set local role authenticated;
select lives_ok($$ select public.admin_set_google_reviews('c7910000-0000-4000-8000-000000000001', '', null, null) $$,
  'avis Google retirés');
reset role;
select results_eq(
  $$ select google_url, google_rating, google_checked_at from public.artisans where id = 'c7910000-0000-4000-8000-000000000001' $$,
  $$ values (null::text, null::numeric, null::timestamptz) $$, 'plus aucune donnée Google');
delete from public.artisan_scores where artisan_id = 'c7910000-0000-4000-8000-000000000001';

-- ---------- Publication ----------
select is((app.artisan_profile_json('c7910000-0000-4000-8000-000000000001') #>> '{menao_score,score}')::int, 74,
  'fiche : Score MENAO');
select is(app.artisan_profile_json('c7910000-0000-4000-8000-000000000001') ->> 'diplome', 'cap',
  'fiche : diplôme déclaré');
select is(app.artisan_profile_json('c7910000-0000-4000-8000-000000000001') -> 'google', 'null'::jsonb,
  'fiche : pas d''avis Google sans saisie de l''équipe');
select pg_temp.connecter('c7900000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select is((public.my_menao_score() ->> 'score')::int, 74, 'artisan connecté : son score');
select is((public.my_menao_score() #>> '{facts,diplome}')::boolean, true, 'artisan connecté : faits pour les conseils');
reset role;
select ok('menao_score' = any (select unnest(proargnames) from pg_proc where proname = 'match_artisans'),
  'résultats : Score MENAO renvoyé aux cartes');

-- ---------- Date de création Sirene ----------
select lives_ok(
  $$ select public.record_sirene_result('c7910000-0000-4000-8000-000000000002', '00000079200010',
       '{"active": true, "raisonSociale": "BROUILLON EXEMPLE", "dateCreation": "2010-05-04", "adresse": {}}'::jsonb) $$,
  'résultat Sirene enregistré');
select is((select date_creation_entreprise from public.artisans where id = 'c7910000-0000-4000-8000-000000000002'),
  '2010-05-04'::date, 'date de création enregistrée');
select pg_temp.connecter('c7900000-0000-4000-8000-000000000002', 'artisan_en_attente');
set local role authenticated;
update public.artisans set siret = '00000079100020' where id = 'c7910000-0000-4000-8000-000000000002';
reset role;
select is((select date_creation_entreprise from public.artisans where id = 'c7910000-0000-4000-8000-000000000002'),
  null::date, 'nouveau SIRET : la date de création ne vaut plus');

select * from finish();
rollback;
