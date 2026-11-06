-- Devis dicté en conversation avec Camille (F-85, ADR 0234) : contexte du chantier (refusé si le
-- chantier n'est pas à l'artisan ou si le devis est déjà parti), prix habituels, brouillon d'un
-- appel remplacé à chaque proposition, lecture par l'artisan seul, clôture, fonctions réservées
-- au rôle service. Données fictives (identifiants c124…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1240000-0000-4000-8000-000000000001', 'devis124.paul@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c1240000-0000-4000-8000-000000000002', 'devis124.autre@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c1240000-0000-4000-8000-000000000003', 'devis124.client@example.test', false, now(), '{"role":"particulier"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, assujetti_tva) values
  ('c1241000-0000-4000-8000-000000000001', 'c1240000-0000-4000-8000-000000000001', 'valide', 'PAUL 124', 'communes', true),
  ('c1241000-0000-4000-8000-000000000002', 'c1240000-0000-4000-8000-000000000002', 'valide', 'AUTRE 124', 'communes', true);
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('c1241000-0000-4000-8000-000000000001', 'premium', 'cus_c124', 'sub_c124', 'active');

insert into public.projects (id, user_id, status, description, trade_code, ville_code_insee, ville_nom, criteria_validated_at) values
  ('c1242000-0000-4000-8000-000000000001', 'c1240000-0000-4000-8000-000000000003', 'criteres_valides',
   'Refaire le carrelage de la salle de bains, environ 12 m2.', 'carreleur', '06004', 'Antibes', now()),
  ('c1242000-0000-4000-8000-000000000002', 'c1240000-0000-4000-8000-000000000003', 'criteres_valides',
   'Ancien chantier.', 'carreleur', '06004', 'Antibes', now());
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone, status) values
  ('c1243000-0000-4000-8000-000000000001', 'c1242000-0000-4000-8000-000000000001',
   'c1241000-0000-4000-8000-000000000001', 'c1240000-0000-4000-8000-000000000003', '+33600001240', 'acceptee'),
  ('c1243000-0000-4000-8000-000000000002', 'c1242000-0000-4000-8000-000000000002',
   'c1241000-0000-4000-8000-000000000001', 'c1240000-0000-4000-8000-000000000003', '+33600001240', 'acceptee');
insert into public.chantiers (id, project_id, request_id, artisan_id, particulier_id, title) values
  ('c1244000-0000-4000-8000-000000000001', 'c1242000-0000-4000-8000-000000000001', 'c1243000-0000-4000-8000-000000000001',
   'c1241000-0000-4000-8000-000000000001', 'c1240000-0000-4000-8000-000000000003', 'Carrelage salle de bains'),
  ('c1244000-0000-4000-8000-000000000002', 'c1242000-0000-4000-8000-000000000002', 'c1243000-0000-4000-8000-000000000002',
   'c1241000-0000-4000-8000-000000000001', 'c1240000-0000-4000-8000-000000000003', 'Ancien chantier');
select set_config('menao.transition_chantier', 'on', true);
update public.chantiers set status = 'rdv_planifie' where id = 'c1244000-0000-4000-8000-000000000001';
update public.chantiers set status = 'devis_signe' where id = 'c1244000-0000-4000-8000-000000000002';
select set_config('menao.transition_chantier', '', true);

-- Anciens devis de l'artisan : ses prix habituels.
insert into public.quotes (id, chantier_id, artisan_id) values
  ('c1245000-0000-4000-8000-000000000001', 'c1244000-0000-4000-8000-000000000002', 'c1241000-0000-4000-8000-000000000001');
insert into public.quote_lines (quote_id, position, type, designation, quantity_milli, unit, unit_price_ht_cents, vat_rate_bp, total_ht_cents) values
  ('c1245000-0000-4000-8000-000000000001', 1, 'main_oeuvre', 'Pose de carrelage au sol', 10000, 'm2', 4500, 1000, 45000),
  ('c1245000-0000-4000-8000-000000000001', 2, 'materiel', 'Colle carrelage', 2000, 'u', 1800, 1000, 3600),
  ('c1245000-0000-4000-8000-000000000001', 3, 'autre', 'Évacuation des gravats', 1000, 'forfait', 0, 1000, 0);

-- ---------- Contexte du devis ----------
set local role service_role;
select is(public.voice_quote_context('c1241000-0000-4000-8000-000000000001', 'c1244000-0000-4000-8000-000000000001') ->> 'chantier',
  'Carrelage salle de bains', 'contexte : le chantier');
select is(public.voice_quote_context('c1241000-0000-4000-8000-000000000001', 'c1244000-0000-4000-8000-000000000001') ->> 'commune',
  'Antibes', 'contexte : la commune');
select is(jsonb_array_length(public.voice_quote_context('c1241000-0000-4000-8000-000000000001', 'c1244000-0000-4000-8000-000000000001') -> 'prix_habituels'),
  2, 'prix habituels : lignes à prix non nul');
