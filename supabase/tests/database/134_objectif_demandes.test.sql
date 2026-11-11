-- F-131 : objectif de demandes par artisan (ADR 0282) : suivi réservé aux admins en double
-- authentification ; demandes directes à part, demandes retenues pour vérification exclues ;
-- recherches du métier dans la zone ; objectif par défaut et objectif propre, journalisés.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e3410000-0000-4000-8000-000000000001', 'objectif.client@example.test', false, now(), '{}', '{}'),
  ('e3420000-0000-4000-8000-000000000001', 'objectif.artisan.a@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e3420000-0000-4000-8000-000000000002', 'objectif.artisan.b@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e3430000-0000-4000-8000-000000000001', 'objectif.support@example.test', false, now(), '{"role":"support"}', '{}'),
  ('e3430000-0000-4000-8000-000000000002', 'objectif.admin@example.test', false, now(), '{"role":"admin"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text, niveau text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', niveau, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- Deux plombiers validés il y a deux mois, à Nice (zone en communes).
insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, connect_charges_enabled, stripe_account_id, assujetti_tva) values
  ('e3440000-0000-4000-8000-000000000001', 'e3420000-0000-4000-8000-000000000001', 'valide', '00000002700003',
   'OBJECTIF PLOMBERIE A', '5710', '4 RUE DE LA PAIX', '06000', 'NICE', 'communes', true, 'acct_obj_a', true),
  ('e3440000-0000-4000-8000-000000000002', 'e3420000-0000-4000-8000-000000000002', 'valide', '00000002700011',
   'OBJECTIF PLOMBERIE B', '5710', '5 RUE DE LA PAIX', '06000', 'NICE', 'communes', true, 'acct_obj_b', true);
insert into public.artisan_trades (artisan_id, trade_code) values
  ('e3440000-0000-4000-8000-000000000001', 'plombier'),
  ('e3440000-0000-4000-8000-000000000002', 'plombier');
insert into public.artisan_zones (artisan_id, code_insee, nom) values
  ('e3440000-0000-4000-8000-000000000001', '06088', 'Nice'),
  ('e3440000-0000-4000-8000-000000000002', '06088', 'Nice');
insert into public.artisan_reviews (artisan_id, decision, created_at) values
  ('e3440000-0000-4000-8000-000000000001', 'valide', now() - interval '2 months'),
  ('e3440000-0000-4000-8000-000000000002', 'valide', now() - interval '2 months');

-- Recherches du mois à Nice : plombier (demande ordinaire, demande directe à A, demande retenue
-- pour vérification, critères validés sans demande), brouillon et électricien (non comptés).
insert into public.projects (id, user_id, status, description, trade_code, ville_code_insee, ville_nom,
  code_postal, location, criteria_validated_at, preferred_artisan_id) values
  ('e3450000-0000-4000-8000-000000000001', 'e3410000-0000-4000-8000-000000000001', 'demande_envoyee',
   'Fuite sous l''évier.', 'plombier', '06088', 'Nice', '06000', 'SRID=4326;POINT(7.26 43.70)', now(), null),
  ('e3450000-0000-4000-8000-000000000002', 'e3410000-0000-4000-8000-000000000001', 'demande_envoyee',
   'Changer un robinet.', 'plombier', '06088', 'Nice', '06000', 'SRID=4326;POINT(7.26 43.70)', now(),
   'e3440000-0000-4000-8000-000000000001'),
  ('e3450000-0000-4000-8000-000000000003', 'e3410000-0000-4000-8000-000000000001', 'demande_envoyee',
   'Remplacer un chauffe-eau.', 'plombier', '06088', 'Nice', '06000', 'SRID=4326;POINT(7.26 43.70)', now(), null),
  ('e3450000-0000-4000-8000-000000000004', 'e3410000-0000-4000-8000-000000000001', 'criteres_valides',
   'Déboucher un évier.', 'plombier', '06088', 'Nice', '06000', 'SRID=4326;POINT(7.26 43.70)', now(), null),
  ('e3450000-0000-4000-8000-000000000005', 'e3410000-0000-4000-8000-000000000001', 'brouillon',
   'Une douche.', 'plombier', '06088', 'Nice', '06000', 'SRID=4326;POINT(7.26 43.70)', null, null),
  ('e3450000-0000-4000-8000-000000000006', 'e3410000-0000-4000-8000-000000000001', 'criteres_valides',
   'Ajouter des prises.', 'electricien', '06088', 'Nice', '06000', 'SRID=4326;POINT(7.26 43.70)', now(), null);
insert into public.requests (project_id, artisan_id, particulier_id, contact_phone, status) values
  ('e3450000-0000-4000-8000-000000000001', 'e3440000-0000-4000-8000-000000000001',
   'e3410000-0000-4000-8000-000000000001', '+33612345678', 'envoyee'),
  ('e3450000-0000-4000-8000-000000000002', 'e3440000-0000-4000-8000-000000000001',
   'e3410000-0000-4000-8000-000000000001', '+33612345678', 'envoyee'),
  ('e3450000-0000-4000-8000-000000000003', 'e3440000-0000-4000-8000-000000000001',
   'e3410000-0000-4000-8000-000000000001', '+33612345678', 'a_verifier'),
  ('e3450000-0000-4000-8000-000000000001', 'e3440000-0000-4000-8000-000000000002',
   'e3410000-0000-4000-8000-000000000001', '+33612345678', 'acceptee');

