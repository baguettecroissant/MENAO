-- Suivi des prospects des commerciaux (F-65, ADR 0206) : base lisible par les seuls commerciaux
-- actifs et les admins, aucune écriture directe, suivi exclusif, mise à jour contrôlée, filtres et
-- « Ma journée », « Ne plus contacter » définitif, import par un admin (double authentification),
-- purge et étape MENAO. Données fictives ; le seed est chargé avant : on ne compte que nos lignes
-- (SIRET 00000107… et 00010700…, identifiants c107…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1070000-0000-4000-8000-000000000001', 'com107.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('c1070000-0000-4000-8000-000000000002', 'com107.julien@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('c1070000-0000-4000-8000-000000000003', 'com107.sami@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('c1070000-0000-4000-8000-000000000004', 'com107.lea@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('c1070000-0000-4000-8000-000000000005', 'com107.artisan1@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c1070000-0000-4000-8000-000000000006', 'com107.artisan2@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c1070000-0000-4000-8000-000000000007', 'com107.artisan3@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c1070000-0000-4000-8000-000000000008', 'com107.client@example.test', false, now(), '{"role":"particulier"}', '{}');

insert into public.commercials (id, user_id, code, nom, status) values
  ('c1071000-0000-4000-8000-000000000001', 'c1070000-0000-4000-8000-000000000002', 'julien-107', 'Julien Exemple', 'actif'),
  ('c1071000-0000-4000-8000-000000000002', 'c1070000-0000-4000-8000-000000000003', 'sami-107', 'Sami Exemple', 'actif'),
  ('c1071000-0000-4000-8000-000000000003', 'c1070000-0000-4000-8000-000000000004', 'lea-107', 'Léa Exemple', 'suspendu');

-- Artisans déjà sur MENAO (autre établissement de la même entreprise que P1, P2 et P3).
insert into public.artisans (id, user_id, siret, raison_sociale, status) values
  ('c1072000-0000-4000-8000-000000000001', 'c1070000-0000-4000-8000-000000000005', '00000107100026', 'PLOMBERIE C107 UN', 'valide'),
  ('c1072000-0000-4000-8000-000000000002', 'c1070000-0000-4000-8000-000000000006', '00000107200024', 'ELEC C107 DEUX', 'valide'),
  ('c1072000-0000-4000-8000-000000000003', 'c1070000-0000-4000-8000-000000000007', '00000107300022', 'MACONNERIE C107 TROIS', 'brouillon');
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('c1072000-0000-4000-8000-000000000001', 'base', 'cus_c107', 'sub_c107', 'active');

insert into public.prospects (id, siret, denomination, enseigne, ape_code, code_postal, commune, code_insee, departement, location, rge) values
  ('c1073000-0000-4000-8000-000000000001', '00000107100018', 'PLOMBERIE C107 UN', null, '43.22A', '20000', 'AJACCIO', '2A004', '2A',
   extensions.st_setsrid(extensions.st_makepoint(8.7369, 41.9192), 4326)::extensions.geography, true),
  ('c1073000-0000-4000-8000-000000000002', '00000107200016', 'ELEC C107 DEUX', null, '43.21A', '20000', 'AJACCIO', '2A004', '2A',
   extensions.st_setsrid(extensions.st_makepoint(8.7401, 41.9265), 4326)::extensions.geography, false),
  ('c1073000-0000-4000-8000-000000000003', '00000107300014', 'MACONNERIE C107 TROIS', 'ENSEIGNE C107 TROIS', '43.99C', '20137',
   'PORTO-VECCHIO', '2A247', '2A', null, false),
  ('c1073000-0000-4000-8000-000000000004', '00000107400012', 'PEINTURE C107 QUATRE', null, '43.34Z', '20137', 'PORTO-VECCHIO',
   '2A247', '2A', null, false),
  ('c1073000-0000-4000-8000-000000000005', '00000107500019', 'CARRELAGE C107 CINQ', null, '43.33Z', '20000', 'AJACCIO', '2A004',
   '2A', null, false);

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Sami suit P4 (rendez-vous manqué hier) ----------
select pg_temp.connecter('c1070000-0000-4000-8000-000000000003', 'commercial');
set local role authenticated;
select lives_ok($$ select public.commercial_follow_prospect('c1073000-0000-4000-8000-000000000004') $$,
  'commercial : suit un prospect libre');
select lives_ok(
  $$ select public.commercial_update_prospect('c1073000-0000-4000-8000-000000000004', 'rdv_pris',
       now() - interval '2 days', null, null) $$,
  'commercial : rendez-vous noté');
reset role;

-- ---------- Julien : lecture directe, suivi et mise à jour ----------
select pg_temp.connecter('c1070000-0000-4000-8000-000000000002', 'commercial');
set local role authenticated;
select is((select count(*)::int from public.prospects where siret like '00000107%'), 5,
  'commercial actif : toute la base de prospects');
select lives_ok($$ select public.commercial_follow_prospect('c1073000-0000-4000-8000-000000000001') $$,
  'suit P1');
select lives_ok($$ select public.commercial_follow_prospect('c1073000-0000-4000-8000-000000000001') $$,
  'déjà le mien : sans effet');
select lives_ok($$ select public.commercial_follow_prospect('c1073000-0000-4000-8000-000000000002') $$, 'suit P2');
select lives_ok($$ select public.commercial_follow_prospect('c1073000-0000-4000-8000-000000000003') $$, 'suit P3');
select throws_ok($$ select public.commercial_follow_prospect('c1073000-0000-4000-8000-000000000004') $$,
  '22023', 'Déjà suivi par un collègue.', 'suivi exclusif : prospect d''un collègue refusé');
select throws_ok($$ select public.commercial_follow_prospect('c1079999-0000-4000-8000-000000000000') $$,
  '22023', 'Prospect introuvable.', 'prospect inconnu');
select is((select count(*)::int from public.prospect_follows), 3, 'commercial : ses seuls suivis');

select throws_ok(
  $$ select public.commercial_update_prospect('c1073000-0000-4000-8000-000000000001', 'rdv_pris', now(),
       '06 00 00 01 07', null) $$,
  '22023', 'Téléphone invalide : format international, par exemple +33612345678.', 'téléphone hors format international');
select throws_ok(
  $$ select public.commercial_update_prospect('c1073000-0000-4000-8000-000000000001', 'rdv_pris', now(),
       null, repeat('a', 2001)) $$,
  '22023', 'Notes trop longues : 2 000 caractères au plus.', 'notes trop longues');
select throws_ok(
  $$ select public.commercial_update_prospect('c1073000-0000-4000-8000-000000000004', 'demo_faite', now(), null, null) $$,
  '22023', 'Suivez d''abord ce prospect.', 'suivi d''un collègue : mise à jour refusée');
select lives_ok(
  $$ select public.commercial_update_prospect('c1073000-0000-4000-8000-000000000001', 'rdv_pris',
       (date_trunc('day', now() at time zone 'Europe/Paris') + interval '12 hours') at time zone 'Europe/Paris',
       '+33 6 00 00 01 07', '  Rappeler après 17 h.  ') $$,
  'P1 : rendez-vous aujourd''hui à midi');
select lives_ok(
  $$ select public.commercial_update_prospect('c1073000-0000-4000-8000-000000000002', 'a_contacter',
       now() - interval '2 days', '', '   ') $$,
  'P2 : relance en retard');
select lives_ok(
  $$ select public.commercial_update_prospect('c1073000-0000-4000-8000-000000000003', 'demo_faite',
       now() + interval '3 days', null, null) $$,
  'P3 : relance dans 3 jours');
select results_eq(
  $$ select phone, notes from public.prospect_follows where prospect_id = 'c1073000-0000-4000-8000-000000000001' $$,
  $$ values ('+33600000107'::text, 'Rappeler après 17 h.'::text) $$,
  'téléphone normalisé, notes nettoyées');
select results_eq(
  $$ select phone, notes from public.prospect_follows where prospect_id = 'c1073000-0000-4000-8000-000000000002' $$,
  $$ values (null::text, null::text) $$,
  'téléphone et notes vides : effacés');

select throws_ok(
  $$ insert into public.prospects (siret, denomination, departement) values ('00000107900011', 'DIRECT C107', '2A') $$,
  '42501', null, 'aucune écriture directe : ajout de prospect');
select throws_ok($$ update public.prospect_follows set notes = 'Note directe' $$, '42501', null,
  'aucune écriture directe : suivi');
select throws_ok($$ delete from public.prospects where siret like '00000107%' $$, '42501', null,
  'aucune écriture directe : suppression');
select throws_ok($$ select 1 from public.prospect_opt_outs $$, '42501', null,
  'liste « ne plus contacter » inaccessible');
select throws_ok($$ select app.prospect_stage('000001071') $$, '42501', null, 'étape MENAO : fonction interne');
select throws_ok($$ select public.admin_import_prospects('[]'::jsonb) $$, '42501', null,
  'commercial : import impossible');
select throws_ok($$ select public.admin_prospects_summary() $$, '42501', null, 'commercial : chiffres admin impossibles');

-- Filtres, tri et total (recherche « c107 » : nos seules lignes).
select results_eq(
  $$ select nom, total from public.commercial_prospects('c107') $$,
  $$ values ('CARRELAGE C107 CINQ'::text, 5::bigint), ('ELEC C107 DEUX', 5), ('PLOMBERIE C107 UN', 5),
            ('ENSEIGNE C107 TROIS', 5), ('PEINTURE C107 QUATRE', 5) $$,
  'tous : par commune puis nom (enseigne d''abord), avec le total');
select results_eq(
  $$ select nom, status::text, mine, followed_by_other from public.commercial_prospects(null, 'miens') $$,
  $$ values ('ELEC C107 DEUX'::text, 'a_contacter'::text, true, false),
            ('PLOMBERIE C107 UN', 'rdv_pris', true, false),
            ('ENSEIGNE C107 TROIS', 'demo_faite', true, false) $$,
  'miens : par prochaine action');
select results_eq(
  $$ select nom from public.commercial_prospects(null, 'relances') $$,
  $$ values ('ELEC C107 DEUX'::text), ('PLOMBERIE C107 UN') $$,
  'relances : prochaine action avant demain (heure de Paris)');
select results_eq(
  $$ select nom, total from public.commercial_prospects('c107', 'libres') $$,
  $$ values ('CARRELAGE C107 CINQ'::text, 1::bigint) $$,
  'libres : aucun suivi');
select results_eq(
  $$ select mine, followed_by_other, status::text, next_action_at from public.commercial_prospects('c107 quatre') $$,
  $$ values (false, true, null::text, null::timestamptz) $$,
  'suivi par un collègue : ni étape ni prochaine action');
select is((select count(*)::int from public.commercial_prospects('c107', 'inconnu')), 5, 'filtre inconnu : tous');
select results_eq(
  $$ select nom, total from public.commercial_prospects('c107', 'tous', 2, 1) $$,
  $$ values ('ELEC C107 DEUX'::text, 5::bigint), ('PLOMBERIE C107 UN', 5) $$,
  'pagination : limite et décalage, total inchangé');
select is((select count(*)::int from public.commercial_prospects('c107', 'tous', 0, -3)), 1, 'limite et décalage bornés');
select results_eq(
  $$ select nom from public.commercial_prospects('2013') $$,
  $$ values ('ENSEIGNE C107 TROIS'::text), ('PEINTURE C107 QUATRE') $$,
  'recherche : début du code postal');
select is((select count(*)::int from public.commercial_prospects('porto-VECCHIO')), 2, 'recherche : commune, casse ignorée');
select results_eq(
  $$ select stage, rge, round(lon::numeric, 4), round(lat::numeric, 4) from public.commercial_prospects('plomberie c107') $$,
  $$ values ('abonne'::text, true, 8.7369, 41.9192) $$,
  'étape MENAO et coordonnées');

select results_eq(
  $$ select nom, siret, mine, status::text, phone, notes, stage
     from public.commercial_prospect('c1073000-0000-4000-8000-000000000001') $$,
  $$ values ('PLOMBERIE C107 UN'::text, '00000107100018'::text, true, 'rdv_pris'::text, '+33600000107'::text,
            'Rappeler après 17 h.'::text, 'abonne'::text) $$,
  'fiche : mon suivi complet');
select is_empty($$ select * from public.commercial_prospect('c1079999-0000-4000-8000-000000000000') $$,
  'fiche inconnue : aucune ligne');
select results_eq(
  $$ select nom, kind from public.commercial_day() $$,
  $$ values ('ELEC C107 DEUX'::text, 'relance'::text), ('PLOMBERIE C107 UN', 'rdv') $$,
  'ma journée : relance en retard puis rendez-vous du jour');
reset role;

-- ---------- Sami : le suivi de Julien lui reste fermé ----------
select pg_temp.connecter('c1070000-0000-4000-8000-000000000003', 'commercial');
set local role authenticated;
select throws_ok($$ select public.commercial_follow_prospect('c1073000-0000-4000-8000-000000000001') $$,
  '22023', 'Déjà suivi par un collègue.', 'collègue : suivi refusé');
select throws_ok(
  $$ select public.commercial_update_prospect('c1073000-0000-4000-8000-000000000001', 'pas_interesse', null, null, null) $$,
  '22023', 'Suivez d''abord ce prospect.', 'collègue : mise à jour refusée');
select lives_ok($$ select public.commercial_release_prospect('c1073000-0000-4000-8000-000000000001') $$,
  'collègue : « ne plus suivre » sans effet');
select results_eq(
  $$ select mine, followed_by_other, status::text, phone, notes
     from public.commercial_prospect('c1073000-0000-4000-8000-000000000001') $$,
  $$ values (false, true, null::text, null::text, null::text) $$,
  'collègue : fiche sans téléphone ni notes');
select is((select count(*)::int from public.prospect_follows), 1, 'collègue : ses seuls suivis');
select results_eq(
  $$ select nom, kind from public.commercial_day() $$,
  $$ values ('PEINTURE C107 QUATRE'::text, 'relance'::text) $$,
  'rendez-vous passé : relance');
reset role;
select is(
  (select commercial_id from public.prospect_follows where prospect_id = 'c1073000-0000-4000-8000-000000000001'),
  'c1071000-0000-4000-8000-000000000001'::uuid, 'le suivi de Julien est intact');

-- ---------- Commercial suspendu, autres rôles, visiteur : rien ----------
select pg_temp.connecter('c1070000-0000-4000-8000-000000000004', 'commercial');
set local role authenticated;
select is_empty($$ select 1 from public.prospects $$, 'commercial suspendu : aucun prospect');
select is_empty($$ select 1 from public.prospect_follows $$, 'commercial suspendu : aucun suivi');
select throws_ok($$ select * from public.commercial_prospects() $$, '42501', null, 'commercial suspendu : liste refusée');
select throws_ok($$ select public.commercial_follow_prospect('c1073000-0000-4000-8000-000000000005') $$, '42501', null,
  'commercial suspendu : suivi refusé');
select throws_ok($$ select * from public.commercial_day() $$, '42501', null, 'commercial suspendu : journée refusée');
select throws_ok($$ select public.commercial_do_not_contact('c1073000-0000-4000-8000-000000000005') $$, '42501', null,
  'commercial suspendu : « ne plus contacter » refusé');
reset role;

select pg_temp.connecter('c1070000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select is_empty($$ select 1 from public.prospects $$, 'jeton sans le rôle commercial : aucun prospect');
select throws_ok($$ select * from public.commercial_prospects() $$, '42501', null,
  'jeton sans le rôle commercial : liste refusée');
reset role;

select pg_temp.connecter('c1070000-0000-4000-8000-000000000005', 'artisan');
set local role authenticated;
select is_empty($$ select 1 from public.prospects $$, 'artisan : aucun prospect');
select is_empty($$ select 1 from public.prospect_follows $$, 'artisan : aucun suivi');
select throws_ok($$ select * from public.commercial_prospect('c1073000-0000-4000-8000-000000000001') $$, '42501', null,
  'artisan : fiche refusée');
select throws_ok(
  $$ select public.commercial_update_prospect('c1073000-0000-4000-8000-000000000001', 'pas_interesse', null, null, null) $$,
  '42501', null, 'artisan : mise à jour refusée');
reset role;

select pg_temp.connecter('c1070000-0000-4000-8000-000000000008', 'particulier');
set local role authenticated;
select is_empty($$ select 1 from public.prospects $$, 'particulier : aucun prospect');
select throws_ok($$ select * from public.commercial_day() $$, '42501', null, 'particulier : journée refusée');
reset role;

set local role anon;
select throws_ok($$ select 1 from public.prospects $$, '42501', null, 'visiteur : aucun accès aux prospects');
select throws_ok($$ select 1 from public.prospect_follows $$, '42501', null, 'visiteur : aucun accès aux suivis');
select throws_ok($$ select * from public.commercial_prospects() $$, '42501', null, 'visiteur : fonction inaccessible');
select throws_ok($$ select public.admin_import_prospects('[]'::jsonb) $$, '42501', null, 'visiteur : import inaccessible');
reset role;

-- ---------- Import par un admin ----------
select pg_temp.connecter('c1070000-0000-4000-8000-000000000001', 'admin', 'aal1');
set local role authenticated;
select throws_ok($$ select public.admin_import_prospects('[]'::jsonb) $$, '42501', null,
  'admin sans double authentification : import impossible');
reset role;

select pg_temp.connecter('c1070000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select is((select count(*)::int from public.prospect_follows
  where prospect_id::text like 'c1073000-%'), 4, 'admin : lit tous les suivis');
select is(
  public.admin_import_prospects($$[
    {"siret": "00010700100018", "denomination": " RENOVATION C107 IMPORT ", "enseigne": "", "ape_code": "43.39Z",
     "nature_juridique": "5499", "date_creation": "2019-03-15", "tranche_effectif": "01",
     "adresse": "1 RUE DE L'EXEMPLE", "code_postal": "20000", "commune": "AJACCIO", "code_insee": "2a004",
     "departement": "2a", "lon": 8.73, "lat": 41.92, "rge": true, "est_siege": true},
    {"siret": "00010700200016", "denomination": "TOITURE C107 IMPORT", "nature_juridique": "54",
     "date_creation": "2023-02-30", "code_postal": "200", "code_insee": "XX", "departement": "2A",
     "lon": 200, "lat": 41.9, "rge": "oui", "tranche_effectif": "TROP LONG"},
    {"siret": "123", "denomination": "SIRET INVALIDE C107", "departement": "2A"},
    {"siret": "00010700300014", "denomination": "  ", "departement": "2A"},
    {"siret": "00010700400012", "denomination": "SANS DEPARTEMENT C107", "departement": "Corse"},
    "pas un objet"
  ]$$::jsonb),
  2, 'import : lignes invalides ignorées');
select throws_ok(
  $$ select public.admin_import_prospects((select jsonb_agg(jsonb_build_object('siret', g::text))
       from generate_series(1, 1001) g)) $$,
  '22023', 'Lot trop gros.', 'lot de plus de 1 000 lignes refusé');
select throws_ok($$ select public.admin_import_prospects('{"siret": "00010700100018"}'::jsonb) $$,
  '22023', 'Lot invalide.', 'lot qui n''est pas un tableau refusé');
reset role;

select results_eq(
  $$ select denomination, enseigne, ape_code, nature_juridique, date_creation, tranche_effectif, code_insee, departement,
       rge, est_siege, round(extensions.st_x(location::extensions.geometry)::numeric, 2),
       round(extensions.st_y(location::extensions.geometry)::numeric, 2)
     from public.prospects where siret = '00010700100018' $$,
  $$ values ('RENOVATION C107 IMPORT'::text, null::text, '43.39Z'::text, '5499'::text, '2019-03-15'::date, '01'::text,
            '2A004'::text, '2A'::text, true, true, 8.73, 41.92) $$,
  'import : fiche complète, textes nettoyés');
select results_eq(
  $$ select nature_juridique, date_creation, code_postal, code_insee, location is null, rge, tranche_effectif
     from public.prospects where siret = '00010700200016' $$,
  $$ values (null::text, null::date, null::text, null::text, true, false, null::text) $$,
  'import : champs facultatifs invalides laissés vides');
select is_empty(
  $$ select 1 from public.prospects where siret in ('00010700300014', '00010700400012') or siret = '123' $$,
  'import : aucune ligne invalide enregistrée');

update public.prospects set seen_at = now() - interval '1 year' where siret = '00010700100018';
select pg_temp.connecter('c1070000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select is(
  public.admin_import_prospects($$[
    {"siret": "00010700100018", "denomination": "RENOVATION C107 NOUVEAU NOM", "departement": "2A"}
  ]$$::jsonb),
  1, 'import : fiche connue mise à jour');
select is(
  public.admin_import_prospects($$[
    {"siret": "00010700200016", "denomination": "TOITURE C107 A", "departement": "2A"},
    {"siret": "00010700200016", "denomination": "TOITURE C107 B", "departement": "2A"}
  ]$$::jsonb),
  1, 'import : même SIRET deux fois dans le lot, une seule écriture');
reset role;
select results_eq(
  $$ select denomination, commune, seen_at = now() from public.prospects where siret = '00010700100018' $$,
  $$ values ('RENOVATION C107 NOUVEAU NOM'::text, null::text, true) $$,
  'mise à jour sur conflit : tous les champs et date de passage');
select is((select denomination from public.prospects where siret = '00010700200016'), 'TOITURE C107 B',
  'même SIRET dans le lot : la dernière ligne l''emporte');

-- ---------- Ne plus suivre, puis ne plus contacter ----------
select pg_temp.connecter('c1070000-0000-4000-8000-000000000002', 'commercial');
set local role authenticated;
select lives_ok($$ select public.commercial_release_prospect('c1073000-0000-4000-8000-000000000003') $$,
  'ne plus suivre P3');
select results_eq(
  $$ select nom from public.commercial_prospects('c107', 'libres') $$,
  $$ values ('CARRELAGE C107 CINQ'::text), ('ENSEIGNE C107 TROIS'), ('RENOVATION C107 NOUVEAU NOM'), ('TOITURE C107 B') $$,
  'prospect relâché : de nouveau libre');
select lives_ok($$ select public.commercial_do_not_contact('c1073000-0000-4000-8000-000000000005') $$,
  'ne plus contacter un prospect libre');
select throws_ok($$ select public.commercial_do_not_contact('c1079999-0000-4000-8000-000000000000') $$,
  '22023', 'Prospect introuvable.', 'ne plus contacter : prospect inconnu');
reset role;
select is_empty(
  $$ select 1 from public.prospect_follows where prospect_id = 'c1073000-0000-4000-8000-000000000003' $$,
  'suivi relâché : supprimé avec ses notes');

select pg_temp.connecter('c1070000-0000-4000-8000-000000000003', 'commercial');
set local role authenticated;
select lives_ok($$ select public.commercial_do_not_contact('c1073000-0000-4000-8000-000000000004') $$,
  'ne plus contacter un prospect que je suis');
reset role;
select is_empty(
  $$ select 1 from public.prospects where siret in ('00000107400012', '00000107500019') $$,
  'ne plus contacter : fiches supprimées');
select is_empty(
  $$ select 1 from public.prospect_follows where prospect_id = 'c1073000-0000-4000-8000-000000000004' $$,
  'ne plus contacter : suivi supprimé');
select results_eq(
  $$ select siren from public.prospect_opt_outs where siren like '00000107%' order by siren $$,
  $$ values ('000001074'::text), ('000001075') $$,
  'ne plus contacter : seul le SIREN est gardé');

select pg_temp.connecter('c1070000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select is(
  public.admin_import_prospects($$[
    {"siret": "00000107400012", "denomination": "PEINTURE C107 QUATRE", "departement": "2A"}
  ]$$::jsonb),
  0, 'réimport d''une entreprise « ne plus contacter » : ignoré');
reset role;
select is_empty($$ select 1 from public.prospects where siret = '00000107400012' $$,
  'ne plus contacter : la fiche ne revient pas');

-- ---------- Chiffres du back-office et journal ----------
select pg_temp.connecter('c1070000-0000-4000-8000-000000000001', 'admin');
select is(
  (select (e ->> 'count')::int
   from jsonb_array_elements(public.admin_prospects_summary() -> 'by_departement') e
   where e ->> 'departement' = '2A'),
  (select count(*)::int from public.prospects where departement = '2A'),
  'chiffres : prospects par département');
select is((public.admin_prospects_summary() ->> 'opt_outs')::int,
  (select count(*)::int from public.prospect_opt_outs), 'chiffres : « ne plus contacter »');
select is((public.admin_prospects_summary() ->> 'followed')::int,
  (select count(*)::int from public.prospect_follows), 'chiffres : prospects suivis');
select results_eq(
  $$ select (data ->> 'count')::int, target_id from public.audit_logs where action = 'prospects.import'
     order by (data ->> 'count')::int desc $$,
  $$ values (2, null::uuid), (1, null), (1, null), (0, null) $$,
  'imports journalisés avec le nombre de lignes');

-- ---------- Purge ----------
insert into public.prospects (id, siret, denomination, departement, seen_at) values
  ('c1073000-0000-4000-8000-000000000006', '00000107600017', 'ANCIEN C107 SIX', '2A', now() - interval '14 months'),
  ('c1073000-0000-4000-8000-000000000007', '00000107700015', 'ANCIEN C107 SEPT', '2A', now() - interval '14 months'),
  ('c1073000-0000-4000-8000-000000000008', '00000107800013', 'ANCIEN C107 HUIT', '2A', now() - interval '14 months'),
  ('c1073000-0000-4000-8000-000000000009', '00000107900011', 'RECENT C107 NEUF', '2A', now() - interval '1 month');
insert into public.prospect_follows (prospect_id, commercial_id, created_at, updated_at) values
  ('c1073000-0000-4000-8000-000000000007', 'c1071000-0000-4000-8000-000000000001',
   now() - interval '4 years', now() - interval '4 years'),
  ('c1073000-0000-4000-8000-000000000008', 'c1071000-0000-4000-8000-000000000001',
   now() - interval '1 year', now() - interval '1 year');
select lives_ok($$ select app.purge_prospects() $$, 'purge');
select results_eq(
  $$ select siret from public.prospects
     where siret in ('00000107600017', '00000107700015', '00000107800013', '00000107900011') order by siret $$,
  $$ values ('00000107800013'::text), ('00000107900011') $$,
  'purge : fiches non revues depuis 13 mois et sans suivi supprimées');
select results_eq(
  $$ select prospect_id from public.prospect_follows where prospect_id::text like 'c1073000-%' order by prospect_id $$,
  $$ values ('c1073000-0000-4000-8000-000000000001'::uuid), ('c1073000-0000-4000-8000-000000000002'),
            ('c1073000-0000-4000-8000-000000000008') $$,
  'purge : seuls les suivis inactifs depuis 3 ans disparaissent');

-- ---------- Étape MENAO ----------
select is(app.prospect_stage('000001071'), 'abonne', 'étape : abonnement en cours');
select is(app.prospect_stage('000001072'), 'valide', 'étape : artisan validé sans abonnement');
select is(app.prospect_stage('000001073'), 'inscrit', 'étape : fiche artisan en cours');
select is(app.prospect_stage('000001075'), null, 'étape : entreprise absente de MENAO');
update public.subscriptions set status = 'canceled' where artisan_id = 'c1072000-0000-4000-8000-000000000001';
select is(app.prospect_stage('000001071'), 'valide', 'étape : abonnement résilié, artisan toujours validé');

select * from finish();
rollback;
