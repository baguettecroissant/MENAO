-- Notifications manquantes (F-41, ADR 0183) : demande envoyée (particulier), dossier envoyé
-- (artisan), relances du devis et devis expiré, réponse à un avis, démarrage des travaux demain,
-- filleul validé. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('fd000000-0000-4000-8000-000000000001', 'notif100.client@example.test', false, now(), '{}', '{}'),
  ('fd000000-0000-4000-8000-000000000002', 'notif100.verif@example.test', false, now(), '{}', '{}'),
  ('fd100000-0000-4000-8000-000000000001', 'notif100.parrain@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('fd100000-0000-4000-8000-000000000002', 'notif100.plombier@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('fd100000-0000-4000-8000-000000000003', 'notif100.filleul@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('fd100000-0000-4000-8000-000000000004', 'notif100.annule@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('fd100000-0000-4000-8000-000000000005', 'notif100.dossier@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('fd100000-0000-4000-8000-000000000006', 'notif100.renvoi@example.test', false, now(), '{"role":"artisan"}', '{}');
update public.profiles set first_name = 'Camille', last_name = 'Durand'
where user_id = 'fd000000-0000-4000-8000-000000000001';
update public.profiles set first_name = 'Xavier' where user_id = 'fd100000-0000-4000-8000-000000000002';

insert into public.artisans (id, user_id, status, raison_sociale, nom_commercial, zone_mode, submitted_at) values
  ('fd200000-0000-4000-8000-000000000001', 'fd100000-0000-4000-8000-000000000001', 'valide', 'PARRAIN 100', null, 'communes', null),
  ('fd200000-0000-4000-8000-000000000002', 'fd100000-0000-4000-8000-000000000002', 'valide', 'PLOMB 100', null, 'communes', null),
  ('fd200000-0000-4000-8000-000000000003', 'fd100000-0000-4000-8000-000000000003', 'en_verification', 'FILLEUL 100',
   'Carrelage Exemple', 'communes', now()),
  ('fd200000-0000-4000-8000-000000000004', 'fd100000-0000-4000-8000-000000000004', 'en_verification', 'ANNULE 100', null,
   'communes', now()),
  ('fd200000-0000-4000-8000-000000000005', 'fd100000-0000-4000-8000-000000000005', 'brouillon', 'DOSSIER 100', null, 'communes', null),
  ('fd200000-0000-4000-8000-000000000006', 'fd100000-0000-4000-8000-000000000006', 'refuse', 'RENVOI 100', null, 'communes',
   now() - interval '5 days');
insert into public.artisan_referrals (referrer_artisan_id, referred_artisan_id, status, cancel_reason) values
  ('fd200000-0000-4000-8000-000000000001', 'fd200000-0000-4000-8000-000000000003', 'en_attente', null),
  ('fd200000-0000-4000-8000-000000000001', 'fd200000-0000-4000-8000-000000000004', 'annule', 'Même entreprise que le parrain');

-- Jour J+n et midi (heure de Paris) de ce jour : instants de référence des tâches quotidiennes.
create function pg_temp.jour(n int) returns date language sql as $$
  select (now() at time zone 'Europe/Paris')::date + n
$$;
create function pg_temp.midi(n int) returns timestamptz language sql as $$
  select (pg_temp.jour(n) + time '12:00') at time zone 'Europe/Paris'
$$;

-- ---------- 2. Dossier envoyé : accusé de réception à l'artisan ----------
update public.artisans set status = 'en_verification', submitted_at = now()
where id in ('fd200000-0000-4000-8000-000000000005', 'fd200000-0000-4000-8000-000000000006');
select results_eq(
  $$ select user_id, data from public.notifications where type = 'dossier_envoye' and user_id::text like 'fd1%'
     order by user_id $$,
  $$ values ('fd100000-0000-4000-8000-000000000005'::uuid, '{"renvoi": false}'::jsonb),
            ('fd100000-0000-4000-8000-000000000006', '{"renvoi": true}') $$,
  'dossier envoyé : accusé de réception, premier envoi ou dossier complété');
update public.artisans set presentation = 'Carreleur.' where id = 'fd200000-0000-4000-8000-000000000005';
select is((select count(*)::int from public.notifications where type = 'dossier_envoye' and user_id::text like 'fd1%'), 2,
  'autre modification du dossier : pas de nouvel accusé');

-- ---------- 6. Filleul validé : le parrain est prévenu ----------
update public.artisans set status = 'valide'
where id in ('fd200000-0000-4000-8000-000000000003', 'fd200000-0000-4000-8000-000000000004');
select results_eq(
  $$ select user_id, data from public.notifications where type = 'filleul_valide' $$,
  $$ values ('fd100000-0000-4000-8000-000000000001'::uuid,
       '{"artisan_id": "fd200000-0000-4000-8000-000000000003", "filleul": "Carrelage Exemple"}'::jsonb) $$,
  'filleul validé : le parrain est prévenu (parrainage annulé : rien)');
update public.artisans set status = 'suspendu' where id = 'fd200000-0000-4000-8000-000000000003';
update public.artisans set status = 'valide' where id = 'fd200000-0000-4000-8000-000000000003';
select is((select count(*)::int from public.notifications where type = 'filleul_valide'), 1,
  'filleul validé de nouveau après une suspension : une seule notification');

-- ---------- 1. Demande envoyée : confirmation au particulier ----------
-- Chantier à deux métiers (projet principal et lot) : une demande par lot, plus une demande
-- retenue pour vérification ; un autre particulier dont la seule demande est retenue.
insert into public.projects (id, user_id, parent_project_id, description, summary, trade_code, ville_code_insee, ville_nom) values
  ('fd300000-0000-4000-8000-000000000001', 'fd000000-0000-4000-8000-000000000001', null,
   'Refaire entièrement la salle de bains', 'Rénovation de salle de bains', 'plombier', '06088', 'Nice'),
  ('fd300000-0000-4000-8000-000000000002', 'fd000000-0000-4000-8000-000000000001', 'fd300000-0000-4000-8000-000000000001',
   'Refaire entièrement la salle de bains', null, 'carreleur', '06088', 'Nice'),
  ('fd300000-0000-4000-8000-000000000003', 'fd000000-0000-4000-8000-000000000002', null,
   'Repeindre le salon', null, 'peintre', '06088', 'Nice');
insert into public.requests (project_id, artisan_id, particulier_id, contact_phone, status) values
  ('fd300000-0000-4000-8000-000000000001', 'fd200000-0000-4000-8000-000000000002', 'fd000000-0000-4000-8000-000000000001',
   '+33612345678', 'envoyee'),
  ('fd300000-0000-4000-8000-000000000002', 'fd200000-0000-4000-8000-000000000003', 'fd000000-0000-4000-8000-000000000001',
   '+33612345678', 'envoyee'),
  ('fd300000-0000-4000-8000-000000000001', 'fd200000-0000-4000-8000-000000000001', 'fd000000-0000-4000-8000-000000000001',
   '+33612345678', 'a_verifier'),
  ('fd300000-0000-4000-8000-000000000003', 'fd200000-0000-4000-8000-000000000001', 'fd000000-0000-4000-8000-000000000002',
   '+33612345679', 'a_verifier');
select is_empty($$ select 1 from public.notifications where type = 'demande_envoyee' $$,
  'confirmation envoyée à la validation de l''envoi, pas à chaque demande');
set constraints public.requests_notify_sent immediate;
select results_eq(
  $$ select user_id, data from public.notifications where type = 'demande_envoyee' $$,
  $$ values ('fd000000-0000-4000-8000-000000000001'::uuid,
       '{"project_id": "fd300000-0000-4000-8000-000000000001", "titre": "Rénovation de salle de bains", "nb": 2}'::jsonb) $$,
  'demande envoyée : une confirmation pour tout le chantier, demandes retenues pour vérification non comptées');

-- ---------- 3. Relances du devis et devis expiré ----------
-- Chantier A : devis envoyé aujourd'hui, valable 30 jours. Chantier B : devis signé.
insert into public.projects (id, user_id, description, trade_code, ville_code_insee, ville_nom)
select ('fd300000-0000-4000-8000-00000000001' || n)::uuid, 'fd000000-0000-4000-8000-000000000001', 'Projet ' || n,
  'plombier', '06088', 'Nice'
from generate_series(1, 2) n;
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone, status)
select ('fd400000-0000-4000-8000-00000000000' || n)::uuid, ('fd300000-0000-4000-8000-00000000001' || n)::uuid,
  'fd200000-0000-4000-8000-000000000002', 'fd000000-0000-4000-8000-000000000001', '+33612345678', 'acceptee'
from generate_series(1, 2) n;
insert into public.chantiers (id, project_id, request_id, artisan_id, particulier_id, title, adresse, code_postal, ville_nom)
select ('fd500000-0000-4000-8000-00000000000' || n)::uuid, r.project_id, r.id, r.artisan_id, r.particulier_id,
  case n when 1 then 'Salle de bains' else 'Cuisine' end, '12 rue de l''Exemple', '06000', 'Nice'
from generate_series(1, 2) n
join public.requests r on r.id = ('fd400000-0000-4000-8000-00000000000' || n)::uuid;
select public.transition_chantier('fd500000-0000-4000-8000-000000000001', 'rdv_fixe');
select public.transition_chantier('fd500000-0000-4000-8000-000000000001', 'devis_envoye');
select public.transition_chantier('fd500000-0000-4000-8000-000000000002', 'rdv_fixe');
select public.transition_chantier('fd500000-0000-4000-8000-000000000002', 'devis_envoye');
insert into public.quotes (id, chantier_id, artisan_id, status, numero, sent_at, valid_until, start_date,
  duration_days, payment_schedule, document)
select ('fd600000-0000-4000-8000-00000000000' || n)::uuid, ('fd500000-0000-4000-8000-00000000000' || n)::uuid,
  'fd200000-0000-4000-8000-000000000002', 'envoye', 'DEVIS-2026-910' || n, now(), pg_temp.jour(30), pg_temp.jour(40),
  5, '[]'::jsonb, '{}'::jsonb
from generate_series(1, 2) n;
select public.transition_chantier('fd500000-0000-4000-8000-000000000002', 'devis_signe');

select is(app.remind_quotes(pg_temp.midi(1)), 0, 'J+1 : pas de relance');
select is(app.remind_quotes(pg_temp.midi(4)), 1, 'J+4 : devis sans réponse, client relancé (devis signé : rien)');
select is(app.remind_quotes(pg_temp.midi(5)), 0, 'une seule relance « sans réponse »');
select is(app.remind_quotes(pg_temp.midi(27)), 1, '3 jours avant la fin de validité : client relancé');
select is(app.remind_quotes(pg_temp.midi(28)), 0, 'une seule relance « expire bientôt »');
select is(app.remind_quotes(pg_temp.midi(30)), 0, 'dernier jour de validité : rien');
select is(app.remind_quotes(pg_temp.midi(31)), 1, 'validité dépassée : l''artisan est prévenu');
select is(app.remind_quotes(pg_temp.midi(32)), 0, 'une seule notification « devis expiré »');
select is(app.remind_quotes(pg_temp.midi(45)), 0, 'devis expiré depuis plus de 7 jours : rien');
select results_eq(
  $$ select user_id, data ->> 'moment', data ->> 'quote_id', data ->> 'titre', data ->> 'artisan', data ->> 'date_fin'
     from public.notifications where type = 'devis_relance' order by data ->> 'moment' desc $$,
  $$ values ('fd000000-0000-4000-8000-000000000001'::uuid, 'sans_reponse'::text, 'fd600000-0000-4000-8000-000000000001'::text,
             'Salle de bains'::text, 'Xavier'::text, pg_temp.jour(30)::text),
            ('fd000000-0000-4000-8000-000000000001', 'expire_bientot', 'fd600000-0000-4000-8000-000000000001',
             'Salle de bains', 'Xavier', pg_temp.jour(30)::text) $$,
  'relances du client : devis, chantier, artisan et date de fin de validité');
select results_eq(
  $$ select user_id, data ->> 'quote_id', data ->> 'titre', data ->> 'client', data ->> 'date_fin'
     from public.notifications where type = 'devis_expire' $$,
  $$ values ('fd100000-0000-4000-8000-000000000002'::uuid, 'fd600000-0000-4000-8000-000000000001'::text,
             'Salle de bains'::text, 'Camille Durand'::text, pg_temp.jour(30)::text) $$,
  'devis expiré : l''artisan est prévenu, avec le client');

-- ---------- 5. Démarrage des travaux demain ----------
select public.transition_chantier('fd500000-0000-4000-8000-000000000002', 'acompte_paye');
update public.chantiers set start_at = (pg_temp.jour(1) + time '08:30') at time zone 'Europe/Paris'
where id = 'fd500000-0000-4000-8000-000000000002';
select public.transition_chantier('fd500000-0000-4000-8000-000000000002', 'date_confirmee');
select is(app.remind_chantier_starts(pg_temp.midi(-1)), 0, 'démarrage dans 2 jours : pas encore de rappel');
select is(app.remind_chantier_starts(now()), 1, 'démarrage demain : rappel');
select is(app.remind_chantier_starts(now()), 0, 'un seul rappel par date de démarrage');
select results_eq(
  $$ select user_id, data ->> 'destinataire', data ->> 'titre', data ->> 'artisan', data ->> 'client', data ->> 'adresse',
       (data ->> 'demarrage')::timestamptz = (pg_temp.jour(1) + time '08:30') at time zone 'Europe/Paris'
     from public.notifications where type = 'demarrage_rappel' order by data ->> 'destinataire' $$,
  $$ values ('fd100000-0000-4000-8000-000000000002'::uuid, 'artisan'::text, 'Cuisine'::text, null::text,
             'Camille Durand'::text, '12 rue de l''Exemple'::text, true),
            ('fd000000-0000-4000-8000-000000000001', 'client', 'Cuisine', 'Xavier', null, null, true) $$,
  'rappel au client (artisan) et à l''artisan (client, adresse), avec l''heure de démarrage');
update public.chantiers set start_at = (pg_temp.jour(2) + time '09:00') at time zone 'Europe/Paris'
where id = 'fd500000-0000-4000-8000-000000000002';
select is(app.remind_chantier_starts(pg_temp.midi(1)), 1, 'date de démarrage modifiée : nouveau rappel la veille');

-- ---------- 4. Réponse de l'artisan à un avis ----------
insert into public.reviews (id, chantier_id, artisan_id, particulier_id, author_name, quality, delays, communication,
  value_for_money, score, comment, experience_on) values
  ('fd700000-0000-4000-8000-000000000001', 'fd500000-0000-4000-8000-000000000002', 'fd200000-0000-4000-8000-000000000002',
   'fd000000-0000-4000-8000-000000000001', 'Camille D.', 90, 90, 90, 'excellent', 90,
   'Travail soigné et dans les temps, artisan à l''écoute et de bon conseil.', current_date);
select is_empty($$ select 1 from public.notifications where type = 'avis_reponse' $$, 'avis sans réponse : rien');
update public.reviews set reply = 'Merci pour votre confiance.', replied_at = now()
where id = 'fd700000-0000-4000-8000-000000000001';
select results_eq(
  $$ select user_id, data from public.notifications where type = 'avis_reponse' $$,
  $$ values ('fd000000-0000-4000-8000-000000000001'::uuid,
       '{"chantier_id": "fd500000-0000-4000-8000-000000000002", "titre": "Cuisine", "artisan": "Xavier",
         "reponse": "Merci pour votre confiance."}'::jsonb) $$,
  'réponse à un avis : le client est prévenu, avec la réponse');
update public.reviews set reply = 'Merci encore.' where id = 'fd700000-0000-4000-8000-000000000001';
select is((select count(*)::int from public.notifications where type = 'avis_reponse'), 1,
  'réponse modifiée : pas de seconde notification');

-- ---------- Préférences et droits ----------
select results_eq(
  $$ select app.notification_category(t::public.notification_type) from unnest(array['demande_envoyee', 'dossier_envoye',
     'devis_expire', 'devis_relance', 'demarrage_rappel', 'avis_reponse', 'filleul_valide']) t $$,
  $$ values ('transactionnel'::text), ('transactionnel'), ('transactionnel'), ('rappels'), ('rappels'), ('activite'),
            ('activite') $$,
  'confirmations toujours envoyées ; relances et rappels (« rappels »), réponse et filleul (« activité ») désactivables');
select ok(not has_function_privilege('authenticated', 'app.remind_quotes(timestamptz)', 'execute'),
  'clients et artisans ne lancent pas les relances de devis');
select ok(not has_function_privilege('anon', 'app.remind_quotes(timestamptz)', 'execute'),
  'visiteurs : pas de relance de devis');
select ok(not has_function_privilege('authenticated', 'app.remind_chantier_starts(timestamptz)', 'execute'),
  'clients et artisans ne lancent pas les rappels de démarrage');
select ok(not has_function_privilege('anon', 'app.remind_chantier_starts(timestamptz)', 'execute'),
  'visiteurs : pas de rappel de démarrage');
select ok(exists (select 1 from cron.job where jobname = 'menao-relance-devis'), 'relances de devis planifiées chaque jour');
select ok(exists (select 1 from cron.job where jobname = 'menao-rappel-demarrage'),
  'rappels de démarrage planifiés chaque jour');

select * from finish();
rollback;