select is((public.voice_quote_context('c1241000-0000-4000-8000-000000000001', 'c1244000-0000-4000-8000-000000000001') -> 'droits' -> 'agents' ->> 'devis_conversation')::boolean,
  true, 'droits de sa formule');
select is(public.voice_quote_context('c1241000-0000-4000-8000-000000000002', 'c1244000-0000-4000-8000-000000000001'),
  null, 'chantier d''un autre artisan : rien');
select is(public.voice_quote_context('c1241000-0000-4000-8000-000000000001', 'c1244000-0000-4000-8000-000000000002'),
  null, 'devis déjà signé : rien');

select is((select count(*)::int from public.voice_quote_usual_prices('c1241000-0000-4000-8000-000000000001', 'pose du carrelage')),
  2, 'prix habituels : toutes les lignes qui contiennent un des mots');
select is((select unit_price_ht_cents from public.voice_quote_usual_prices('c1241000-0000-4000-8000-000000000001', 'pose du carrelage') limit 1),
  4500, 'prix habituel : la ligne qui contient le plus de mots d''abord');
select is((select count(*)::int from public.voice_quote_usual_prices('c1241000-0000-4000-8000-000000000002', 'carrelage')),
  0, 'prix d''un autre artisan : rien');

-- ---------- Brouillon de l'appel ----------
select throws_ok(
  $$ select public.voice_quote_save_draft('c1241000-0000-4000-8000-000000000002', 'c1244000-0000-4000-8000-000000000001',
       'appel-c124-1', '[{"designation":"x"}]') $$,
  '22023', 'Chantier introuvable ou devis déjà envoyé.', 'brouillon sur le chantier d''un autre : refusé');
select throws_ok(
  $$ select public.voice_quote_save_draft('c1241000-0000-4000-8000-000000000001', 'c1244000-0000-4000-8000-000000000001',
       'appel-c124-1', '[]') $$,
  '22023', 'Lignes invalides.', 'aucune ligne : refusé');
select lives_ok(
  $$ select public.voice_quote_save_draft('c1241000-0000-4000-8000-000000000001', 'c1244000-0000-4000-8000-000000000001',
       'appel-c124-1', '[{"designation":"Pose"}]') $$,
  'première proposition');
select lives_ok(
  $$ select public.voice_quote_save_draft('c1241000-0000-4000-8000-000000000001', 'c1244000-0000-4000-8000-000000000001',
       'appel-c124-1', '[{"designation":"Pose"},{"designation":"Colle"}]') $$,
  'proposition corrigée');
reset role;
select is((select count(*)::int from public.voice_quote_drafts), 1, 'un seul brouillon par appel');
select is((select jsonb_array_length(lines) from public.voice_quote_drafts), 2, 'la liste complète remplace la précédente');

-- ---------- Lecture et clôture par l'artisan ----------
set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1240000-0000-4000-8000-000000000002',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select is((select count(*)::int from public.voice_quote_drafts), 0, 'autre artisan : aucun brouillon');
select lives_ok($$ select public.settle_voice_quote_drafts('c1244000-0000-4000-8000-000000000001') $$,
  'autre artisan : clôture sans effet');
select throws_ok(
  $$ select public.voice_quote_save_draft('c1241000-0000-4000-8000-000000000002', 'c1244000-0000-4000-8000-000000000001',
       'appel-c124-2', '[{"designation":"x"}]') $$,
  '42501', null, 'artisan : écriture d''un brouillon réservée au serveur');
select throws_ok(
  $$ select public.voice_quote_context('c1241000-0000-4000-8000-000000000002', 'c1244000-0000-4000-8000-000000000001') $$,
  '42501', null, 'artisan : contexte réservé au serveur');
select throws_ok($$ insert into public.voice_quote_drafts (chantier_id, artisan_id, call_id, lines)
  values ('c1244000-0000-4000-8000-000000000001', 'c1241000-0000-4000-8000-000000000002', 'x', '[{}]') $$,
  '42501', null, 'écriture directe refusée');
reset role;
select ok((select settled_at is null from public.voice_quote_drafts), 'toujours ouvert');

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', 'c1240000-0000-4000-8000-000000000001',
  'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select is((select count(*)::int from public.voice_quote_drafts where settled_at is null), 1, 'artisan : son brouillon ouvert');
select lives_ok($$ select public.settle_voice_quote_drafts('c1244000-0000-4000-8000-000000000001') $$,
  'artisan : brouillon repris');
select is((select count(*)::int from public.voice_quote_drafts where settled_at is null), 0, 'plus de brouillon ouvert');
reset role;

set local role anon;
select throws_ok($$ select count(*) from public.voice_quote_drafts $$, '42501', null, 'visiteur : aucun accès');
reset role;

select * from finish();
rollback;
