-- Résultats et primes des commerciaux (F-65, ADR 0207) : primes créées à la validation du dossier
-- et au premier paiement pour un commercial actif seulement, vérification quotidienne après le
-- délai (montant non réglé : en attente), paiement et annulation, réglages (admins, double
-- authentification), zone et filtre « Ma zone », transfert et libération des prospects, « Mes
-- résultats », tableau du back-office ; lecture réservée. Données fictives, montants fictifs
-- (1 et 2 centimes) réglés dans ce test seulement ; le seed est chargé avant : on ne compte que nos
-- lignes (SIRET 00000108…, identifiants c108…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1080000-0000-4000-8000-000000000001', 'com108.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('c1080000-0000-4000-8000-000000000002', 'com108.julien@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('c1080000-0000-4000-8000-000000000003', 'com108.sami@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('c1080000-0000-4000-8000-000000000004', 'com108.lea@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('c1080000-0000-4000-8000-000000000009', 'com108.client@example.test', false, now(), '{"role":"particulier"}', '{}'),
  ('c1080000-0000-4000-8000-000000000011', 'com108.artisan1@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c1080000-0000-4000-8000-000000000012', 'com108.artisan2@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c1080000-0000-4000-8000-000000000013', 'com108.artisan3@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c1080000-0000-4000-8000-000000000014', 'com108.artisan4@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c1080000-0000-4000-8000-000000000015', 'com108.artisan5@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c1080000-0000-4000-8000-000000000016', 'com108.artisan6@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c1080000-0000-4000-8000-000000000017', 'com108.artisan7@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c1080000-0000-4000-8000-000000000018', 'com108.artisan8@example.test', false, now(), '{"role":"artisan"}', '{}');

insert into public.commercials (id, user_id, code, nom, status) values
  ('c1082000-0000-4000-8000-000000000001', 'c1080000-0000-4000-8000-000000000002', 'julien-108', 'Julien Exemple', 'actif'),
  ('c1082000-0000-4000-8000-000000000002', 'c1080000-0000-4000-8000-000000000003', 'sami-108', 'Sami Exemple', 'actif'),
  ('c1082000-0000-4000-8000-000000000003', 'c1080000-0000-4000-8000-000000000004', 'lea-108', 'Léa Exemple', 'suspendu');

-- A1, A2, A5, A6, A7 : inscrits avec le code de Julien ; A3 : Léa (suspendue) ; A4 : aucun code ;
-- A8 : Sami. A6 s'est inscrit il y a deux mois (heure de Paris).
insert into public.artisans (id, user_id, siret, raison_sociale, nom_commercial, status) values
  ('c1081000-0000-4000-8000-000000000001', 'c1080000-0000-4000-8000-000000000011', '00000108100009', 'PLOMBERIE C108 UN', 'ENSEIGNE C108 UN', 'brouillon'),
  ('c1081000-0000-4000-8000-000000000002', 'c1080000-0000-4000-8000-000000000012', '00000108200007', 'ELEC C108 DEUX', null, 'brouillon'),
  ('c1081000-0000-4000-8000-000000000003', 'c1080000-0000-4000-8000-000000000013', '00000108300005', 'MACONNERIE C108 TROIS', null, 'brouillon'),
  ('c1081000-0000-4000-8000-000000000004', 'c1080000-0000-4000-8000-000000000014', '00000108400003', 'PEINTURE C108 QUATRE', null, 'brouillon'),
  ('c1081000-0000-4000-8000-000000000005', 'c1080000-0000-4000-8000-000000000015', '00000108500000', 'CARRELAGE C108 CINQ', null, 'brouillon'),
  ('c1081000-0000-4000-8000-000000000006', 'c1080000-0000-4000-8000-000000000016', '00000108600008', 'TOITURE C108 SIX', null, 'brouillon'),
  ('c1081000-0000-4000-8000-000000000007', 'c1080000-0000-4000-8000-000000000017', '00000108700006', 'MENUISERIE C108 SEPT', null, 'brouillon'),
  ('c1081000-0000-4000-8000-000000000008', 'c1080000-0000-4000-8000-000000000018', '00000108800004', 'SERRURERIE C108 HUIT', null, 'brouillon');
insert into public.commercial_attributions (artisan_id, commercial_id) values
  ('c1081000-0000-4000-8000-000000000001', 'c1082000-0000-4000-8000-000000000001'),
  ('c1081000-0000-4000-8000-000000000002', 'c1082000-0000-4000-8000-000000000001'),
  ('c1081000-0000-4000-8000-000000000003', 'c1082000-0000-4000-8000-000000000003'),
  ('c1081000-0000-4000-8000-000000000005', 'c1082000-0000-4000-8000-000000000001'),
  ('c1081000-0000-4000-8000-000000000007', 'c1082000-0000-4000-8000-000000000001'),
  ('c1081000-0000-4000-8000-000000000008', 'c1082000-0000-4000-8000-000000000002');
insert into public.commercial_attributions (artisan_id, commercial_id, created_at) values
  ('c1081000-0000-4000-8000-000000000006', 'c1082000-0000-4000-8000-000000000001',
   (date_trunc('month', now() at time zone 'Europe/Paris') - interval '2 months' + interval '10 days')
     at time zone 'Europe/Paris');

insert into public.prospects (id, siret, denomination, code_postal, commune, departement) values
  ('c1083000-0000-4000-8000-000000000001', '00010800100018', 'PLOMBERIE PROSPECT C108', '06000', 'NICE', '06'),
  ('c1083000-0000-4000-8000-000000000002', '00010800200016', 'ELEC PROSPECT C108', '20137', 'PORTO-VECCHIO', '2A'),
  ('c1083000-0000-4000-8000-000000000003', '00010800300014', 'MACONNERIE PROSPECT C108', '20000', 'AJACCIO', '2A'),
  ('c1083000-0000-4000-8000-000000000004', '00010800400012', 'PEINTURE PROSPECT C108', null, null, '06');
insert into public.prospect_follows (prospect_id, commercial_id, status) values
  ('c1083000-0000-4000-8000-000000000001', 'c1082000-0000-4000-8000-000000000001', 'a_contacter'),
  ('c1083000-0000-4000-8000-000000000002', 'c1082000-0000-4000-8000-000000000001', 'rdv_pris'),
  ('c1083000-0000-4000-8000-000000000003', 'c1082000-0000-4000-8000-000000000002', 'demo_faite');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Réglages par défaut : aucun montant décidé ----------
select results_eq(
  $$ select prime_validation_centimes, prime_abonnement_centimes, delai_validation_jours, objectif_valides_mois
     from public.commercial_bonus_settings $$,
  $$ values (null::int, null::int, 30, null::int) $$,
  'réglages par défaut : montants nuls, délai de 30 jours');

-- ---------- Dossier validé ----------
update public.artisans set status = 'valide'
where id in ('c1081000-0000-4000-8000-000000000001', 'c1081000-0000-4000-8000-000000000002',
  'c1081000-0000-4000-8000-000000000003', 'c1081000-0000-4000-8000-000000000004',
  'c1081000-0000-4000-8000-000000000007', 'c1081000-0000-4000-8000-000000000008');
select results_eq(
  $$ select artisan_id, commercial_id, kind::text, status::text, amount_cents, validate_after = now() + interval '30 days'
     from public.commercial_bonuses where artisan_id::text like 'c1081000-%' order by artisan_id $$,
  $$ values
       ('c1081000-0000-4000-8000-000000000001'::uuid, 'c1082000-0000-4000-8000-000000000001'::uuid, 'validation'::text,
        'en_attente'::text, null::int, true),
       ('c1081000-0000-4000-8000-000000000002', 'c1082000-0000-4000-8000-000000000001', 'validation', 'en_attente', null, true),
       ('c1081000-0000-4000-8000-000000000007', 'c1082000-0000-4000-8000-000000000001', 'validation', 'en_attente', null, true),
       ('c1081000-0000-4000-8000-000000000008', 'c1082000-0000-4000-8000-000000000002', 'validation', 'en_attente', null, true) $$,
  'dossier validé : prime en attente, sans montant, à vérifier après le délai');
select is_empty(
  $$ select 1 from public.commercial_bonuses
     where artisan_id = 'c1081000-0000-4000-8000-000000000003' $$,
  'commercial suspendu : aucune prime');
select is_empty(
  $$ select 1 from public.commercial_bonuses
     where artisan_id = 'c1081000-0000-4000-8000-000000000004' $$,
  'artisan sans rattachement : aucune prime');

update public.artisans set status = 'suspendu' where id = 'c1081000-0000-4000-8000-000000000002';
update public.artisans set status = 'valide' where id = 'c1081000-0000-4000-8000-000000000002';
update public.artisans set status = 'suspendu' where id = 'c1081000-0000-4000-8000-000000000002';
select is(
  (select count(*)::int from public.commercial_bonuses where artisan_id = 'c1081000-0000-4000-8000-000000000002'),
  1, 'dossier validé une seconde fois : une seule prime');

-- ---------- Premier paiement de l'abonnement ----------
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('c1081000-0000-4000-8000-000000000001', 'base', 'cus_c108_1', 'sub_c108_1', 'active'),
  ('c1081000-0000-4000-8000-000000000004', 'base', 'cus_c108_4', 'sub_c108_4', 'active'),
  ('c1081000-0000-4000-8000-000000000005', 'base', 'cus_c108_5', 'sub_c108_5', 'active');
select is_empty(
  $$ select 1 from public.commercial_bonuses where kind = 'abonnement' and artisan_id::text like 'c1081000-%' $$,
  'abonnement sans paiement réel : aucune prime');

set local role service_role;
select ok(public.record_subscription_payment('sub_c108_1'), 'premier paiement (A1)');
select ok(public.record_subscription_payment('sub_c108_4'), 'premier paiement (A4, sans rattachement)');
select ok(public.record_subscription_payment('sub_c108_5'), 'premier paiement (A5, dossier pas encore validé)');
select ok(not public.record_subscription_payment('sub_c108_1'), 'paiement suivant : sans effet');
reset role;
select results_eq(
  $$ select artisan_id, commercial_id, status::text, amount_cents
     from public.commercial_bonuses where kind = 'abonnement' and artisan_id::text like 'c1081000-%' order by artisan_id $$,
  $$ values
       ('c1081000-0000-4000-8000-000000000001'::uuid, 'c1082000-0000-4000-8000-000000000001'::uuid, 'en_attente'::text, null::int),
       ('c1081000-0000-4000-8000-000000000005', 'c1082000-0000-4000-8000-000000000001', 'en_attente', null) $$,
  'premier paiement : une prime d''abonnement par artisan rattaché à un commercial actif');

-- ---------- Vérification quotidienne ----------
select lives_ok($$ select app.validate_commercial_bonuses() $$, 'vérification avant la fin du délai');
select is(
  (select count(*)::int from public.commercial_bonuses where artisan_id::text like 'c1081000-%' and status = 'en_attente'),
  6, 'délai non écoulé : primes toujours en attente');

update public.commercial_bonuses set validate_after = now() - interval '1 day'
where commercial_id = 'c1082000-0000-4000-8000-000000000001';
update public.subscriptions set status = 'canceled' where artisan_id = 'c1081000-0000-4000-8000-000000000005';
select lives_ok($$ select app.validate_commercial_bonuses() $$, 'vérification, montants non réglés');
select results_eq(
  $$ select artisan_id, kind::text, status::text, amount_cents, validated_at, cancel_reason
     from public.commercial_bonuses where commercial_id = 'c1082000-0000-4000-8000-000000000001'
     order by artisan_id, kind::text $$,
  $$ values
       ('c1081000-0000-4000-8000-000000000001'::uuid, 'abonnement'::text, 'en_attente'::text, null::int, null::timestamptz,
        null::text),
       ('c1081000-0000-4000-8000-000000000001', 'validation', 'en_attente', null, null, null),
       ('c1081000-0000-4000-8000-000000000002', 'validation', 'annulee', null, null, 'Dossier plus validé à la fin du délai'),
       ('c1081000-0000-4000-8000-000000000005', 'abonnement', 'annulee', null, null, 'Abonnement inactif à la fin du délai'),
       ('c1081000-0000-4000-8000-000000000007', 'validation', 'en_attente', null, null, null) $$,
  'montant non réglé : en attente ; dossier suspendu ou abonnement inactif : annulée');

select pg_temp.connecter('c1080000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select lives_ok($$ select public.admin_save_commercial_bonus_settings(1, 2, 0, 3) $$,
  'admin : montants fictifs réglés, délai nul, objectif');
reset role;
select results_eq(
  $$ select prime_validation_centimes, prime_abonnement_centimes, delai_validation_jours, objectif_valides_mois,
       updated_by from public.commercial_bonus_settings $$,
  $$ values (1, 2, 0, 3, 'c1080000-0000-4000-8000-000000000001'::uuid) $$,
  'réglages enregistrés avec leur auteur');
select lives_ok($$ select app.validate_commercial_bonuses() $$, 'vérification, montants réglés');
select results_eq(
  $$ select artisan_id, kind::text, status::text, amount_cents, validated_at = now()
     from public.commercial_bonuses where commercial_id = 'c1082000-0000-4000-8000-000000000001'
     order by artisan_id, kind::text $$,
  $$ values
       ('c1081000-0000-4000-8000-000000000001'::uuid, 'abonnement'::text, 'validee'::text, 2, true),
       ('c1081000-0000-4000-8000-000000000001', 'validation', 'validee', 1, true),
       ('c1081000-0000-4000-8000-000000000002', 'validation', 'annulee', null, null),
       ('c1081000-0000-4000-8000-000000000005', 'abonnement', 'annulee', null, null),
       ('c1081000-0000-4000-8000-000000000007', 'validation', 'validee', 1, true) $$,
  'montant réglé : validée au montant du moment');
select is(
  (select status::text from public.commercial_bonuses where artisan_id = 'c1081000-0000-4000-8000-000000000008'),
  'en_attente', 'prime d''un collègue, délai non écoulé : toujours en attente');

-- Décisions de validation (date de « Mes résultats ») : la dernière l'emporte. A5 est validé
-- ensuite : nouvelle prime, délai nul, pas encore vérifiée.
insert into public.artisan_reviews (artisan_id, decision, created_at) values
  ('c1081000-0000-4000-8000-000000000001', 'valide',
   (date_trunc('month', now() at time zone 'Europe/Paris') - interval '3 months' + interval '5 days')
     at time zone 'Europe/Paris'),
  ('c1081000-0000-4000-8000-000000000001', 'valide', now()),
  ('c1081000-0000-4000-8000-000000000002', 'valide', now()),
  ('c1081000-0000-4000-8000-000000000005', 'valide', now()),
  ('c1081000-0000-4000-8000-000000000007', 'valide', now());
update public.artisans set status = 'valide' where id = 'c1081000-0000-4000-8000-000000000005';
select results_eq(
  $$ select status::text, amount_cents, validate_after = now() from public.commercial_bonuses
     where artisan_id = 'c1081000-0000-4000-8000-000000000005' and kind = 'validation' $$,
  $$ values ('en_attente'::text, null::int, true) $$,
  'délai réglé à zéro : prime à vérifier au prochain passage');

-- ---------- Paiement et annulation ----------
select pg_temp.connecter('c1080000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select throws_ok(
  $$ select public.admin_mark_commercial_bonuses_paid(array(select id from public.commercial_bonuses
       where artisan_id = 'c1081000-0000-4000-8000-000000000001'), '   ') $$,
  '22023', 'Indiquez la référence du virement.', 'paiement sans référence refusé');
select throws_ok(
  $$ select public.admin_mark_commercial_bonuses_paid(array(select id from public.commercial_bonuses
       where artisan_id = 'c1081000-0000-4000-8000-000000000001'), repeat('x', 101)) $$,
  '22023', 'Référence trop longue : 100 caractères au plus.', 'référence trop longue refusée');
select is(
  public.admin_mark_commercial_bonuses_paid(array(
    select id from public.commercial_bonuses
    where (artisan_id = 'c1081000-0000-4000-8000-000000000001' and kind = 'validation')
       or artisan_id in ('c1081000-0000-4000-8000-000000000002', 'c1081000-0000-4000-8000-000000000005')
  ), ' VIR-C108-1 '),
  1, 'paiement : seules les primes à payer sont marquées payées');
select throws_ok(
  $$ select public.admin_cancel_commercial_bonus((select id from public.commercial_bonuses
       where artisan_id = 'c1081000-0000-4000-8000-000000000001' and kind = 'abonnement'), '  ') $$,
  '22023', 'Indiquez le motif de l''annulation.', 'annulation sans motif refusée');
select throws_ok(
  $$ select public.admin_cancel_commercial_bonus((select id from public.commercial_bonuses
       where artisan_id = 'c1081000-0000-4000-8000-000000000001' and kind = 'abonnement'), repeat('x', 301)) $$,
  '22023', 'Motif trop long : 300 caractères au plus.', 'motif trop long refusé');
select throws_ok(
  $$ select public.admin_cancel_commercial_bonus((select id from public.commercial_bonuses
       where artisan_id = 'c1081000-0000-4000-8000-000000000001' and kind = 'validation'), 'Erreur') $$,
  '22023', 'Prime introuvable ou déjà payée.', 'prime payée : annulation refusée');
select lives_ok(
  $$ select public.admin_cancel_commercial_bonus((select id from public.commercial_bonuses
       where artisan_id = 'c1081000-0000-4000-8000-000000000001' and kind = 'abonnement'), ' Doublon de test. ') $$,
  'prime à payer annulée avec son motif');
select throws_ok(
  $$ select public.admin_cancel_commercial_bonus((select id from public.commercial_bonuses
       where artisan_id = 'c1081000-0000-4000-8000-000000000001' and kind = 'abonnement'), 'Encore') $$,
  '22023', 'Prime introuvable ou déjà payée.', 'prime déjà annulée : refusé');
reset role;
select results_eq(
  $$ select kind::text, status::text, amount_cents, paid_at = now(), payout_reference, validated_at, cancel_reason
     from public.commercial_bonuses where artisan_id = 'c1081000-0000-4000-8000-000000000001' order by kind::text $$,
  $$ values ('abonnement'::text, 'annulee'::text, 2, null::boolean, null::text, null::timestamptz, 'Doublon de test.'::text),
            ('validation', 'payee', 1, true, 'VIR-C108-1', now(), null) $$,
  'payée avec sa référence ; annulée avec son motif');
select results_eq(
  $$ select artisan_id, status::text from public.commercial_bonuses
     where artisan_id in ('c1081000-0000-4000-8000-000000000002', 'c1081000-0000-4000-8000-000000000005')
     order by artisan_id, kind::text $$,
  $$ values ('c1081000-0000-4000-8000-000000000002'::uuid, 'annulee'::text),
            ('c1081000-0000-4000-8000-000000000005', 'annulee'), ('c1081000-0000-4000-8000-000000000005', 'en_attente') $$,
  'primes annulées ou en attente : jamais marquées payées');

-- ---------- Réglages : bornes et accès ----------
select pg_temp.connecter('c1080000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select throws_ok($$ select public.admin_save_commercial_bonus_settings(-1, null, 30, null) $$,
  '22023', 'Montant hors limites.', 'montant négatif refusé');
select throws_ok($$ select public.admin_save_commercial_bonus_settings(null, 1000001, 30, null) $$,
  '22023', 'Montant hors limites.', 'montant trop élevé refusé');
select throws_ok($$ select public.admin_save_commercial_bonus_settings(null, null, null, null) $$,
  '22023', 'Délai de vérification : entre 0 et 180 jours.', 'délai absent refusé');
select throws_ok($$ select public.admin_save_commercial_bonus_settings(null, null, 181, null) $$,
  '22023', 'Délai de vérification : entre 0 et 180 jours.', 'délai trop long refusé');
select throws_ok($$ select public.admin_save_commercial_bonus_settings(null, null, 30, 0) $$,
  '22023', 'Objectif mensuel : entre 1 et 1 000, ou vide.', 'objectif nul refusé');
select throws_ok($$ select public.admin_save_commercial_bonus_settings(null, null, 30, 1001) $$,
  '22023', 'Objectif mensuel : entre 1 et 1 000, ou vide.', 'objectif trop élevé refusé');
select throws_ok($$ update public.commercial_bonus_settings set prime_validation_centimes = 5 $$,
  '42501', null, 'réglages : aucune écriture directe, même pour un admin');
select throws_ok($$ update public.commercial_bonuses set status = 'payee' $$,
  '42501', null, 'primes : aucune écriture directe, même pour un admin');
reset role;

select pg_temp.connecter('c1080000-0000-4000-8000-000000000001', 'admin', 'aal1');
set local role authenticated;
select throws_ok($$ select public.admin_save_commercial_bonus_settings(null, null, 30, null) $$,
  '42501', null, 'admin sans double authentification : réglages impossibles');
select is_empty($$ select 1 from public.commercial_bonus_settings $$,
  'admin sans double authentification : réglages illisibles');
select throws_ok($$ select * from public.admin_commercials_dashboard() $$,
  '42501', null, 'admin sans double authentification : tableau impossible');
reset role;

-- ---------- Zone ----------
select pg_temp.connecter('c1080000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select throws_ok(
  $$ select public.admin_set_commercial_zone('c1082000-0000-4000-8000-000000000001', array['06', 'abc']) $$,
  '22023', 'Zone invalide : 200 codes au plus, chacun de 2 à 5 chiffres (début de code postal).',
  'zone : code non numérique refusé');
select throws_ok(
  $$ select public.admin_set_commercial_zone('c1082000-0000-4000-8000-000000000001', array['6']) $$,
  '22023', null, 'zone : code d''un seul chiffre refusé');
select throws_ok(
  $$ select public.admin_set_commercial_zone('c1082000-0000-4000-8000-000000000001', array['060000']) $$,
  '22023', null, 'zone : code de six chiffres refusé');
select throws_ok(
  $$ select public.admin_set_commercial_zone('c1082000-0000-4000-8000-000000000001', array[null]::text[]) $$,
  '22023', null, 'zone : code vide (null) refusé');
select throws_ok(
  $$ select public.admin_set_commercial_zone('c1082000-0000-4000-8000-000000000001',
       (select array_agg(lpad(g::text, 5, '0')) from generate_series(1, 201) g)) $$,
  '22023', null, 'zone : plus de 200 codes refusés');
select throws_ok(
  $$ select public.admin_set_commercial_zone('c1089999-0000-4000-8000-000000000000', array['06']) $$,
  '22023', 'Commercial introuvable.', 'zone : commercial inconnu');
select lives_ok(
  $$ select public.admin_set_commercial_zone('c1082000-0000-4000-8000-000000000001', array[' 20137', '06', '06', '']) $$,
  'zone enregistrée');
reset role;
select is(
  (select zone_codes_postaux from public.commercials where id = 'c1082000-0000-4000-8000-000000000001'),
  array['06', '20137'], 'zone : espaces retirés, vides ignorés, dédoublonnée et triée');
select throws_ok(
  $$ update public.commercials set zone_codes_postaux = '{6}' where id = 'c1082000-0000-4000-8000-000000000002' $$,
  '23514', null, 'zone : contrôle en base');

select pg_temp.connecter('c1080000-0000-4000-8000-000000000002', 'commercial');
set local role authenticated;
select results_eq(
  $$ select zone_codes_postaux from public.commercials $$, $$ values (array['06', '20137']) $$,
  'commercial : lit sa zone');
select results_eq(
  $$ select nom, total from public.commercial_prospects('c108', 'zone') $$,
  $$ values ('PLOMBERIE PROSPECT C108'::text, 2::bigint), ('ELEC PROSPECT C108', 2) $$,
  'filtre « zone » : code postal commençant par un code de ma zone');
select results_eq(
  $$ select nom from public.commercial_prospects('c108') $$,
  $$ values ('MACONNERIE PROSPECT C108'::text), ('PLOMBERIE PROSPECT C108'), ('ELEC PROSPECT C108'),
            ('PEINTURE PROSPECT C108') $$,
  'filtre « tous » inchangé');
reset role;

select pg_temp.connecter('c1080000-0000-4000-8000-000000000003', 'commercial');
set local role authenticated;
select is((select count(*)::int from public.commercial_prospects('c108', 'zone')), 4,
  'filtre « zone » sans zone : comme « tous »');
reset role;

-- ---------- « Mes résultats » ----------
select pg_temp.connecter('c1080000-0000-4000-8000-000000000002', 'commercial');
set local role authenticated;
select is(
  public.commercial_results() - 'by_month',
  '{"signups": 5, "validated": 3, "subscribed": 2, "signups_month": 4, "validated_month": 3, "subscribed_month": 2,
    "pipeline": {"followed": 2, "a_contacter": 1, "rdv_pris": 1, "demo_faite": 0, "pas_interesse": 0},
    "bonuses": {"pending": 1, "validated_cents": 1, "paid_cents": 1},
    "prime_validation_centimes": 1, "prime_abonnement_centimes": 2, "objectif_valides_mois": 3}'::jsonb,
  'résultats : totaux, mois en cours, prospects, primes et réglages');
select results_eq(
  $$ select e ->> 'month', (e ->> 'signups')::int, (e ->> 'validated')::int, (e ->> 'subscribed')::int
     from jsonb_array_elements(public.commercial_results() -> 'by_month') with ordinality as t (e, n)
     order by n $$,
  $$ select to_char(date_trunc('month', now() at time zone 'Europe/Paris') - make_interval(months => 5 - g), 'YYYY-MM'),
       case g when 3 then 1 when 5 then 4 else 0 end,
       case g when 5 then 3 else 0 end,
       case g when 5 then 2 else 0 end
     from generate_series(0, 5) as g
     order by g $$,
  'résultats : six derniers mois, le plus ancien d''abord, mois vides compris');
select results_eq(
  $$ select artisan, kind::text, status::text, amount_cents from public.commercial_bonuses_list()
     order by artisan, kind::text $$,
  $$ values ('CARRELAGE C108 CINQ'::text, 'abonnement'::text, 'annulee'::text, null::int),
            ('CARRELAGE C108 CINQ', 'validation', 'en_attente', null),
            ('ELEC C108 DEUX', 'validation', 'annulee', null),
            ('ENSEIGNE C108 UN', 'abonnement', 'annulee', 2),
            ('ENSEIGNE C108 UN', 'validation', 'payee', 1),
            ('MENUISERIE C108 SEPT', 'validation', 'validee', 1) $$,
  'mes primes : nom commercial sinon raison sociale');
select is((select count(*)::int from public.commercial_bonuses), 6, 'commercial : lit ses seules primes');
select results_eq(
  $$ select prime_validation_centimes, prime_abonnement_centimes from public.commercial_bonus_settings $$,
  $$ values (1, 2) $$,
  'commercial actif : lit les réglages');
select throws_ok($$ insert into public.commercial_bonuses (commercial_id, kind, validate_after)
     values ('c1082000-0000-4000-8000-000000000001', 'validation', now()) $$,
  '42501', null, 'commercial : aucune écriture directe de prime');
select throws_ok($$ update public.commercial_bonus_settings set prime_validation_centimes = 5 $$,
  '42501', null, 'commercial : aucune écriture des réglages');
select throws_ok($$ select app.validate_commercial_bonuses() $$, '42501', null,
  'commercial : vérification quotidienne inaccessible');
select throws_ok($$ select * from public.admin_commercials_dashboard() $$, '42501', null, 'commercial : tableau impossible');
select throws_ok($$ select public.admin_commercial_detail('c1082000-0000-4000-8000-000000000001') $$, '42501', null,
  'commercial : fiche du back-office impossible');
select throws_ok($$ select public.admin_save_commercial_bonus_settings(100, 100, 0, null) $$, '42501', null,
  'commercial : réglages impossibles');
select throws_ok($$ select public.admin_set_commercial_zone('c1082000-0000-4000-8000-000000000001', array['75']) $$,
  '42501', null, 'commercial : zone impossible');
select throws_ok(
  $$ select public.admin_transfer_prospects('c1082000-0000-4000-8000-000000000002', 'c1082000-0000-4000-8000-000000000001') $$,
  '42501', null, 'commercial : transfert impossible');
select throws_ok(
  $$ select public.admin_mark_commercial_bonuses_paid(array(select id from public.commercial_bonuses), 'VIR') $$,
  '42501', null, 'commercial : paiement impossible');
select throws_ok(
  $$ select public.admin_cancel_commercial_bonus((select id from public.commercial_bonuses limit 1), 'Motif') $$,
  '42501', null, 'commercial : annulation impossible');
select throws_ok($$ select * from public.admin_commercial_bonuses_to_pay() $$, '42501', null,
  'commercial : export impossible');
reset role;

select pg_temp.connecter('c1080000-0000-4000-8000-000000000003', 'commercial');
set local role authenticated;
select results_eq(
  $$ select (r ->> 'signups')::int, (r ->> 'validated')::int, r -> 'pipeline' ->> 'demo_faite',
       (r -> 'bonuses' ->> 'pending')::int, jsonb_array_length(r -> 'by_month')
     from (select public.commercial_results() as r) x $$,
  $$ values (1, 1, '1'::text, 1, 6) $$,
  'collègue : ses seuls résultats');
select results_eq(
  $$ select artisan, status::text from public.commercial_bonuses_list() $$,
  $$ values ('SERRURERIE C108 HUIT'::text, 'en_attente'::text) $$,
  'collègue : ses seules primes');
select is((select count(*)::int from public.commercial_bonuses), 1, 'collègue : une seule prime lisible');
reset role;

-- ---------- Accès refusé aux autres rôles ----------
select pg_temp.connecter('c1080000-0000-4000-8000-000000000004', 'commercial');
set local role authenticated;
select throws_ok($$ select public.commercial_results() $$, '42501', null, 'commercial suspendu : résultats refusés');
select throws_ok($$ select * from public.commercial_bonuses_list() $$, '42501', null,
  'commercial suspendu : primes refusées');
select is_empty($$ select 1 from public.commercial_bonuses $$, 'commercial suspendu : aucune prime lisible');
select is_empty($$ select 1 from public.commercial_bonus_settings $$, 'commercial suspendu : réglages illisibles');
reset role;

select pg_temp.connecter('c1080000-0000-4000-8000-000000000011', 'artisan');
set local role authenticated;
select throws_ok($$ select public.commercial_results() $$, '42501', null, 'artisan : résultats refusés');
select throws_ok($$ select * from public.commercial_bonuses_list() $$, '42501', null, 'artisan : primes refusées');
select is_empty($$ select 1 from public.commercial_bonuses $$, 'artisan : aucune prime lisible');
select is_empty($$ select 1 from public.commercial_bonus_settings $$, 'artisan : réglages illisibles');
reset role;

select pg_temp.connecter('c1080000-0000-4000-8000-000000000009', 'particulier');
set local role authenticated;
select throws_ok($$ select public.commercial_results() $$, '42501', null, 'particulier : résultats refusés');
select is_empty($$ select 1 from public.commercial_bonuses $$, 'particulier : aucune prime lisible');
reset role;

select pg_temp.connecter('c1080000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select throws_ok($$ select public.commercial_results() $$, '42501', null, 'admin : « Mes résultats » réservé aux commerciaux');
reset role;

set local role anon;
select throws_ok($$ select 1 from public.commercial_bonuses $$, '42501', null, 'visiteur : aucun accès aux primes');
select throws_ok($$ select 1 from public.commercial_bonus_settings $$, '42501', null, 'visiteur : aucun accès aux réglages');
select throws_ok($$ select public.commercial_results() $$, '42501', null, 'visiteur : résultats inaccessibles');
select throws_ok($$ select * from public.admin_commercials_dashboard() $$, '42501', null, 'visiteur : tableau inaccessible');
reset role;

-- ---------- Back-office ----------
select pg_temp.connecter('c1080000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select results_eq(
  $$ select code, status::text, email, signups, validated, subscribed, followed, pending_bonuses, to_pay_cents,
       paid_cents, zone_codes_postaux
     from public.admin_commercials_dashboard() where code like '%-108' order by code $$,
  $$ values ('julien-108'::text, 'actif'::text, 'com108.julien@example.test'::text, 5, 3, 2, 2, 1, 1::bigint, 1::bigint,
             array['06', '20137']),
            ('lea-108', 'suspendu', 'com108.lea@example.test', 1, 1, 0, 0, 0, 0, 0, '{}'::text[]),
            ('sami-108', 'actif', 'com108.sami@example.test', 1, 1, 0, 1, 1, 0, 0, '{}'::text[]) $$,
  'tableau : inscrits, validés, abonnés, prospects suivis, primes et zone');
select is(
  public.admin_commercial_detail('c1082000-0000-4000-8000-000000000001') - 'artisans' - 'bonuses',
  jsonb_build_object('id', 'c1082000-0000-4000-8000-000000000001', 'nom', 'Julien Exemple', 'code', 'julien-108',
    'status', 'actif', 'email', 'com108.julien@example.test', 'zone_codes_postaux', '["06", "20137"]'::jsonb,
    'followed', 2),
  'fiche : identité, zone et prospects suivis');
select results_eq(
  $$ select e ->> 'nom', e ->> 'status', (e ->> 'subscribed')::boolean
     from jsonb_array_elements(public.admin_commercial_detail('c1082000-0000-4000-8000-000000000001') -> 'artisans') e
     order by e ->> 'nom' $$,
  $$ values ('CARRELAGE C108 CINQ'::text, 'valide'::text, true), ('ELEC C108 DEUX', 'suspendu', false),
            ('ENSEIGNE C108 UN', 'valide', true), ('MENUISERIE C108 SEPT', 'valide', false),
            ('TOITURE C108 SIX', 'brouillon', false) $$,
  'fiche : artisans inscrits avec son code');
select results_eq(
  $$ select e ->> 'artisan', e ->> 'kind', e ->> 'status', e ->> 'payout_reference', e ->> 'cancel_reason'
     from jsonb_array_elements(public.admin_commercial_detail('c1082000-0000-4000-8000-000000000001') -> 'bonuses') e
     where e ->> 'artisan' = 'ENSEIGNE C108 UN'
     order by e ->> 'kind' $$,
  $$ values ('ENSEIGNE C108 UN'::text, 'abonnement'::text, 'annulee'::text, null::text, 'Doublon de test.'::text),
            ('ENSEIGNE C108 UN', 'validation', 'payee', 'VIR-C108-1', null) $$,
  'fiche : primes avec référence et motif');
select is(jsonb_array_length(public.admin_commercial_detail('c1082000-0000-4000-8000-000000000001') -> 'bonuses'), 6,
  'fiche : toutes ses primes');
select is(public.admin_commercial_detail('c1089999-0000-4000-8000-000000000000'), null::jsonb,
  'fiche d''un commercial inconnu : null');
select results_eq(
  $$ select commercial, code, artisan, kind::text, amount_cents, validated_at = now()
     from public.admin_commercial_bonuses_to_pay() where code like '%-108' $$,
  $$ values ('Julien Exemple'::text, 'julien-108'::text, 'MENUISERIE C108 SEPT'::text, 'validation'::text, 1, true) $$,
  'export : primes à payer seulement');

-- ---------- Transfert et libération des prospects ----------
select throws_ok(
  $$ select public.admin_transfer_prospects('c1089999-0000-4000-8000-000000000000', 'c1082000-0000-4000-8000-000000000002') $$,
  '22023', 'Commercial introuvable.', 'transfert : commercial inconnu');
select throws_ok(
  $$ select public.admin_transfer_prospects('c1082000-0000-4000-8000-000000000001', 'c1082000-0000-4000-8000-000000000003') $$,
  '22023', 'Choisissez un autre commercial, actif.', 'transfert vers un commercial suspendu refusé');
select throws_ok(
  $$ select public.admin_transfer_prospects('c1082000-0000-4000-8000-000000000001', 'c1082000-0000-4000-8000-000000000001') $$,
  '22023', 'Choisissez un autre commercial, actif.', 'transfert vers lui-même refusé');
select is(
  public.admin_transfer_prospects('c1082000-0000-4000-8000-000000000001', 'c1082000-0000-4000-8000-000000000002'),
  2, 'transfert : ses prospects passent au collègue');
reset role;
select results_eq(
  $$ select prospect_id, commercial_id, status::text from public.prospect_follows
     where prospect_id::text like 'c1083000-%' order by prospect_id $$,
  $$ values ('c1083000-0000-4000-8000-000000000001'::uuid, 'c1082000-0000-4000-8000-000000000002'::uuid, 'a_contacter'::text),
            ('c1083000-0000-4000-8000-000000000002', 'c1082000-0000-4000-8000-000000000002', 'rdv_pris'),
            ('c1083000-0000-4000-8000-000000000003', 'c1082000-0000-4000-8000-000000000002', 'demo_faite') $$,
  'transfert : suivis repris avec leur étape');

select pg_temp.connecter('c1080000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select is(public.admin_transfer_prospects('c1082000-0000-4000-8000-000000000002', null), 3,
  'libération : ses suivis supprimés');
select is(public.admin_transfer_prospects('c1082000-0000-4000-8000-000000000001'), 0, 'libération sans suivi : zéro');
reset role;
select is_empty($$ select 1 from public.prospect_follows where prospect_id::text like 'c1083000-%' $$,
  'libération : prospects de nouveau libres');

-- ---------- Journal ----------
select results_eq(
  $$ select action, count(*)::int from public.audit_logs
     where action in ('commerciaux.reglages_primes', 'commerciaux.primes_payees', 'commercial.prime_annulee',
       'commercial.zone', 'commercial.prospects_transferes', 'commercial.prospects_liberes')
     group by action order by action $$,
  $$ values ('commercial.prime_annulee'::text, 1), ('commercial.prospects_liberes', 2),
            ('commercial.prospects_transferes', 1), ('commercial.zone', 1),
            ('commerciaux.primes_payees', 1), ('commerciaux.reglages_primes', 1) $$,
  'opérations du back-office journalisées');
select is(
  (select (data ->> 'nombre')::int from public.audit_logs where action = 'commercial.prospects_transferes'),
  2, 'transfert journalisé avec le nombre de prospects');

select * from finish();
rollback;
