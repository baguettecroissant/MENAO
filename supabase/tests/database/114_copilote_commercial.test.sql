-- Copilote du commercial (F-74, ADR 0223) : contexte envoyé à l'IA (suivi exigé, aucune
-- coordonnée), demande de la zone d'un prospect, fiche de préparation et comptes rendus (lecture
-- par le commercial qui suit seulement, aucune écriture directe, contrôles), suppression avec le
-- suivi, journal ai_runs. Données fictives ; on ne compte que nos lignes (SIRET 00000114…,
-- identifiants c114…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1140000-0000-4000-8000-000000000001', 'cop114.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('c1140000-0000-4000-8000-000000000002', 'cop114.julien@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('c1140000-0000-4000-8000-000000000003', 'cop114.sami@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('c1140000-0000-4000-8000-000000000004', 'cop114.lea@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('c1140000-0000-4000-8000-000000000005', 'cop114.artisan@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c1140000-0000-4000-8000-000000000006', 'cop114.client@example.test', false, now(), '{"role":"particulier"}', '{}');

insert into public.commercials (id, user_id, code, nom, status) values
  ('c1141000-0000-4000-8000-000000000001', 'c1140000-0000-4000-8000-000000000002', 'julien-114', 'Julien Exemple', 'actif'),
  ('c1141000-0000-4000-8000-000000000002', 'c1140000-0000-4000-8000-000000000003', 'sami-114', 'Sami Exemple', 'actif'),
  ('c1141000-0000-4000-8000-000000000003', 'c1140000-0000-4000-8000-000000000004', 'lea-114', 'Léa Exemple', 'suspendu');

-- P1 : plombier localisé à Antibes ; P2 : peintre sans position (commune seulement) ; P3 : libre.
insert into public.prospects (id, siret, denomination, enseigne, ape_code, code_postal, commune, code_insee, departement, location, rge) values
  ('c1143000-0000-4000-8000-000000000001', '00000114100014', 'PLOMBERIE C114 UN', 'C114 PLOMBERIE', '43.22A', '06600', 'ANTIBES',
   '06004', '06', extensions.st_setsrid(extensions.st_makepoint(7.12, 43.58), 4326)::extensions.geography, true),
  ('c1143000-0000-4000-8000-000000000002', '00000114200012', 'PEINTURE C114 DEUX', null, '43.34Z', '06110', 'LE CANNET', '06030',
   '06', null, false),
  ('c1143000-0000-4000-8000-000000000003', '00000114300010', 'MACONNERIE C114 TROIS', null, '43.99C', '06600', 'ANTIBES',
   '06004', '06', null, false);

insert into public.prospect_follows (prospect_id, commercial_id, status, phone, notes) values
  ('c1143000-0000-4000-8000-000000000001', 'c1141000-0000-4000-8000-000000000001', 'a_contacter', '+33600001141', 'Rencontré au salon.'),
  ('c1143000-0000-4000-8000-000000000002', 'c1141000-0000-4000-8000-000000000001', 'rdv_pris', null, null);

update public.profiles set first_name = 'Julien' where user_id = 'c1140000-0000-4000-8000-000000000002';

-- Recherches : 3 de plombier à moins de 20 km d'Antibes (dont une de 40 jours), 1 trop loin, 1 de
-- peintre au Cannet sans position précise, 1 de peintre ailleurs.
insert into public.projects (user_id, description, trade_code, ville_code_insee, ville_nom, ville_location, created_at)
select 'c1140000-0000-4000-8000-000000000006', 'Recherche fictive', v.metier, v.insee, v.ville,
  extensions.st_setsrid(extensions.st_makepoint(v.lon, v.lat), 4326)::extensions.geography,
  now() - make_interval(days => v.jours)
from (values
  ('plombier', '06004', 'Antibes', 7.12, 43.58, 2),
  ('plombier', '06029', 'Cannes', 7.01, 43.55, 10),
  ('plombier', '06004', 'Antibes', 7.12, 43.58, 40),
  ('plombier', '06088', 'Nice', 7.42, 43.80, 3),
  ('peintre', '06030', 'Le Cannet', 7.02, 43.57, 5),
  ('peintre', '06088', 'Nice', 7.26, 43.70, 5)
) as v (metier, insee, ville, lon, lat, jours);

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal2', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Julien : contexte et demande ----------
select pg_temp.connecter('c1140000-0000-4000-8000-000000000002', 'commercial');
set local role authenticated;

select is(
  (public.commercial_copilot_context('c1143000-0000-4000-8000-000000000001') ->> 'nom'),
  'C114 PLOMBERIE',
  'contexte : enseigne du prospect suivi');
select is(
  (public.commercial_copilot_context('c1143000-0000-4000-8000-000000000001') ->> 'prenom'),
  'Julien',
  'contexte : prénom du commercial');
select is(
  (public.commercial_copilot_context('c1143000-0000-4000-8000-000000000001') ->> 'notes'),
  'Rencontré au salon.',
  'contexte : mes notes');
select ok(
  not (public.commercial_copilot_context('c1143000-0000-4000-8000-000000000001')::jsonb ?| array['phone', 'telephone', 'siret', 'adresse']),
  'contexte : ni téléphone, ni SIRET, ni adresse');
select throws_ok(
  $$ select public.commercial_copilot_context('c1143000-0000-4000-8000-000000000003') $$,
  '22023', 'Suivez d''abord ce prospect.', 'contexte : prospect non suivi refusé');

select is(
  public.commercial_prospect_demand('c1143000-0000-4000-8000-000000000001', array['plombier'], 20, 30),
  2,
  'demande : recherches du métier à moins de 20 km ces 30 jours');
select is(
  public.commercial_prospect_demand('c1143000-0000-4000-8000-000000000002', array['peintre'], 20, 30),
  1,
  'demande : sans position, recherches de la commune');
select is(
  public.commercial_prospect_demand('c1143000-0000-4000-8000-000000000001', '{}', 20, 30),
  0,
  'demande : aucun métier probable, zéro');
select throws_ok(
  $$ select public.commercial_prospect_demand('c1143000-0000-4000-8000-000000000001', array['plombier'], 500, 30) $$,
  '22023', 'Paramètres invalides.', 'demande : rayon hors bornes refusé');
select throws_ok(
  $$ select public.commercial_prospect_demand('c1143000-0000-4000-8000-000000000003', array['macon'], 20, 30) $$,
  '22023', 'Suivez d''abord ce prospect.', 'demande : prospect non suivi refusé');

-- ---------- Julien : fiche de préparation ----------
select lives_ok(
  $$ select public.commercial_save_brief('c1143000-0000-4000-8000-000000000001', '{"v":1,"portrait":"Premier jet"}') $$,
  'fiche enregistrée');
select lives_ok(
  $$ select public.commercial_save_brief('c1143000-0000-4000-8000-000000000001', '{"v":1,"portrait":"Seconde version"}') $$,
  'fiche régénérée : remplace la précédente');
select is(
  (select content ->> 'portrait' from public.prospect_briefs where prospect_id = 'c1143000-0000-4000-8000-000000000001'),
  'Seconde version',
  'fiche : la dernière seulement');
select throws_ok(
  $$ select public.commercial_save_brief('c1143000-0000-4000-8000-000000000001', '[1, 2]') $$,
  '22023', 'Fiche invalide.', 'fiche : contenu qui n''est pas un objet refusé');
select throws_ok(
  $$ insert into public.prospect_briefs (prospect_id, content) values ('c1143000-0000-4000-8000-000000000002', '{}') $$,
  '42501', null, 'fiche : aucune écriture directe');

-- ---------- Julien : comptes rendus ----------
select lives_ok(
  $$ select public.commercial_add_report('c1143000-0000-4000-8000-000000000001', 'Intéressé par le devis à la voix.', 'tiede',
       array['C''est cher', '  ', 'Pas le temps'], 'demo_faite', now() + interval '2 days', 'Rappeler après réflexion') $$,
  'compte rendu enregistré');
select is(
  (select status::text from public.prospect_follows where prospect_id = 'c1143000-0000-4000-8000-000000000001'),
  'demo_faite',
  'compte rendu : étape du suivi mise à jour');
select ok(
  (select next_action_at > now() from public.prospect_follows where prospect_id = 'c1143000-0000-4000-8000-000000000001'),
  'compte rendu : prochaine action mise à jour');
select is(
  (select notes from public.prospect_follows where prospect_id = 'c1143000-0000-4000-8000-000000000001'),
  'Rencontré au salon.',
  'compte rendu : notes inchangées');
select is(
  (select objections from public.prospect_reports where prospect_id = 'c1143000-0000-4000-8000-000000000001'),
  array['C''est cher', 'Pas le temps'],
  'compte rendu : objections vides retirées');
select lives_ok(
  $$ select public.commercial_add_report('c1143000-0000-4000-8000-000000000002', 'Pas intéressé.', 'froid', '{}',
       'pas_interesse', null, 'Libellé sans date') $$,
  'compte rendu sans prochaine action');
select is(
  (select next_action_label from public.prospect_reports where prospect_id = 'c1143000-0000-4000-8000-000000000002'),
  null,
  'compte rendu : libellé ignoré sans date');
select is(
  (public.commercial_copilot_context('c1143000-0000-4000-8000-000000000001') -> 'comptes_rendus' -> 0 ->> 'resume'),
  'Intéressé par le devis à la voix.',
  'contexte : derniers comptes rendus');

select throws_ok(
  $$ select public.commercial_add_report('c1143000-0000-4000-8000-000000000001', '  ', 'tiede', '{}', 'demo_faite') $$,
  '22023', 'Le compte rendu est vide.', 'compte rendu vide refusé');
select throws_ok(
  $$ select public.commercial_add_report('c1143000-0000-4000-8000-000000000001', 'Bien.', 'brulant', '{}', 'demo_faite') $$,
  '22023', 'Intérêt invalide.', 'intérêt inconnu refusé');
select throws_ok(
  $$ select public.commercial_add_report('c1143000-0000-4000-8000-000000000001', repeat('a', 601), 'tiede', '{}', 'demo_faite') $$,
  '22023', 'Compte rendu trop long : 600 caractères au plus.', 'compte rendu trop long refusé');
select throws_ok(
  $$ select public.commercial_add_report('c1143000-0000-4000-8000-000000000001', 'Bien.', 'tiede', array['a', 'b', 'c', 'd'],
       'demo_faite') $$,
  '22023', 'Objections : 3 au plus, de 120 caractères chacune.', 'plus de 3 objections refusées');
select throws_ok(
  $$ select public.commercial_add_report('c1143000-0000-4000-8000-000000000003', 'Bien.', 'tiede', '{}', 'demo_faite') $$,
  '22023', 'Suivez d''abord ce prospect.', 'compte rendu : prospect non suivi refusé');
select throws_ok(
  $$ insert into public.prospect_reports (prospect_id, commercial_id, summary, interest)
     values ('c1143000-0000-4000-8000-000000000001', 'c1141000-0000-4000-8000-000000000001', 'Direct', 'chaud') $$,
  '42501', null, 'compte rendu : aucune écriture directe');

select is((select count(*)::int from public.prospect_briefs), 1, 'Julien : sa fiche');
select is((select count(*)::int from public.prospect_reports), 2, 'Julien : ses comptes rendus');
reset role;

-- ---------- Sami (autre commercial), Léa (suspendue), artisan, particulier ----------
select pg_temp.connecter('c1140000-0000-4000-8000-000000000003', 'commercial');
set local role authenticated;
select is((select count(*)::int from public.prospect_briefs), 0, 'autre commercial : aucune fiche');
select is((select count(*)::int from public.prospect_reports), 0, 'autre commercial : aucun compte rendu');
select throws_ok(
  $$ select public.commercial_copilot_context('c1143000-0000-4000-8000-000000000001') $$,
  '22023', 'Suivez d''abord ce prospect.', 'autre commercial : contexte refusé');
select throws_ok(
  $$ select public.commercial_save_brief('c1143000-0000-4000-8000-000000000001', '{"v":1}') $$,
  '22023', 'Suivez d''abord ce prospect.', 'autre commercial : fiche refusée');
reset role;

select pg_temp.connecter('c1140000-0000-4000-8000-000000000004', 'commercial');
set local role authenticated;
select throws_ok(
  $$ select public.commercial_copilot_context('c1143000-0000-4000-8000-000000000001') $$,
  '42501', 'Réservé aux commerciaux', 'commerciale suspendue : refusé');
reset role;

select pg_temp.connecter('c1140000-0000-4000-8000-000000000005', 'artisan');
set local role authenticated;
select is((select count(*)::int from public.prospect_reports), 0, 'artisan : aucun compte rendu');
select throws_ok(
  $$ select public.commercial_prospect_demand('c1143000-0000-4000-8000-000000000001', array['plombier']) $$,
  '42501', 'Réservé aux commerciaux', 'artisan : demande refusée');
reset role;

set local role anon;
select throws_ok(
  $$ select count(*) from public.prospect_briefs $$,
  '42501', null, 'visiteur : aucune lecture');
select throws_ok(
  $$ select public.commercial_copilot_context('c1143000-0000-4000-8000-000000000001') $$,
  '42501', null, 'visiteur : contexte refusé');
reset role;

-- ---------- Admin : lecture ----------
select pg_temp.connecter('c1140000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select is((select count(*)::int from public.prospect_reports where prospect_id::text like 'c1143000%'), 2,
  'admin : lit les comptes rendus');
reset role;

-- ---------- « Ne plus suivre » : fiche et comptes rendus supprimés avec le suivi ----------
select pg_temp.connecter('c1140000-0000-4000-8000-000000000002', 'commercial');
set local role authenticated;
select lives_ok($$ select public.commercial_release_prospect('c1143000-0000-4000-8000-000000000001') $$,
  'ne plus suivre P1');
reset role;
select is((select count(*)::int from public.prospect_briefs where prospect_id = 'c1143000-0000-4000-8000-000000000001'), 0,
  'ne plus suivre : fiche supprimée');
select is((select count(*)::int from public.prospect_reports where prospect_id = 'c1143000-0000-4000-8000-000000000001'), 0,
  'ne plus suivre : comptes rendus supprimés');

-- ---------- Journal des appels IA ----------
select lives_ok(
  $$ insert into public.ai_runs (function_name, model, outcome, latency_ms) values ('commercial-copilot', 'test', 'ok', 1) $$,
  'ai_runs : métriques du copilote acceptées');

select * from finish();
rollback;
