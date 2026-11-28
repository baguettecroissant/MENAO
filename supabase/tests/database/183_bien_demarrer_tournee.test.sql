-- Espace des conseillers, « Bien démarrer » et tournée (F-194, lot 83, ADR 0394) : lecture de son
-- seul état, aucune écriture directe, RSAC et quiz contrôlés, contrat confirmé par un admin
-- (double authentification), rappel Urssaf une fois par dépôt, pièces privées par dossier ;
-- prospects d'une tournée (rayon, métier, libres, zone), suivi ouvert puis rendu, suite des visites,
-- tournée d'un collègue invisible. Données fictives (SIRET 00000183…, identifiants c183…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1830000-0000-4000-8000-000000000001', 'c183.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('c1830000-0000-4000-8000-000000000002', 'c183.sarah@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('c1830000-0000-4000-8000-000000000003', 'c183.ines@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('c1830000-0000-4000-8000-000000000004', 'c183.client@example.test', false, now(), '{"role":"particulier"}', '{}');

insert into public.commercials (id, user_id, code, nom, status, zone_codes_postaux) values
  ('c1831000-0000-4000-8000-000000000001', 'c1830000-0000-4000-8000-000000000002', 'sarah-183', 'Sarah Exemple', 'actif', '{"063"}'),
  ('c1831000-0000-4000-8000-000000000002', 'c1830000-0000-4000-8000-000000000003', 'ines-183', 'Inès Exemple', 'actif', '{}');

-- Autour de la place Garibaldi (Nice) : P1 plombier à 110 m, P2 électricien à 220 m, P3 plombier
-- à 9 km, P4 plombier hors de la zone de Sarah (06100), P5 plombier suivi par Inès.
insert into public.prospects (id, siret, denomination, ape_code, code_postal, commune, departement, location) values
  ('c1833000-0000-4000-8000-000000000001', '00000183100011', 'PLOMBERIE C183 UN', '43.22A', '06300', 'NICE', '06',
   extensions.st_setsrid(extensions.st_makepoint(7.28, 43.701), 4326)::extensions.geography),
  ('c1833000-0000-4000-8000-000000000002', '00000183200019', 'ELEC C183 DEUX', '43.21A', '06300', 'NICE', '06',
   extensions.st_setsrid(extensions.st_makepoint(7.28, 43.702), 4326)::extensions.geography),
  ('c1833000-0000-4000-8000-000000000003', '00000183300017', 'PLOMBERIE C183 TROIS', '43.22A', '06300', 'NICE', '06',
   extensions.st_setsrid(extensions.st_makepoint(7.28, 43.781), 4326)::extensions.geography),
  ('c1833000-0000-4000-8000-000000000004', '00000183400015', 'PLOMBERIE C183 QUATRE', '43.22A', '06100', 'NICE', '06',
   extensions.st_setsrid(extensions.st_makepoint(7.281, 43.7005), 4326)::extensions.geography),
  ('c1833000-0000-4000-8000-000000000005', '00000183500012', 'PLOMBERIE C183 CINQ', '43.22A', '06300', 'NICE', '06',
   extensions.st_setsrid(extensions.st_makepoint(7.2805, 43.7008), 4326)::extensions.geography);
insert into public.prospect_follows (prospect_id, commercial_id) values
  ('c1833000-0000-4000-8000-000000000005', 'c1831000-0000-4000-8000-000000000002');

-- Pièces : une de Sarah, une d'Inès.
insert into storage.objects (bucket_id, name) values
  ('commercial-documents', 'c1831000-0000-4000-8000-000000000001/urssaf.pdf'),
  ('commercial-documents', 'c1831000-0000-4000-8000-000000000002/urssaf.pdf');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

select has_table('public', 'commercial_onboarding', 'table de l''arrivée des conseillers');
select has_table('public', 'commercial_tours', 'table des tournées');
select ok((select relrowsecurity from pg_class where oid = 'public.commercial_onboarding'::regclass), 'RLS : arrivée');
select ok((select relrowsecurity from pg_class where oid = 'public.commercial_formation_results'::regclass), 'RLS : quiz');
select ok((select relrowsecurity from pg_class where oid = 'public.commercial_tours'::regclass), 'RLS : tournées');
select ok((select relrowsecurity from pg_class where oid = 'public.commercial_tour_stops'::regclass), 'RLS : arrêts');

-- ---------- Sarah : Bien démarrer ----------
select pg_temp.connecter('c1830000-0000-4000-8000-000000000002', 'commercial');
set local role authenticated;
select is((public.commercial_onboarding_state() ->> 'rappels')::boolean, true, 'rappels par e-mail activés par défaut');
select is(public.commercial_onboarding_state() -> 'modules', '{}'::jsonb, 'aucun quiz au départ');
select throws_ok($$ select public.commercial_save_rsac('12') $$, '22023',
  'Numéro RSAC : entre 3 et 40 caractères.', 'RSAC trop court refusé');
select lives_ok($$ select public.commercial_save_rsac('  2027   AC 00042 ', 'Nice') $$, 'RSAC enregistré');
select is(public.commercial_onboarding_state() ->> 'rsac_numero', '2027 AC 00042', 'RSAC : espaces resserrés');
select lives_ok($$ select public.commercial_save_formation('menao', 3) $$, 'quiz raté noté');
select lives_ok($$ select public.commercial_save_formation('menao', 5) $$, 'quiz réussi');
select lives_ok($$ select public.commercial_save_formation('menao', 2) $$, 'nouvel essai moins bon');
select is((public.commercial_onboarding_state() -> 'modules' ->> 'menao')::int, 5, 'meilleure note gardée');
select throws_ok($$ select public.commercial_save_formation('inconnu', 5) $$, '22023', 'Module inconnu.', 'module inconnu');
select throws_ok($$ select public.commercial_save_formation('offre', 6) $$, '22023', 'Note : entre 0 et 5.', 'note hors bornes');
select lives_ok($$ select public.commercial_mark_home_screen() $$, 'icône sur l''écran d''accueil');
select lives_ok($$ select public.commercial_mark_badge_seen() $$, 'badge vu');
select isnt(public.commercial_onboarding_state() ->> 'ecran_installe_le', null, 'date de l''icône gardée');
select throws_ok($$ insert into public.commercial_onboarding (commercial_id, contrat_signe_le)
  values ('c1831000-0000-4000-8000-000000000001', current_date) on conflict (commercial_id) do update set contrat_signe_le = current_date $$,
  '42501', null, 'aucune écriture directe : le conseiller ne confirme pas son contrat');
select throws_ok($$ select public.admin_set_commercial_contract('c1831000-0000-4000-8000-000000000001', current_date) $$,
  '42501', null, 'confirmation du contrat réservée aux admins');
select throws_ok($$ select public.admin_commercials_onboarding() $$, '42501', null, 'vue d''équipe réservée aux admins');
select is((select count(*)::int from storage.objects where bucket_id = 'commercial-documents'), 1,
  'pièces : son seul dossier');
reset role;

-- ---------- Inès ne voit rien de Sarah ----------
select pg_temp.connecter('c1830000-0000-4000-8000-000000000003', 'commercial');
set local role authenticated;
select is((select count(*)::int from public.commercial_onboarding), 0, 'arrivée d''un collègue invisible');
select is((select count(*)::int from public.commercial_formation_results), 0, 'quiz d''un collègue invisibles');
reset role;

-- ---------- Un particulier ----------
select pg_temp.connecter('c1830000-0000-4000-8000-000000000004', 'particulier');
set local role authenticated;
select throws_ok($$ select public.commercial_onboarding_state() $$, '42501', null, 'particulier : refusé');
select is((select count(*)::int from storage.objects where bucket_id = 'commercial-documents'), 0,
  'particulier : aucune pièce');
reset role;

-- ---------- Admin : contrat et vue d'équipe ----------
select pg_temp.connecter('c1830000-0000-4000-8000-000000000001', 'admin', 'aal1');
set local role authenticated;
select throws_ok($$ select public.admin_set_commercial_contract('c1831000-0000-4000-8000-000000000001', current_date) $$,
  '42501', null, 'admin sans double authentification : refusé');
reset role;
select pg_temp.connecter('c1830000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select throws_ok($$ select public.admin_set_commercial_contract('c1831000-0000-4000-8000-000000000001', current_date + 3) $$,
  '22023', 'Date de signature invalide.', 'date à venir refusée');
select lives_ok($$ select public.admin_set_commercial_contract('c1831000-0000-4000-8000-000000000001', current_date - 2) $$,
  'contrat confirmé');
select is(
  (select (e -> 'state' ->> 'contrat_signe_le')::date from jsonb_array_elements(public.admin_commercials_onboarding()) e
   where e ->> 'id' = 'c1831000-0000-4000-8000-000000000001'),
  current_date - 2, 'vue d''équipe : date du contrat');
select is((select count(*)::int from storage.objects where bucket_id = 'commercial-documents'), 2, 'admin : toutes les pièces');
reset role;

-- ---------- Rappel Urssaf ----------
update public.commercial_onboarding set urssaf_deposee_le = '2027-01-04'
where commercial_id = 'c1831000-0000-4000-8000-000000000001';
select is(app.send_urssaf_reminders('2027-06-18 10:00+02'), 0, 'Urssaf : pas encore de rappel 16 jours avant');
select is(app.send_urssaf_reminders('2027-06-19 10:00+02'), 1, 'Urssaf : rappel 15 jours avant');
select is(app.send_urssaf_reminders('2027-06-25 10:00+02'), 0, 'Urssaf : un seul rappel par dépôt');
select is((select data ->> 'expire_le' from public.notifications
  where user_id = 'c1830000-0000-4000-8000-000000000002' and type = 'conseiller_urssaf' limit 1), '2027-07-04',
  'rappel : date de fin de l''attestation');

-- ---------- Tournée de Sarah ----------
select pg_temp.connecter('c1830000-0000-4000-8000-000000000002', 'commercial');
set local role authenticated;
select is(
  array(select id::text from public.commercial_tour_candidates(43.7, 7.28, '{"43.22A","4322A"}', 2000)),
  array['c1833000-0000-4000-8000-000000000001'],
  'candidats : plombiers libres de ma zone dans le rayon (ni l''électricien, ni le lointain, ni hors zone, ni celui d''Inès)');
select throws_ok($$ select * from public.commercial_tour_candidates(43.7, 7.28, '{}', 2000) $$, '22023',
  'Choisissez au moins un métier.', 'sans métier : refusé');
select throws_ok($$ select * from public.commercial_tour_candidates(null, 7.28, '{"43.22A"}', 2000) $$, '22023',
  'Point de départ invalide.', 'sans point de départ : refusé');
select throws_ok($$ select public.commercial_start_tour('{"c1833000-0000-4000-8000-000000000005"}', '{"plombiers"}', 'court', 300) $$,
  '22023', 'Ces prospects ne sont plus libres.', 'tournée avec le seul prospect d''un collègue : refusée');
select lives_ok($$ select public.commercial_start_tour(
  '{"c1833000-0000-4000-8000-000000000002","c1833000-0000-4000-8000-000000000001","c1833000-0000-4000-8000-000000000005"}',
  '{"plombiers","electriciens"}', 'court', 330) $$, 'tournée commencée, le prospect d''Inès ignoré');
select is((select count(*)::int from public.commercial_tour_stops), 2, 'deux arrêts');
select is((select count(*)::int from public.prospect_follows), 2, 'les deux arrêts sont suivis par moi');
select is(
  (select jsonb_array_length(public.commercial_tour(t.id) -> 'stops') from public.commercial_tours t where t.status = 'en_cours'),
  2, 'lecture de la tournée et de ses arrêts');
select throws_ok($$ select public.commercial_tour_outcome(
  (select id from public.commercial_tours where status = 'en_cours'), 'c1833000-0000-4000-8000-000000000001', 'a_rappeler', null) $$,
  '22023', 'Date de relance invalide.', 'à rappeler sans date : refusé');
select lives_ok($$ select public.commercial_tour_outcome(
  (select id from public.commercial_tours where status = 'en_cours'), 'c1833000-0000-4000-8000-000000000001', 'interesse', null) $$,
  'P1 intéressé');
select is((select status::text from public.prospect_follows where prospect_id = 'c1833000-0000-4000-8000-000000000001'),
  'demo_faite', 'intéressé : démo faite');
select lives_ok($$ select public.commercial_tour_outcome(
  (select id from public.commercial_tours where status = 'en_cours'), 'c1833000-0000-4000-8000-000000000001', 'absent',
  now() + interval '7 days') $$, 'corrigé en absent');
select is((select status::text from public.prospect_follows where prospect_id = 'c1833000-0000-4000-8000-000000000001'),
  'a_contacter', 'absent : à contacter');
select isnt((select next_action_at from public.prospect_follows where prospect_id = 'c1833000-0000-4000-8000-000000000001'),
  null, 'absent : relance prévue');
select lives_ok($$ select public.commercial_end_tour((select id from public.commercial_tours where status = 'en_cours')) $$,
  'tournée terminée');
select is((select count(*)::int from public.prospect_follows where prospect_id = 'c1833000-0000-4000-8000-000000000002'), 0,
  'arrêt non visité : suivi rendu');
select is((select count(*)::int from public.prospect_follows where prospect_id = 'c1833000-0000-4000-8000-000000000001'), 1,
  'arrêt visité : suivi gardé');
select throws_ok($$ select public.commercial_tour_outcome(
  (select id from public.commercial_tours limit 1), 'c1833000-0000-4000-8000-000000000001', 'interesse', null) $$,
  'P0002', null, 'tournée terminée : plus de suite modifiable');
reset role;

-- ---------- Inès ne voit pas la tournée de Sarah ----------
select pg_temp.connecter('c1830000-0000-4000-8000-000000000003', 'commercial');
set local role authenticated;
select is((select count(*)::int from public.commercial_tours), 0, 'tournée d''un collègue invisible');
select is((select public.commercial_tour(t.id) from (select 'c1839999-0000-4000-8000-000000000000'::uuid as id) t), null,
  'tournée inconnue : rien');
reset role;

-- ---------- Purge ----------
update public.commercial_tours set ended_at = now() - interval '14 months';
select is(app.purge_commercial_tours(), 1, 'purge : tournée de plus de 13 mois');

select * from finish();
rollback;
