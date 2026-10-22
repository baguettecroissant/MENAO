-- Nouveaux artisans (ADR 0160) : alerte « 6 demandes en 30 jours sans être choisi » (ticket
-- « Accompagnement », une fois, pas de nouvelle alerte pendant 30 jours) ; mois offert de démarrage
-- sans devis signé pendant les 2 premiers mois payants (une fois, compté à part du parrainage) ;
-- indicateur « premier chantier sous 60 jours ». Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e8300000-0000-4000-8000-000000000001', 'lot83.client@example.test', false, now(), '{"role":"particulier"}', '{}'),
  ('e8300000-0000-4000-8000-000000000099', 'lot83.admin@example.test', false, now(), '{"role":"admin"}', '{}');
insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
select ('e8300000-0000-4000-8000-00000000001' || a)::uuid, 'lot83.a' || a || '@example.test', false, now(),
  '{"role":"artisan"}', '{}'
from generate_series(1, 4) a;
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode)
select ('e8310000-0000-4000-8000-00000000000' || a)::uuid, ('e8300000-0000-4000-8000-00000000001' || a)::uuid,
  'valide', 'ACCOMP ' || a, 'communes'
from generate_series(1, 4) a;
update public.profiles set phone = '+33612345678' where user_id = 'e8300000-0000-4000-8000-000000000011';

-- Six demandes de 5 jours par artisan (deux acceptées), chacune sur son projet. Artisan 2 : la
-- 6e date de 40 jours. Artisan 4 : la 6e est retenue pour vérification.
insert into public.projects (id, user_id, description, trade_code, ville_code_insee, ville_nom)
select ('e8320000-0000-4000-8000-0000000000' || a || p)::uuid, 'e8300000-0000-4000-8000-000000000001',
  'Projet ' || a || p, 'plombier', '06088', 'Nice'
from generate_series(1, 4) a, generate_series(1, 6) p;
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone, created_at, expires_at, status)
select ('e8330000-0000-4000-8000-0000000000' || a || p)::uuid, ('e8320000-0000-4000-8000-0000000000' || a || p)::uuid,
  ('e8310000-0000-4000-8000-00000000000' || a)::uuid, 'e8300000-0000-4000-8000-000000000001', '+33612345678',
  case when a = 2 and p = 6 then now() - interval '40 days' else now() - interval '5 days' end,
  now() + interval '1 day',
  (case when a = 4 and p = 6 then 'a_verifier' when p <= 2 then 'acceptee' else 'envoyee' end)::public.request_status
from generate_series(1, 4) a, generate_series(1, 6) p;

-- Artisan 3 : deux devis signés (il y a 80 jours, puis il y a 20 jours).
insert into public.chantiers (id, project_id, request_id, artisan_id, particulier_id, title)
select ('e8340000-0000-4000-8000-00000000000' || p)::uuid, r.project_id, r.id, r.artisan_id, r.particulier_id, 'Chantier'
from generate_series(1, 2) p
join public.requests r on r.id = ('e8330000-0000-4000-8000-00000000003' || p)::uuid;
insert into public.quotes (chantier_id, artisan_id, status, numero, sent_at, valid_until, start_date,
  duration_days, payment_schedule, document)
select ('e8340000-0000-4000-8000-00000000000' || p)::uuid, 'e8310000-0000-4000-8000-000000000003', 'envoye',
  'DEVIS-2026-830' || p, now() - interval '90 days', current_date + 30, current_date + 40, 5, '[]'::jsonb, '{}'::jsonb
from generate_series(1, 2) p;
update public.quotes set status = 'signe', signed_pdf_path = artisan_id || '/signe.pdf',
  signed_at = case when numero = 'DEVIS-2026-8301' then now() - interval '80 days' else now() - interval '20 days' end
where artisan_id = 'e8310000-0000-4000-8000-000000000003';

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;
create function pg_temp.tickets(p_user uuid) returns int language sql as $$
  select count(*)::int from public.tickets where type = 'accompagnement' and user_id = p_user
