-- Parrainage V2 (F-60, ADR 0154) : au premier paiement du filleul, un mois offert au parrain seul,
-- 12 par année civile au plus ; cadeau de bienvenue du filleul à la validation de son dossier,
-- choisi une fois (ticket pour l'équipe) ; parrain et filleul de la même entreprise (même SIREN) :
-- parrainage annulé ; lecture du cadeau par le filleul et l'équipe ; back-office. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c7800000-0000-4000-8000-000000000001', 'parr78.parrain@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c7800000-0000-4000-8000-000000000002', 'parr78.filleul@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c7800000-0000-4000-8000-000000000003', 'parr78.memeentreprise@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c7800000-0000-4000-8000-000000000004', 'parr78.memepaiement@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c7800000-0000-4000-8000-000000000005', 'parr78.admin@example.test', false, now(), '{"role":"admin"}', '{}');
insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, assujetti_tva) values
  ('c7810000-0000-4000-8000-000000000001', 'c7800000-0000-4000-8000-000000000001', 'valide',
   '00000078000015', 'PARRAIN EXEMPLE', '5710', '1 RUE DE L''EXEMPLE', '06000', 'NICE', 'communes', true),
  ('c7810000-0000-4000-8000-000000000002', 'c7800000-0000-4000-8000-000000000002', 'en_verification',
   '00000079800017', 'FILLEUL EXEMPLE', '5710', '2 AVENUE DE L''EXEMPLE', '06400', 'CANNES', 'communes', true),
  -- Deux établissements de l'entreprise du parrain (même SIREN).
  ('c7810000-0000-4000-8000-000000000003', 'c7800000-0000-4000-8000-000000000003', 'en_verification',
   '00000078000023', 'PARRAIN EXEMPLE', '5710', '3 RUE DE L''EXEMPLE', '06000', 'NICE', 'communes', true),
  ('c7810000-0000-4000-8000-000000000004', 'c7800000-0000-4000-8000-000000000004', 'en_verification',
   '00000078000031', 'PARRAIN EXEMPLE', '5710', '4 RUE DE L''EXEMPLE', '06000', 'NICE', 'communes', true);
insert into public.artisan_referrals (id, referrer_artisan_id, referred_artisan_id) values
  ('c7820000-0000-4000-8000-000000000002', 'c7810000-0000-4000-8000-000000000001', 'c7810000-0000-4000-8000-000000000002'),
  ('c7820000-0000-4000-8000-000000000003', 'c7810000-0000-4000-8000-000000000001', 'c7810000-0000-4000-8000-000000000003'),
  ('c7820000-0000-4000-8000-000000000004', 'c7810000-0000-4000-8000-000000000001', 'c7810000-0000-4000-8000-000000000004');
insert into public.subscriptions (artisan_id, stripe_customer_id, stripe_subscription_id, status) values
  ('c7810000-0000-4000-8000-000000000002', 'cus_parr78_f', 'sub_parr78_filleul', 'active'),
  ('c7810000-0000-4000-8000-000000000004', 'cus_parr78_m', 'sub_parr78_meme', 'active');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Validation du dossier : cadeau de bienvenue, sauf même entreprise ----------
update public.artisans set status = 'valide' where id = 'c7810000-0000-4000-8000-000000000002';
select is(
  (select referral_id from public.artisan_welcome_gifts where artisan_id = 'c7810000-0000-4000-8000-000000000002'),
  'c7820000-0000-4000-8000-000000000002'::uuid, 'filleul validé : cadeau de bienvenue à choisir');
update public.artisans set status = 'suspendu' where id = 'c7810000-0000-4000-8000-000000000002';
update public.artisans set status = 'valide' where id = 'c7810000-0000-4000-8000-000000000002';
select is((select count(*)::int from public.artisan_welcome_gifts where artisan_id = 'c7810000-0000-4000-8000-000000000002'),
  1, 'nouvelle validation après une suspension : toujours un seul cadeau');

update public.artisans set status = 'valide' where id = 'c7810000-0000-4000-8000-000000000003';
select is(
  (select status::text || ' : ' || cancel_reason from public.artisan_referrals where id = 'c7820000-0000-4000-8000-000000000003'),
  'annule : Même entreprise que le parrain (SIREN identique).', 'même SIREN que le parrain : parrainage annulé à la validation');
select is_empty($$ select 1 from public.artisan_welcome_gifts where artisan_id = 'c7810000-0000-4000-8000-000000000003' $$,
  'même SIREN : aucun cadeau');
select is((select count(*)::int from public.audit_logs where action = 'parrainage.annule'
           and target_id = 'c7810000-0000-4000-8000-000000000003'), 1, 'annulation journalisée');