-- ---------- Refusé aux autres rôles ----------
set local role authenticated;
select pg_temp.connecter('e3410000-0000-4000-8000-000000000001', 'particulier');
select throws_ok('select public.admin_lead_targets()', '42501', null, 'client : suivi refusé');
select pg_temp.connecter('e3420000-0000-4000-8000-000000000001', 'artisan');
select throws_ok('select public.admin_lead_targets()', '42501', null, 'artisan : suivi refusé');
select throws_ok($$ select public.admin_set_lead_target('e3440000-0000-4000-8000-000000000001', 50) $$,
  '42501', null, 'artisan : réglage de son objectif refusé');
select is((select count(*)::int from public.artisan_lead_targets), 0, 'artisan : aucun objectif lisible');
select pg_temp.connecter('e3430000-0000-4000-8000-000000000001', 'support');
select throws_ok('select public.admin_lead_targets()', '42501', null, 'support : suivi refusé');
select pg_temp.connecter('e3430000-0000-4000-8000-000000000002', 'admin', 'aal1');
select throws_ok('select public.admin_lead_targets()', '42501', null,
  'admin sans double authentification : refusé');

-- ---------- Admin en double authentification ----------
select pg_temp.connecter('e3430000-0000-4000-8000-000000000002', 'admin', 'aal2');
select is((public.admin_lead_targets() ->> 'objectif_defaut')::int, 4, 'objectif par défaut : 4 demandes');
select results_eq(
  $$ select a ->> 'nom', (a ->> 'recues')::int, (a ->> 'directes')::int, (a ->> 'acceptees')::int,
       (a ->> 'recherches_zone')::int, (a ->> 'objectif')::int, (a ->> 'objectif_propre')::boolean
     from json_array_elements(public.admin_lead_targets() -> 'artisans') a $$,
  $$ values ('OBJECTIF PLOMBERIE A'::text, 1, 1, 0, 4, 4, false),
            ('OBJECTIF PLOMBERIE B'::text, 1, 0, 1, 4, 4, false) $$,
  'demandes du mois (directes à part, vérification exclue) et recherches du métier dans la zone');
select is(
  (select count(*)::int from json_array_elements(
    public.admin_lead_targets(null, 'e3440000-0000-4000-8000-000000000002') -> 'artisans')),
  1, 'un seul artisan pour sa fiche');
select is(
  (select json_array_length(a -> 'historique') from json_array_elements(public.admin_lead_targets() -> 'artisans') a limit 1),
  6, 'historique des 6 derniers mois');
select throws_ok($$ select public.admin_lead_targets((current_date + interval '2 months')::date) $$,
  '22023', null, 'mois à venir : refusé');

-- Réglages.
select lives_ok($$ select public.admin_set_lead_target(null, 6) $$, 'objectif par défaut modifié');
select lives_ok($$ select public.admin_set_lead_target('e3440000-0000-4000-8000-000000000001', 2) $$,
  'objectif propre à un artisan');
select results_eq(
  $$ select (a ->> 'objectif')::int, (a ->> 'objectif_propre')::boolean
     from json_array_elements(public.admin_lead_targets() -> 'artisans') a order by a ->> 'nom' $$,
  $$ values (2, true), (6, false) $$,
  'objectif propre pour A, nouvel objectif par défaut pour B');
select throws_ok($$ select public.admin_set_lead_target(null, 0) $$, '22023', null,
  'objectif par défaut nul : refusé');
select throws_ok($$ select public.admin_set_lead_target('e3440000-0000-4000-8000-000000000001', 101) $$,
  '22023', null, 'objectif au-delà de 100 : refusé');
select throws_ok($$ select public.admin_set_lead_target('00000000-0000-4000-8000-000000000000', 3) $$,
  '22023', null, 'artisan inconnu : refusé');
select is((select count(*)::int from public.artisan_lead_targets), 1, 'admin : objectifs propres lisibles');
select throws_ok(
  $$ insert into public.artisan_lead_targets (artisan_id, objectif) values ('e3440000-0000-4000-8000-000000000002', 9) $$,
  '42501', null, 'écriture directe refusée');
select lives_ok($$ select public.admin_set_lead_target('e3440000-0000-4000-8000-000000000001', null) $$,
  'objectif propre retiré');
select is((select count(*)::int from public.artisan_lead_targets), 0, 'A reprend l''objectif par défaut');

select pg_temp.connecter('e3430000-0000-4000-8000-000000000001', 'support');
select lives_ok($$ select 1 $$, 'support connecté');
reset role;
select is((select count(*)::int from public.audit_logs where action = 'objectif_demandes'), 3,
  'chaque réglage est journalisé');

-- ---------- Droits d'exécution ----------
select ok(not has_function_privilege('anon', 'public.admin_lead_targets(date, uuid)', 'execute'),
  'visiteur anonyme : suivi refusé');
select ok(not has_function_privilege('anon', 'public.admin_set_lead_target(uuid, integer)', 'execute'),
  'visiteur anonyme : réglage refusé');

select * from finish();
rollback;