$$;

-- ---------- Alerte « 6 demandes en 30 jours sans être choisi » ----------
select ok(app.flag_new_artisans_to_support() >= 1, 'tâche quotidienne : alerte créée');
select results_eq(
  $$ select contact_email, subject, status::text from public.tickets
     where type = 'accompagnement' and user_id = 'e8300000-0000-4000-8000-000000000011' $$,
  $$ values ('lot83.a1@example.test', 'Accompagnement : ACCOMP 1', 'ouvert') $$,
  'artisan jamais choisi, 6 demandes en 30 jours : ticket « Accompagnement »');
select matches(
  (select message from public.tickets where type = 'accompagnement' and user_id = 'e8300000-0000-4000-8000-000000000011'),
  '^6 demandes reçues en 30 jours \(2 acceptées, 0 sans réponse\), 0 devis envoyés, aucun devis signé.*\nTéléphone : \+33612345678$',
  'bilan des demandes et téléphone pour l''appeler');
select ok(
  (select due_at between now() + interval '47 hours' and now() + interval '49 hours' from public.tickets
   where type = 'accompagnement' and user_id = 'e8300000-0000-4000-8000-000000000011'),
  'échéance de deux jours');
select is(pg_temp.tickets('e8300000-0000-4000-8000-000000000012'), 0, '5 demandes sur 30 jours : pas d''alerte');
select is(pg_temp.tickets('e8300000-0000-4000-8000-000000000013'), 0, 'devis déjà signé : pas d''alerte');
select is(pg_temp.tickets('e8300000-0000-4000-8000-000000000014'), 0,
  'demande retenue pour vérification : non comptée');

select app.flag_new_artisans_to_support();
select is(pg_temp.tickets('e8300000-0000-4000-8000-000000000011'), 1, 'ticket ouvert : pas de doublon');
update public.tickets set status = 'resolu', resolved_at = now()
where type = 'accompagnement' and user_id = 'e8300000-0000-4000-8000-000000000011';
select app.flag_new_artisans_to_support();
select is(pg_temp.tickets('e8300000-0000-4000-8000-000000000011'), 1, 'ticket résolu : pas de nouvelle alerte avant 30 jours');
update public.tickets set created_at = now() - interval '31 days'
where type = 'accompagnement' and user_id = 'e8300000-0000-4000-8000-000000000011';
select app.flag_new_artisans_to_support();
select is(pg_temp.tickets('e8300000-0000-4000-8000-000000000011'), 2, '30 jours plus tard : nouvelle alerte');
update public.tickets set status = 'resolu', resolved_at = now(), created_at = now() - interval '31 days'
where type = 'accompagnement' and user_id = 'e8300000-0000-4000-8000-000000000011';
select app.flag_new_artisans_to_support(now() + interval '26 days');
select is(pg_temp.tickets('e8300000-0000-4000-8000-000000000011'), 2,
  'demandes de plus de 30 jours : plus d''alerte');

select pg_temp.connecter('e8300000-0000-4000-8000-000000000012', 'artisan');
set local role authenticated;
select is_empty($$ select 1 from public.tickets where type = 'accompagnement' $$,
  'un autre artisan ne lit pas le ticket');
reset role;

-- ---------- Mois offert de démarrage ----------
insert into public.subscriptions (artisan_id, stripe_customer_id, stripe_subscription_id, status, first_paid_at) values
  ('e8310000-0000-4000-8000-000000000001', 'cus_l83_1', 'sub_l83_1', 'active', now() - interval '2 months' + interval '1 hour'),
  ('e8310000-0000-4000-8000-000000000002', 'cus_l83_2', 'sub_l83_2', 'active', now() - interval '1 month'),
  ('e8310000-0000-4000-8000-000000000003', 'cus_l83_3', 'sub_l83_3', 'active', now() - interval '2 months'),
  ('e8310000-0000-4000-8000-000000000004', 'cus_l83_4', 'sub_l83_4', 'active', now() - interval '5 months');