-- ---------- Choix du cadeau par le filleul ----------
select pg_temp.connecter('c7800000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select is(public.my_welcome_gift() ->> 'status', 'a_choisir', 'filleul : cadeau à choisir');
select is(public.my_welcome_gift() -> 'address' ->> 'ligne', '2 AVENUE DE L''EXEMPLE', 'adresse pré-remplie avec celle de l''entreprise');
select is(public.my_welcome_gift() ->> 'referrer', 'PARRAIN EXEMPLE', 'nom du parrain');
select throws_ok($$ select public.choose_welcome_gift('tshirt', null, 'Prénom Nom', '2 avenue', '06400', 'Cannes') $$,
  '22023', 'Choisissez la taille du t-shirt.', 't-shirt sans taille : refusé');
select throws_ok($$ select public.choose_welcome_gift('veste', null, 'Prénom Nom', '2 avenue', '06400', 'Cannes') $$,
  '22023', 'Choisissez votre cadeau.', 'cadeau inconnu : refusé');
select throws_ok($$ select public.choose_welcome_gift('casquette', null, 'Prénom Nom', '2 avenue', '6400', 'Cannes') $$,
  '22023', 'Indiquez l''adresse de livraison.', 'code postal invalide : refusé');
select throws_ok($$ select public.choose_welcome_gift('casquette', null, '  ', '2 avenue', '06400', 'Cannes') $$,
  '22023', 'Indiquez le nom du destinataire.', 'destinataire vide : refusé');
select lives_ok($$ select public.choose_welcome_gift('tshirt', ' l ', ' Prénom Nom ', '2 avenue de l''Exemple', '06400', 'Cannes') $$,
  't-shirt taille L choisi');
select is(public.my_welcome_gift() ->> 'status', 'a_envoyer', 'cadeau demandé, à envoyer par l''équipe');
select is(public.my_welcome_gift() ->> 'size', 'L', 'taille normalisée');
select is(public.my_welcome_gift() -> 'address' ->> 'recipient', 'Prénom Nom', 'destinataire enregistré sans espaces');
select throws_ok($$ select public.choose_welcome_gift('casquette', null, 'Prénom Nom', '2 avenue', '06400', 'Cannes') $$,
  '22023', 'Votre cadeau est déjà demandé.', 'un seul choix');
reset role;

select is(
  (select t.type::text || ' : ' || t.subject from public.tickets t
   join public.artisan_welcome_gifts g on g.ticket_id = t.id
   where g.artisan_id = 'c7810000-0000-4000-8000-000000000002'),
  'recompense : Cadeau de bienvenue (parrainage) : t-shirt taille L', 'demande transmise à l''équipe (ticket « recompense »)');
update public.tickets set status = 'resolu', resolved_at = now()
where id = (select ticket_id from public.artisan_welcome_gifts where artisan_id = 'c7810000-0000-4000-8000-000000000002');

select pg_temp.connecter('c7800000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select is(public.my_welcome_gift() ->> 'status', 'envoye', 'ticket résolu : cadeau envoyé');
select is((select count(*)::int from public.artisan_welcome_gifts), 1, 'filleul : son cadeau seulement');
reset role;

-- ---------- Premier paiement du filleul : un mois au parrain seul ----------
select ok(public.record_subscription_payment('sub_parr78_filleul'), 'premier paiement du filleul');
select is((select status::text from public.artisan_referrals where id = 'c7820000-0000-4000-8000-000000000002'),
  'recompense', 'parrainage récompensé');
select results_eq(
  $$ select artisan_id from public.artisan_free_months where referral_id = 'c7820000-0000-4000-8000-000000000002' $$,
  $$ values ('c7810000-0000-4000-8000-000000000001'::uuid) $$,
  'un mois offert au parrain, aucun au filleul');

-- Même entreprise découverte au paiement (dossier jamais validé) : annulé, aucun mois.
select ok(public.record_subscription_payment('sub_parr78_meme'), 'premier paiement d''un établissement du parrain');
select is((select status::text from public.artisan_referrals where id = 'c7820000-0000-4000-8000-000000000004'),
  'annule', 'même SIREN au paiement : parrainage annulé');
select is_empty($$ select 1 from public.artisan_free_months where referral_id = 'c7820000-0000-4000-8000-000000000004' $$,
  'même SIREN au paiement : aucun mois offert');

-- ---------- Plafond : 12 mois offerts par année civile ----------
insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
select ('c7800000-0000-4000-8001-' || lpad(i::text, 12, '0'))::uuid, format('parr78.f%s@example.test', i),
  false, now(), '{"role":"artisan"}', '{}'
from generate_series(1, 12) i;
insert into public.artisans (id, user_id, status, zone_mode, assujetti_tva)
select ('c7810000-0000-4000-8001-' || lpad(i::text, 12, '0'))::uuid,
  ('c7800000-0000-4000-8001-' || lpad(i::text, 12, '0'))::uuid, 'brouillon', 'communes', true
from generate_series(1, 12) i;
-- 11 filleuls déjà récompensés cette année, plus celui du dessus : 12 mois.
insert into public.artisan_referrals (id, referrer_artisan_id, referred_artisan_id, status, rewarded_at)
select ('c7820000-0000-4000-8001-' || lpad(i::text, 12, '0'))::uuid, 'c7810000-0000-4000-8000-000000000001',
  ('c7810000-0000-4000-8001-' || lpad(i::text, 12, '0'))::uuid, 'recompense', now()
from generate_series(1, 11) i;
insert into public.artisan_free_months (artisan_id, referral_id)
select 'c7810000-0000-4000-8000-000000000001', ('c7820000-0000-4000-8001-' || lpad(i::text, 12, '0'))::uuid
from generate_series(1, 11) i;
insert into public.artisan_referrals (id, referrer_artisan_id, referred_artisan_id) values
  ('c7820000-0000-4000-8001-000000000012', 'c7810000-0000-4000-8000-000000000001', 'c7810000-0000-4000-8001-000000000012');
insert into public.subscriptions (artisan_id, stripe_customer_id, stripe_subscription_id, status) values
  ('c7810000-0000-4000-8001-000000000012', 'cus_parr78_12', 'sub_parr78_douzieme', 'active');

select is(app.referrer_months_this_year('c7810000-0000-4000-8000-000000000001'), 12, '12 mois gagnés cette année');
select ok(public.record_subscription_payment('sub_parr78_douzieme'), 'paiement d''un 13e filleul');
select is((select status::text from public.artisan_referrals where id = 'c7820000-0000-4000-8001-000000000012'),
  'recompense', 'plafond atteint : parrainage tout de même récompensé');
select is_empty($$ select 1 from public.artisan_free_months where referral_id = 'c7820000-0000-4000-8001-000000000012' $$,
  'plafond atteint : aucun mois offert de plus');

-- Un mois gagné l'an dernier ne compte pas pour l'année en cours.
update public.artisan_free_months set created_at = now() - interval '1 year'
where referral_id = 'c7820000-0000-4000-8001-000000000001';
select pg_temp.connecter('c7800000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select is((public.my_referral() ->> 'months_this_year')::int, 11, 'parrain : 11 mois cette année');
select is((public.my_referral() ->> 'months_earned')::int, 12, 'parrain : 12 mois en tout');
select ok(public.my_welcome_gift() is null, 'parrain inscrit sans parrain : pas de cadeau');
select is_empty($$ select 1 from public.artisan_welcome_gifts $$, 'parrain : ne voit pas le cadeau de son filleul');
select throws_ok($$ select public.choose_welcome_gift('casquette', null, 'Prénom Nom', '1 rue', '06000', 'Nice') $$,
  '22023', 'Aucun cadeau de bienvenue à choisir.', 'parrain : aucun cadeau à choisir');
reset role;

-- ---------- Back-office ----------
select pg_temp.connecter('c7800000-0000-4000-8000-000000000005', 'admin');
set local role authenticated;
select is((select gift from public.admin_referrals() where id = 'c7820000-0000-4000-8000-000000000002'),
  'envoye', 'liste : cadeau du filleul envoyé');
select is((select referred_month::text from public.admin_referrals() where id = 'c7820000-0000-4000-8000-000000000002'),
  null, 'liste : aucun mois pour le filleul');
select ok((public.admin_referral_summary() ->> 'cadeaux_a_envoyer') is not null, 'chiffres clés : cadeaux à envoyer');
select is(public.admin_artisan_referral('c7810000-0000-4000-8000-000000000002') -> 'cadeau' ->> 'item', 'tshirt',
  'fiche du filleul : cadeau choisi');
select is((public.admin_artisan_referral('c7810000-0000-4000-8000-000000000001') ->> 'mois_annee')::int, 11,
  'fiche du parrain : mois de l''année');
select is((select count(*)::int from public.artisan_welcome_gifts where artisan_id = 'c7810000-0000-4000-8000-000000000002'),
  1, 'équipe : lecture des cadeaux');
reset role;

-- Annulation d'un abus avant la récompense : le cadeau pas encore choisi disparaît.
insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c7800000-0000-4000-8000-000000000006', 'parr78.abus@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, assujetti_tva) values
  ('c7810000-0000-4000-8000-000000000006', 'c7800000-0000-4000-8000-000000000006', 'en_verification',
   '00000079800025', 'AUTRE EXEMPLE', '5710', '6 RUE DE L''EXEMPLE', '06000', 'NICE', 'communes', true);
insert into public.artisan_referrals (id, referrer_artisan_id, referred_artisan_id) values
  ('c7820000-0000-4000-8000-000000000006', 'c7810000-0000-4000-8000-000000000001', 'c7810000-0000-4000-8000-000000000006');
update public.artisans set status = 'valide' where id = 'c7810000-0000-4000-8000-000000000006';
select pg_temp.connecter('c7800000-0000-4000-8000-000000000005', 'admin');
set local role authenticated;
select is((select gift from public.admin_referrals() where id = 'c7820000-0000-4000-8000-000000000006'),
  'a_choisir', 'liste : cadeau à choisir');
select lives_ok($$ select public.admin_cancel_referral('c7820000-0000-4000-8000-000000000006', 'Abus repéré') $$,
  'annulation par un admin');
reset role;
select is_empty($$ select 1 from public.artisan_welcome_gifts where artisan_id = 'c7810000-0000-4000-8000-000000000006' $$,
  'parrainage annulé : cadeau retiré');

select * from finish();
rollback;
