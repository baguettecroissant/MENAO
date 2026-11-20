-- F-184 (ADR 0383) : engagement d'un an de l'abonnement artisan. Colonnes, preuve d'acceptation
-- (droits de chaque rôle), dates de l'engagement, rappels de fin d'essai et de reconduction,
-- confirmation d'arrêt, candidats au démarrage de l'essai.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('17801780-0000-4000-8000-000000000001', 'engag.a1@example.test', '{}', '{"account_type":"artisan","siret":"00017810200012"}'),
  ('17801780-0000-4000-8000-000000000002', 'engag.a2@example.test', '{}', '{"account_type":"artisan","siret":"00017820100012"}'),
  ('17801780-0000-4000-8000-000000000003', 'engag.part@example.test', '{}', '{}'),
  ('17801780-0000-4000-8000-000000000004', 'engag.sup@example.test', '{"role":"support"}', '{}'),
  ('17801780-0000-4000-8000-000000000005', 'engag.adm@example.test', '{"role":"admin"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;
create function pg_temp.artisan(uid uuid) returns uuid language sql as $$
  select id from public.artisans where user_id = uid;
$$;

-- ---------- Colonnes ----------
select has_column('public', 'subscriptions', 'engagement_version', 'colonne engagement_version');
select has_column('public', 'subscriptions', 'essai_demarre_le', 'colonne essai_demarre_le');
select has_column('public', 'subscriptions', 'cancel_at', 'colonne cancel_at');
select has_column('public', 'subscriptions', 'arret_demande_le', 'colonne arret_demande_le');
select has_column('public', 'subscriptions', 'arret_effet_le', 'colonne arret_effet_le');
select has_column('public', 'subscriptions', 'motif_arret', 'colonne motif_arret');
select throws_ok(
  $$ insert into public.subscriptions (artisan_id, stripe_customer_id, stripe_subscription_id, status, motif_arret)
     values (pg_temp.artisan('17801780-0000-4000-8000-000000000002'), 'cus_x', 'sub_x', 'active', 'nimporte') $$,
  '23514', null, 'motif d''arrêt hors liste refusé');

-- ---------- Dates de l'engagement ----------
select results_eq(
  $$ select debut, echeance, date_limite, rappel from app.subscription_term_dates('2027-03-15', '2027-09-01') $$,
  $$ values ('2027-03-15'::date, '2028-03-15'::date, '2027-12-14'::date, '2027-11-14'::date) $$,
  'première année : échéance, date limite d''arrêt (veille des 3 mois) et rappel 30 jours avant');
select results_eq(
  $$ select debut, echeance from app.subscription_term_dates('2027-03-15', '2028-03-15') $$,
  $$ values ('2028-03-15'::date, '2029-03-15'::date) $$,
  'à l''échéance, la période suivante commence');
select results_eq(
  $$ select echeance from app.subscription_term_dates('2028-02-29', '2031-06-01') $$,
  $$ values ('2032-02-29'::date) $$,
  'échéances comptées depuis le premier paiement, sans dérive d''un 29 février');

-- ---------- Preuve d'acceptation : droits ----------
insert into public.subscription_term_acceptances (artisan_id, user_id, version, texte, cgv_version, plan_code, periodicite)
values
  (pg_temp.artisan('17801780-0000-4000-8000-000000000001'), '17801780-0000-4000-8000-000000000001',
   '2026-11-20', 'Je m''engage pour douze mois.', 'projet-2026-11-20', 'base', 'mensuel'),
  (pg_temp.artisan('17801780-0000-4000-8000-000000000002'), '17801780-0000-4000-8000-000000000002',
   '2026-11-20', 'Je m''engage pour douze mois.', 'projet-2026-11-20', 'premium', 'annuel');

set local role authenticated;
select pg_temp.connecter('17801780-0000-4000-8000-000000000001', null);
select results_eq(
  $$ select count(*)::int from public.subscription_term_acceptances $$, array[1],
  'l''artisan lit sa propre acceptation, pas celle des autres');
select throws_ok(
  $$ insert into public.subscription_term_acceptances (artisan_id, user_id, version, texte, cgv_version, periodicite)
     values (pg_temp.artisan('17801780-0000-4000-8000-000000000001'), '17801780-0000-4000-8000-000000000001',
             'x', 'x', 'x', 'mensuel') $$,
  '42501', null, 'l''artisan ne peut pas écrire de preuve lui-même');
select throws_ok(
  $$ delete from public.subscription_term_acceptances $$,
  '42501', null, 'l''artisan ne peut pas effacer sa preuve');

select pg_temp.connecter('17801780-0000-4000-8000-000000000003', null);
select results_eq(
  $$ select count(*)::int from public.subscription_term_acceptances $$, array[0],
  'un particulier ne voit aucune acceptation');

select pg_temp.connecter('17801780-0000-4000-8000-000000000004', 'support');
select results_eq(
  $$ select count(*)::int from public.subscription_term_acceptances $$, array[0],
  'le support ne voit pas les acceptations');

select pg_temp.connecter('17801780-0000-4000-8000-000000000005', 'admin', 'aal2');
select results_eq(
  $$ select count(*)::int from public.subscription_term_acceptances $$, array[2],
  'l''administration voit toutes les acceptations');
reset role;

set local role anon;
select throws_ok(
  $$ select count(*) from public.subscription_term_acceptances $$,
  '42501', null, 'aucun accès anonyme');
reset role;

set local role authenticated;
select pg_temp.connecter('17801780-0000-4000-8000-000000000001', null);
select throws_ok(
  $$ select * from public.subscription_trial_start_candidates(10) $$,
  '42501', null, 'les candidats au démarrage de l''essai sont réservés au serveur');
reset role;

-- ---------- Rappels ----------
-- a1 : engagé, essai démarré, premier paiement dans 7 jours.
insert into public.subscriptions
  (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status, trial_end, engagement_version, essai_demarre_le)
values
  (pg_temp.artisan('17801780-0000-4000-8000-000000000001'), 'base', 'cus_a1', 'sub_a1', 'trialing',
   '2027-03-15 09:00+01', '2026-11-20', '2027-01-14 09:00+01');

select app.remind_subscription_term('2027-03-08 10:00+01');
select results_eq(
  $$ select data->>'etape', data->>'premier_paiement', (data->>'montant_centimes')::int
     from public.notifications
     where type = 'essai_fin_proche' and user_id = '17801780-0000-4000-8000-000000000001' $$,
  $$ values ('7', '2027-03-15', 15000) $$,
  'rappel de fin d''essai 7 jours avant le premier paiement, avec le montant');
select app.remind_subscription_term('2027-03-09 10:00+01');
select results_eq(
  $$ select count(*)::int from public.notifications where type = 'essai_fin_proche' $$, array[1],
  'le rappel des 7 jours n''est pas répété');
select app.remind_subscription_term('2027-03-14 10:00+01');
select results_eq(
  $$ select count(*)::int from public.notifications where type = 'essai_fin_proche' and data->>'etape' = '1' $$,
  array[1], 'second rappel la veille du premier paiement');

-- a1 passe actif : rappel de reconduction à partir du 14 novembre 2027.
update public.subscriptions set status = 'active' where stripe_subscription_id = 'sub_a1';
select app.remind_subscription_term('2027-11-13 10:00+01');
select results_eq(
  $$ select count(*)::int from public.notifications where type = 'abonnement_reconduction' $$, array[0],
  'pas de rappel de reconduction avant le jour prévu');
select app.remind_subscription_term('2027-11-20 10:00+01');
select results_eq(
  $$ select data->>'echeance', data->>'date_limite' from public.notifications where type = 'abonnement_reconduction' $$,
  $$ values ('2028-03-15', '2027-12-14') $$,
  'rappel de reconduction, rattrapé s''il a été manqué, avec l''échéance et la date limite');
select app.remind_subscription_term('2027-11-21 10:00+01');
select results_eq(
  $$ select count(*)::int from public.notifications where type = 'abonnement_reconduction' $$, array[1],
  'un seul rappel de reconduction par échéance');

-- ---------- Confirmation d'arrêt ----------
update public.subscriptions
  set arret_demande_le = now(), arret_effet_le = '2028-03-14', motif_arret = 'prix', cancel_at = '2028-03-15 00:00+01'
  where stripe_subscription_id = 'sub_a1';
select results_eq(
  $$ select data->>'fin' from public.notifications where type = 'abonnement_arret' $$,
  $$ values ('2028-03-14') $$,
  'la demande d''arrêt envoie une confirmation avec le dernier jour');
select app.remind_subscription_term('2028-11-20 10:00+01');
select results_eq(
  $$ select count(*)::int from public.notifications where type = 'abonnement_reconduction' $$, array[1],
  'plus aucun rappel après une demande d''arrêt');

-- ---------- Abonnement souscrit avant l'engagement ----------
insert into public.subscriptions
  (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status, trial_end)
values
  (pg_temp.artisan('17801780-0000-4000-8000-000000000002'), 'base', 'cus_a2', 'sub_a2', 'trialing', '2027-03-15 09:00+01');
select app.remind_subscription_term('2027-03-08 10:00+01');
select results_eq(
  $$ select count(*)::int from public.notifications where user_id = '17801780-0000-4000-8000-000000000002' $$,
  array[0], 'aucun rappel d''engagement pour un abonnement souscrit avant');
select results_eq(
  $$ select count(*)::int from public.subscription_trial_start_candidates(10) $$, array[0],
  'fiche non visible : l''essai ne démarre pas');

select * from finish();
rollback;