select ok(public.grant_starter_month('sub_l83_1'),
  'facture qui suit les 2 premiers mois payants, sans devis signé : mois offert');
select results_eq(
  $$ select reason::text, status::text, referral_id from public.artisan_free_months
     where artisan_id = 'e8310000-0000-4000-8000-000000000001' $$,
  $$ values ('demarrage', 'a_appliquer', null::uuid) $$,
  'crédit à poser dans Stripe');
select is((select count(*)::int from public.free_month_candidates('sub_l83_1')), 1,
  'stripe-webhook le pose comme un mois de parrainage');
select ok(not public.grant_starter_month('sub_l83_1'), 'une seule fois');
select ok(not public.grant_starter_month('sub_l83_2'), 'premier mois payant : trop tôt');
select ok(public.grant_starter_month('sub_l83_2', now() + interval '1 month' + interval '1 hour'),
  'un mois plus tard : accordé');
select ok(not public.grant_starter_month('sub_l83_3'), 'devis signé pendant les 2 mois : pas de mois offert');
select ok(not public.grant_starter_month('sub_l83_4'), 'premier paiement trop ancien : rien');
select ok(not public.grant_starter_month('sub_inconnu'), 'abonnement inconnu : rien');

-- Le parrainage compte ses seuls mois.
select pg_temp.connecter('e8300000-0000-4000-8000-000000000011', 'artisan');
set local role authenticated;
select is(public.my_referral() ->> 'months_earned', '0', 'bilan du parrainage : sans le mois de démarrage');
select is((select reason::text from public.artisan_free_months), 'demarrage', 'l''artisan voit son mois offert');
select throws_ok($$ select public.grant_starter_month('sub_l83_1') $$, '42501', null,
  'réservé au serveur (stripe-webhook)');
select throws_ok($$ select public.admin_new_artisans() $$, '42501', null, 'indicateurs réservés aux admins');
reset role;

-- ---------- Indicateur « premier chantier sous 60 jours » ----------
-- Artisan 1 validé il y a 100 jours, sans devis signé ; artisan 3 validé il y a 90 jours, premier
-- devis signé 10 jours après ; artisan 2 validé il y a 30 jours (trop récent) ; artisan 4 il y a
-- 200 jours (trop ancien).
select pg_temp.connecter('e8300000-0000-4000-8000-000000000099', 'admin');
set local role authenticated;
select set_config('test.cohorte', public.admin_new_artisans() ->> 'cohorte', true);
select set_config('test.premier', public.admin_new_artisans() ->> 'premier_chantier', true);
reset role;
insert into public.artisan_reviews (artisan_id, decision, created_at) values
  ('e8310000-0000-4000-8000-000000000001', 'valide', now() - interval '100 days'),
  ('e8310000-0000-4000-8000-000000000003', 'valide', now() - interval '90 days'),
  ('e8310000-0000-4000-8000-000000000002', 'valide', now() - interval '30 days'),
  ('e8310000-0000-4000-8000-000000000004', 'valide', now() - interval '200 days');
set local role authenticated;
select is((public.admin_new_artisans() ->> 'cohorte')::int, current_setting('test.cohorte')::int + 2,
  'cohorte : artisans validés il y a 60 à 150 jours');
select is((public.admin_new_artisans() ->> 'premier_chantier')::int, current_setting('test.premier')::int + 1,
  'premier devis signé sous 60 jours');
select is((public.admin_new_artisans() ->> 'a_accompagner')::int,
  (select count(*)::int from public.tickets where type = 'accompagnement' and status <> 'resolu'),
  'tickets « Accompagnement » ouverts');
select ok((public.admin_new_artisans() ->> 'mois_demarrage')::int >= 2, 'mois offerts de démarrage');
select is(public.admin_artisan_referral('e8310000-0000-4000-8000-000000000001') ->> 'mois_en_attente', '0',
  'fiche admin : le parrainage ne compte pas le mois de démarrage');
reset role;

select * from finish();
rollback;
