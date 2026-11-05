-- ADR 0219 : relances de l'inscription. Dossier relancé de nouveau après une demande de
-- compléments, liste noire exclue, étapes manquantes jointes ; artisan validé mais pas visible
-- (paiements, formule ; jamais en push) ; compte Google ou Apple jamais finalisé ; liste du
-- back-office réservée à l'équipe. Personnes fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

-- F : dossier ancien, déjà relancé 3 fois, puis compléments demandés il y a 2 jours ;
-- G : validé il y a 2 jours, ni paiements ni formule ; H : dossier ancien sur liste noire ;
-- I : compte Google non finalisé depuis 2 jours ; S : équipe.
insert into auth.users (id, email, is_anonymous, email_confirmed_at, created_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1020000-0000-4000-8000-000000000006', 'relance102.f@example.test', false, now(), now(), '{}', '{"account_type":"artisan"}'),
  ('c1020000-0000-4000-8000-000000000007', 'relance102.g@example.test', false, now(), now(), '{}', '{"account_type":"artisan"}'),
  ('c1020000-0000-4000-8000-000000000008', 'relance102.h@example.test', false, now(), now(), '{}', '{"account_type":"artisan"}'),
  ('c1020000-0000-4000-8000-000000000009', 'relance102.i@example.test', false, now(), now() - interval '2 days', '{"provider":"google"}', '{}'),
  ('c1020000-0000-4000-8000-000000000010', 'relance102.s@example.test', false, now(), now(), '{"role":"support"}', '{}');

create function pg_temp.sent(uid text, kind text) returns int language sql as $$
  select count(*)::int from public.notifications where user_id = uid::uuid and type = kind::public.notification_type
$$;

update public.artisans set created_at = now() - interval '40 days'
where user_id in ('c1020000-0000-4000-8000-000000000006', 'c1020000-0000-4000-8000-000000000008');
insert into public.notifications (user_id, type, data, created_at)
select 'c1020000-0000-4000-8000-000000000006', 'inscription_relance', jsonb_build_object('etape', n), now() - interval '30 days'
from generate_series(1, 3) n;
update public.artisans set refusal_reason = 'Attestation illisible'
where user_id = 'c1020000-0000-4000-8000-000000000006';
insert into public.artisan_reviews (artisan_id, decision, message, created_at)
select id, 'complement', 'Attestation illisible', now() - interval '2 days'
from public.artisans where user_id = 'c1020000-0000-4000-8000-000000000006';

update public.artisans set status = 'valide', connect_charges_enabled = false
where user_id = 'c1020000-0000-4000-8000-000000000007';
insert into public.artisan_reviews (artisan_id, decision, created_at)
select id, 'valide', now() - interval '2 days'
from public.artisans where user_id = 'c1020000-0000-4000-8000-000000000007';
insert into public.push_tokens (user_id, token, platform)
values ('c1020000-0000-4000-8000-000000000007', 'ExponentPushToken[relance102g]', 'ios');

insert into public.blocked_identities (kind, value)
values ('email', 'relance102.h@example.test');

-- ---------- Dossier : nouveau cycle après les compléments ----------
select lives_ok($$ select app.remind_signup() $$, 'relance des dossiers');
select is(pg_temp.sent('c1020000-0000-4000-8000-000000000006', 'inscription_relance'), 4,
  'F relancé de nouveau après la demande de compléments');
select is(pg_temp.sent('c1020000-0000-4000-8000-000000000008', 'inscription_relance'), 0, 'H sur liste noire : jamais relancé');
select results_eq(
  $$ select data ->> 'etape', data ->> 'complement', jsonb_array_length(data -> 'manque') > 0
     from public.notifications
     where type = 'inscription_relance' and user_id = 'c1020000-0000-4000-8000-000000000006'
       and created_at > now() - interval '1 hour' $$,
  $$ values ('1'::text, 'true'::text, true) $$,
  'relance n°1 du nouveau cycle, avec les étapes manquantes');
select app.remind_signup();
select is(pg_temp.sent('c1020000-0000-4000-8000-000000000006', 'inscription_relance'), 4, 'pas deux relances le même jour');

-- ---------- Validé mais pas visible ----------
select is(app.activation_missing_steps((select id from public.artisans where user_id = 'c1020000-0000-4000-8000-000000000007')),
  array['paiements', 'formule'], 'paiements et formule manquants');
select app.remind_activation();
select is(pg_temp.sent('c1020000-0000-4000-8000-000000000007', 'activation_relance'), 1, 'G relancé un jour après sa validation');
select results_eq(
  $$ select data ->> 'etape', data -> 'manque', push_status is null
     from public.notifications
     where type = 'activation_relance' and user_id = 'c1020000-0000-4000-8000-000000000007' $$,
  $$ values ('1'::text, '["paiements", "formule"]'::jsonb, true) $$,
  'relance n°1, jamais en push (formule payante, règle 10)');
select app.remind_activation(now() + interval '2 days 12 hours');
select is(pg_temp.sent('c1020000-0000-4000-8000-000000000007', 'activation_relance'), 2, 'J+3');
select app.remind_activation(now() + interval '6 days 12 hours');
select is(pg_temp.sent('c1020000-0000-4000-8000-000000000007', 'activation_relance'), 3, 'J+7');
select app.remind_activation(now() + interval '30 days');
select is(pg_temp.sent('c1020000-0000-4000-8000-000000000007', 'activation_relance'), 3, 'jamais plus de trois relances');

-- ---------- Compte Google non finalisé ----------
select app.remind_finalization();
select is(pg_temp.sent('c1020000-0000-4000-8000-000000000009', 'finalisation_relance'), 1, 'I relancé un jour après la création du compte');
select app.remind_finalization();
select is(pg_temp.sent('c1020000-0000-4000-8000-000000000009', 'finalisation_relance'), 1, 'pas deux relances le même jour');
select app.remind_finalization(now() + interval '3 days');
select is(pg_temp.sent('c1020000-0000-4000-8000-000000000009', 'finalisation_relance'), 2, 'deuxième relance à J+4');
select app.remind_finalization(now() + interval '10 days');
select is(pg_temp.sent('c1020000-0000-4000-8000-000000000009', 'finalisation_relance'), 2, 'jamais plus de deux');
select is(pg_temp.sent('c1020000-0000-4000-8000-000000000006', 'finalisation_relance'), 0, 'compte par e-mail : jamais concerné');

-- ---------- Préférences, droits et tâches ----------
select is(app.notification_category('activation_relance'), 'rappels', 'activation : désactivable');
select is(app.notification_category('finalisation_relance'), 'rappels', 'finalisation : désactivable');
select ok(not has_function_privilege('authenticated', 'app.remind_activation(timestamptz)', 'execute'),
  'relance d''activation réservée à la base');
select ok(not has_function_privilege('authenticated', 'app.remind_finalization(timestamptz)', 'execute'),
  'relance de finalisation réservée à la base');
select ok(exists (select 1 from cron.job where jobname = 'menao-relance-activation'), 'tâche activation planifiée');
select ok(exists (select 1 from cron.job where jobname = 'menao-relance-finalisation'), 'tâche finalisation planifiée');

-- ---------- Back-office ----------
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', 'c1020000-0000-4000-8000-000000000007', 'role', 'authenticated',
  'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
set local role authenticated;
select throws_ok($$ select * from public.admin_stalled_signups() $$, '42501', null,
  'inscriptions bloquées : refusé à un artisan');
reset role;
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', 'c1020000-0000-4000-8000-000000000010', 'role', 'authenticated',
  'app_metadata', jsonb_build_object('role', 'support'))::text, true);
set local role authenticated;
select results_eq(
  $$ select etat, relances from public.admin_stalled_signups()
     where artisan_id in (select id from public.artisans where user_id in
       ('c1020000-0000-4000-8000-000000000006', 'c1020000-0000-4000-8000-000000000007'))
     order by etat $$,
  $$ values ('activation'::text, 3), ('complement', 1) $$,
  'équipe : étape et relances du cycle en cours');
reset role;

select * from finish();
rollback;
