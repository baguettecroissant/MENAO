-- F-54, F-58 (lot 5a, ADR 0051) : paiements des chantiers, abonnements des artisans (revenu
-- mensuel récurrent, résiliations, impayés) et notifications des services en échec, en lecture
-- seule pour les admins avec double authentification.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('d4100000-0000-4000-8000-000000000001', 'argent.client@example.test', false, now(), '{}',
   '{"first_name":"Camille","last_name":"Versement"}'),
  ('d4200000-0000-4000-8000-000000000001', 'argent.a1@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('d4200000-0000-4000-8000-000000000002', 'argent.a2@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('d4200000-0000-4000-8000-000000000003', 'argent.a3@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('d4200000-0000-4000-8000-000000000004', 'argent.a4@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('d4200000-0000-4000-8000-000000000005', 'argent.a5@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('d4300000-0000-4000-8000-000000000001', 'argent.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('d4300000-0000-4000-8000-000000000002', 'argent.support@example.test', false, now(), '{"role":"support"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Accès : admins avec double authentification seulement ----------
select pg_temp.connecter('d4100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok($$ select * from public.admin_payments() $$, '42501', null, 'particulier : pas de paiements');
select throws_ok($$ select public.admin_subscription_summary() $$, '42501', null, 'particulier : pas d''abonnements');
select throws_ok($$ select * from public.admin_webhook_events() $$, '42501', null, 'particulier : pas de notifications');
reset role;

select pg_temp.connecter('d4300000-0000-4000-8000-000000000002', 'support', 'aal2');
set local role authenticated;
select throws_ok($$ select * from public.admin_payments() $$, '42501', null, 'support : pas de paiements');
select throws_ok($$ select public.admin_payment_summary() $$, '42501', null, 'support : pas de chiffres des paiements');
select throws_ok($$ select * from public.admin_subscriptions() $$, '42501', null, 'support : pas d''abonnements');
select throws_ok($$ select public.admin_webhook_counts() $$, '42501', null, 'support : pas de notifications');
reset role;

select pg_temp.connecter('d4300000-0000-4000-8000-000000000001', 'admin', 'aal1');
set local role authenticated;
select throws_ok($$ select public.admin_payment_counts() $$, '42501', null, 'admin sans double authentification : refusé');
select throws_ok($$ select public.admin_subscription_counts() $$, '42501', null,
  'admin sans double authentification : abonnements refusés');
reset role;

select ok(not has_function_privilege('anon', 'public.admin_payments(text, text, integer, integer)', 'execute'),
  'visiteur : fonction des paiements non exécutable');
select ok(not has_function_privilege('authenticated', 'public.record_webhook_failure(text, text)', 'execute'),
  'échec d''une notification : pas enregistrable par un utilisateur');
select ok(has_function_privilege('service_role', 'public.record_webhook_failure(text, text)', 'execute'),
  'échec d''une notification : enregistré par les Edge Functions');

-- ---------- Chiffres avant les nouvelles données ----------
select pg_temp.connecter('d4300000-0000-4000-8000-000000000001', 'admin', 'aal2');
set local role authenticated;
select set_config('test.abonnements_avant', public.admin_subscription_summary()::text, true);
select set_config('test.paiements_avant', public.admin_payment_summary()::text, true);
select set_config('test.vue_avant', public.admin_overview()::text, true);
reset role;

-- ---------- Abonnements : un par situation ----------
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode) values
  ('d4400000-0000-4000-8000-000000000001', 'd4200000-0000-4000-8000-000000000001', 'valide', 'ABO TEST ACTIF', 'communes'),
  ('d4400000-0000-4000-8000-000000000002', 'd4200000-0000-4000-8000-000000000002', 'valide', 'ABO TEST IMPAYE', 'communes'),
  ('d4400000-0000-4000-8000-000000000003', 'd4200000-0000-4000-8000-000000000003', 'valide', 'ABO TEST ESSAI', 'communes'),
  ('d4400000-0000-4000-8000-000000000004', 'd4200000-0000-4000-8000-000000000004', 'valide', 'ABO TEST RESILIE', 'communes'),
  ('d4400000-0000-4000-8000-000000000005', 'd4200000-0000-4000-8000-000000000005', 'valide', 'ABO TEST FIN', 'communes');
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status,
  cancel_at_period_end, ended_at, created_at) values
  ('d4400000-0000-4000-8000-000000000001', 'base', 'cus_t1', 'sub_t1', 'active', false, null, now() - interval '60 days'),
  ('d4400000-0000-4000-8000-000000000002', 'premium', 'cus_t2', 'sub_t2', 'past_due', false, null, now() - interval '60 days'),
  ('d4400000-0000-4000-8000-000000000003', 'base', 'cus_t3', 'sub_t3', 'trialing', false, null, now()),
  ('d4400000-0000-4000-8000-000000000004', 'base', 'cus_t4', 'sub_t4', 'canceled', false, now() - interval '10 days',
   now() - interval '90 days'),
  ('d4400000-0000-4000-8000-000000000005', 'base', 'cus_t5', 'sub_t5', 'active', true, null, now());

-- ---------- Paiements d'un chantier : payé, en cours, échoué, annulé ----------
insert into public.projects (id, user_id, description, trade_code, ville_code_insee, ville_nom) values
  ('d4500000-0000-4000-8000-000000000001', 'd4100000-0000-4000-8000-000000000001', 'Remplacer le ballon d''eau chaude.',
   'plombier', '06088', 'Nice');
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone) values
  ('d4600000-0000-4000-8000-000000000001', 'd4500000-0000-4000-8000-000000000001',
   'd4400000-0000-4000-8000-000000000001', 'd4100000-0000-4000-8000-000000000001', '+33612345678');
insert into public.chantiers (id, project_id, request_id, artisan_id, particulier_id, title) values
  ('d4700000-0000-4000-8000-000000000001', 'd4500000-0000-4000-8000-000000000001',
   'd4600000-0000-4000-8000-000000000001', 'd4400000-0000-4000-8000-000000000001',
   'd4100000-0000-4000-8000-000000000001', 'Chantier argent test');
insert into public.quotes (id, chantier_id, artisan_id, numero) values
  ('d4800000-0000-4000-8000-000000000001', 'd4700000-0000-4000-8000-000000000001',
   'd4400000-0000-4000-8000-000000000001', 'DEVIS-2026-9461');
insert into public.payments (quote_id, chantier_id, artisan_id, kind, amount_cents, status, stripe_account_id, paid_at)
select 'd4800000-0000-4000-8000-000000000001', 'd4700000-0000-4000-8000-000000000001',
  'd4400000-0000-4000-8000-000000000001', k::public.payment_kind, m, s::public.payment_status, 'acct_test_argent', d
from (values
  ('acompte', 30000, 'paye', now() - interval '2 days'),
  ('solde', 70000, 'en_cours', null),
  ('solde', 70000, 'echoue', null),
  ('acompte', 30000, 'annule', null)
) as v (k, m, s, d);

-- ---------- Notifications des services : traitée, en échec, bloquée, rétablie, en cours ----------
insert into public.webhook_events (id, source, type, received_at, processed_at, failed_at, failures, last_error) values
  ('evt_argent_traitee', 'stripe', 'customer.subscription.updated', now() - interval '1 hour', now() - interval '1 hour', null, 0, null),
  ('evt_argent_echec', 'stripe', 'checkout.session.completed', now() - interval '2 hours', null, now() - interval '5 minutes', 2, 'PostgrestError 23505'),
  ('evt_argent_bloquee', 'stripe', 'account.updated', now() - interval '1 hour', null, null, 0, null),
  ('evt_argent_retablie', 'stripe', 'customer.subscription.deleted', now() - interval '3 hours', now() - interval '1 hour', now() - interval '2 hours', 1, 'Error'),
  ('docuseal:form.completed:argent', 'docuseal', 'form.completed', now(), null, null, 0, null);

set local role service_role;
select public.record_webhook_failure('docuseal:form.completed:argent', '  StripeConnectionError  ');
reset role;
select is(
  (select row(failures, last_error, failed_at is not null)::text from public.webhook_events
   where id = 'docuseal:form.completed:argent'),
  row(1, 'StripeConnectionError', true)::text,
  'échec enregistré : compteur, code technique et date');

-- ---------- Lecture par un admin ----------
select pg_temp.connecter('d4300000-0000-4000-8000-000000000001', 'admin', 'aal2');
set local role authenticated;

-- Abonnements : situation de chacun, filtres et recherche.
select results_eq(
  $$ select artisan, situation, formule, prix_cents from public.admin_subscriptions('tous', 'ABO TEST') order by artisan $$,
  $$ values ('ABO TEST ACTIF', 'actifs', 'Base', 15000), ('ABO TEST ESSAI', 'essais', 'Base', 15000),
            ('ABO TEST FIN', 'fin_programmee', 'Base', 15000), ('ABO TEST IMPAYE', 'impayes', 'Premium', 50000),
            ('ABO TEST RESILIE', 'resilies', 'Base', 15000) $$,
  'abonnements : une situation par abonnement');
select results_eq(
  $$ select artisan from public.admin_subscriptions('impayes', 'ABO TEST') $$,
  $$ values ('ABO TEST IMPAYE') $$,
  'abonnements : filtre des impayés');
select is(public.admin_subscription_counts('ABO TEST'),
  '{"tous": 5, "actifs": 1, "essais": 1, "impayes": 1, "fin_programmee": 1, "resilies": 1}'::jsonb,
  'abonnements : pastilles par situation');
select ok((select bool_and(total = 5) from public.admin_subscriptions('tous', 'ABO TEST')), 'abonnements : total');
select is((select count(*)::int from public.admin_subscriptions('tous', 'ABO TEST', 2, 0)), 2, 'abonnements : pagination');
select set_config('test.abonnements_apres', public.admin_subscription_summary()::text, true);

-- Paiements : filtres et recherche (chantier, artisan, client, numéro de devis).
select results_eq(
  $$ select kind, amount_cents, status, chantier, artisan, client, devis
     from public.admin_payments('tous', 'DEVIS-2026-9461') order by status $$,
  $$ values ('acompte', 30000::bigint, 'annule', 'Chantier argent test', 'ABO TEST ACTIF', 'Camille Versement', 'DEVIS-2026-9461'),
            ('solde', 70000::bigint, 'echoue', 'Chantier argent test', 'ABO TEST ACTIF', 'Camille Versement', 'DEVIS-2026-9461'),
            ('solde', 70000::bigint, 'en_cours', 'Chantier argent test', 'ABO TEST ACTIF', 'Camille Versement', 'DEVIS-2026-9461'),
            ('acompte', 30000::bigint, 'paye', 'Chantier argent test', 'ABO TEST ACTIF', 'Camille Versement', 'DEVIS-2026-9461') $$,
  'paiements : chantier, artisan, client et devis');
select results_eq(
  $$ select status from public.admin_payments('payes', 'Camille Versement') $$,
  $$ values ('paye') $$,
  'paiements : filtre des paiements reçus, recherche par client');
select results_eq(
  $$ select status from public.admin_payments('en_cours', 'Chantier argent test') $$,
  $$ values ('en_cours') $$,
  'paiements : filtre des paiements en cours, recherche par chantier');
select is(public.admin_payment_counts('DEVIS-2026-9461'),
  '{"tous": 4, "payes": 1, "en_cours": 1, "echoues": 1, "annules": 1}'::jsonb,
  'paiements : pastilles par statut');
select is_empty($$ select 1 from public.admin_payments('tous', '100%') $$,
  'paiements : % saisi pris au pied de la lettre');
select set_config('test.paiements_apres', public.admin_payment_summary()::text, true);

-- Notifications : en échec (dont bloquée), rétablies, toutes.
select results_eq(
  $$ select event_id, etat from public.admin_webhook_events('echecs') where event_id like '%argent%' order by event_id $$,
  $$ values ('docuseal:form.completed:argent', 'en_echec'), ('evt_argent_bloquee', 'bloquee'),
            ('evt_argent_echec', 'en_echec') $$,
  'notifications : en échec ou bloquées');
select results_eq(
  $$ select event_id, failures, last_error from public.admin_webhook_events('retablies') where event_id like '%argent%' $$,
  $$ values ('evt_argent_retablie', 1, 'Error') $$,
  'notifications : rétablies après un échec');
select ok(
  exists (select 1 from public.admin_webhook_events('toutes', 100) where event_id = 'evt_argent_traitee' and etat = 'traitee'),
  'notifications : toutes, avec leur état');
select ok((public.admin_webhook_counts() ->> 'echecs')::int >= 3, 'notifications : pastille des échecs');
select set_config('test.vue_apres', public.admin_overview()::text, true);
reset role;

-- ---------- Écarts des chiffres, comparés hors du rôle authentifié ----------
select results_eq(
  $$ select c.cle,
       (current_setting('test.abonnements_apres')::jsonb ->> c.cle)::int
         - (current_setting('test.abonnements_avant')::jsonb ->> c.cle)::int
     from unnest(array['actifs', 'essais', 'impayes', 'resilies_30j', 'payants', 'mrr_cents', 'essais_cents',
                       'impayes_cents', 'fin_programmee', 'en_cours_30j', 'perdus_30j', 'sans_formule']) as c (cle)
     order by 1 $$,
  $$ values ('actifs', 2), ('en_cours_30j', 3), ('essais', 1), ('essais_cents', 15000), ('fin_programmee', 1),
            ('impayes', 1), ('impayes_cents', 50000), ('mrr_cents', 80000), ('payants', 3), ('perdus_30j', 1),
            ('resilies_30j', 1), ('sans_formule', 0) $$,
  'abonnements : revenu mensuel récurrent (actifs et impayés relancés), essais, résiliations datées');
select ok(
  (select f ->> 'nom' = 'Premium' and (f ->> 'mrr_cents')::int = (f ->> 'payants')::int * 50000
   from jsonb_array_elements(current_setting('test.abonnements_apres')::jsonb -> 'formules') f
   where f ->> 'code' = 'premium'),
  'abonnements : revenu par formule, au tarif de la formule');
select results_eq(
  $$ select c.cle,
       (current_setting('test.paiements_apres')::jsonb ->> c.cle)::int
         - (current_setting('test.paiements_avant')::jsonb ->> c.cle)::int
     from unnest(array['payes_30j', 'payes_30j_cents', 'payes_cents', 'en_cours', 'en_cours_cents', 'echoues_7j']) as c (cle)
     order by 1 $$,
  $$ values ('echoues_7j', 1), ('en_cours', 1), ('en_cours_cents', 70000), ('payes_30j', 1),
            ('payes_30j_cents', 30000), ('payes_cents', 30000) $$,
  'paiements : versés aux artisans, en cours, échoués');
select results_eq(
  $$ select c.chemin::text,
       (current_setting('test.vue_apres')::jsonb #>> c.chemin)::int
         - (current_setting('test.vue_avant')::jsonb #>> c.chemin)::int
     from (values ('{abonnements,mrr_cents}'::text[]), ('{abonnements,resilies_30j}'), ('{notifications,echecs}')) as c (chemin)
     order by 1 $$,
  $$ values ('{abonnements,mrr_cents}', 80000), ('{abonnements,resilies_30j}', 1), ('{notifications,echecs}', 3) $$,
  'vue d''ensemble : revenu mensuel récurrent, résiliations et notifications en échec');

-- Un abonnement résilié il y a plus de 30 jours ne compte plus parmi les résiliations récentes.
update public.subscriptions set ended_at = now() - interval '40 days'
where artisan_id = 'd4400000-0000-4000-8000-000000000004';
select pg_temp.connecter('d4300000-0000-4000-8000-000000000001', 'admin', 'aal2');
set local role authenticated;
select set_config('test.abonnements_ancien', public.admin_subscription_summary()::text, true);
reset role;
select results_eq(
  $$ select c.cle,
       (current_setting('test.abonnements_ancien')::jsonb ->> c.cle)::int
         - (current_setting('test.abonnements_avant')::jsonb ->> c.cle)::int
     from unnest(array['resilies_30j', 'perdus_30j', 'en_cours_30j']) as c (cle)
     order by 1 $$,
  $$ values ('en_cours_30j', 2), ('perdus_30j', 0), ('resilies_30j', 0) $$,
  'résiliation ancienne : hors des 30 derniers jours, ni en cours au début de la période');

select * from finish();
rollback;
