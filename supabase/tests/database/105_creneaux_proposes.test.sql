-- ADR 0222 : accepter en un toucher. L'artisan propose 2 ou 3 créneaux, le client en choisit un
-- (rendez-vous fixé, chantier créé) ; règles, droits de chaque rôle, notifications, plus de
-- relance après la proposition. Personnes et entreprises fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('b1050000-0000-4000-8000-000000000001', 'creneaux.client@example.test', false, now(), '{}', '{}'),
  ('b1050000-0000-4000-8000-000000000002', 'creneaux.autre@example.test', false, now(), '{}', '{}'),
  ('b1051000-0000-4000-8000-000000000001', 'creneaux.a1@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('b1051000-0000-4000-8000-000000000002', 'creneaux.a2@example.test', false, now(), '{"role":"artisan"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', app_role))::text, true);
$$;

insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, connect_charges_enabled) values
  ('b1052000-0000-4000-8000-000000000001', 'b1051000-0000-4000-8000-000000000001', 'valide', 'CRENEAUX PLOMBERIE', 'communes', true),
  ('b1052000-0000-4000-8000-000000000002', 'b1051000-0000-4000-8000-000000000002', 'valide', 'AUTRE PLOMBERIE', 'communes', true);
insert into public.projects (id, user_id, description, trade_code, ville_code_insee, ville_nom) values
  ('b1053000-0000-4000-8000-000000000001', 'b1050000-0000-4000-8000-000000000001', 'Fuite sous évier', 'plombier', '06088', 'Nice'),
  ('b1053000-0000-4000-8000-000000000002', 'b1050000-0000-4000-8000-000000000001', 'Robinet', 'plombier', '06088', 'Nice');
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone, created_at) values
  ('b1054000-0000-4000-8000-000000000001', 'b1053000-0000-4000-8000-000000000001', 'b1052000-0000-4000-8000-000000000001', 'b1050000-0000-4000-8000-000000000001', '+33612345678', now()),
  ('b1054000-0000-4000-8000-000000000002', 'b1053000-0000-4000-8000-000000000002', 'b1052000-0000-4000-8000-000000000001', 'b1050000-0000-4000-8000-000000000001', '+33612345678', now() - interval '30 hours');

create function pg_temp.slots(days int[]) returns timestamptz[] language sql as $$
  select array_agg(date_trunc('hour', now()) + make_interval(days => d) + interval '9 hours' order by d) from unnest(days) d
$$;

-- ---------- Artisan ----------
select pg_temp.connecter('b1051000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select throws_ok($$ select public.artisan_propose_slots('b1054000-0000-4000-8000-000000000001', pg_temp.slots(array[2])) $$,
  '22023', 'Proposez 2 ou 3 créneaux différents', 'un seul créneau : refusé');
select throws_ok($$ select public.artisan_propose_slots('b1054000-0000-4000-8000-000000000001',
  array[now() - interval '1 day', now() + interval '2 days']) $$,
  '22023', 'Proposez des créneaux à venir', 'créneau passé : refusé');
select lives_ok($$ select public.artisan_propose_slots('b1054000-0000-4000-8000-000000000001', pg_temp.slots(array[1, 2, 3])) $$,
  '3 créneaux proposés');
select lives_ok($$ select public.artisan_propose_slots('b1054000-0000-4000-8000-000000000002', pg_temp.slots(array[2, 4])) $$,
  '2 créneaux proposés sur la seconde demande');
select results_eq(
  $$ select responded_at is not null, expires_at >= (pg_temp.slots(array[1, 2, 3]))[3]
     from public.requests where id = 'b1054000-0000-4000-8000-000000000001' $$,
  $$ values (true, true) $$, 'proposition = réponse ; la demande attend jusqu''au dernier créneau');
reset role;

select pg_temp.connecter('b1051000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select throws_ok($$ select public.artisan_propose_slots('b1054000-0000-4000-8000-000000000001', pg_temp.slots(array[1, 2])) $$,
  '42501', null, 'autre artisan : refusé');
select is((select count(*)::int from public.appointment_proposals), 0, 'autre artisan : ne voit rien');
reset role;

-- Plus de relance pour la demande de 30 h, à laquelle l'artisan a répondu.
select app.remind_pending_requests();
select is((select count(*)::int from public.notifications
  where type = 'demande_relance' and data ->> 'request_id' = 'b1054000-0000-4000-8000-000000000002'), 0,
  'pas de relance après la proposition de créneaux');
select is((select count(*)::int from public.notifications
  where type = 'creneaux_proposes' and user_id = 'b1050000-0000-4000-8000-000000000001'), 2,
  'client prévenu de chaque proposition');

-- ---------- Client ----------
select pg_temp.connecter('b1050000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select results_eq(
  $$ select artisan_name, cardinality(slots) from public.particulier_slot_proposals()
     where request_id = 'b1054000-0000-4000-8000-000000000001' $$,
  $$ values ('CRENEAUX PLOMBERIE'::text, 3) $$, 'client : créneaux en attente de son choix');
select throws_ok($$ select public.particulier_choose_slot(
  (select id from public.appointment_proposals where request_id = 'b1054000-0000-4000-8000-000000000001'),
  now() + interval '20 days') $$, '22023', 'Choisissez l''un des créneaux proposés', 'créneau hors liste : refusé');
select lives_ok($$ select public.particulier_choose_slot(
  (select id from public.appointment_proposals where request_id = 'b1054000-0000-4000-8000-000000000001'),
  (pg_temp.slots(array[1, 2, 3]))[2]) $$, 'client : choisit le deuxième créneau');
reset role;

select results_eq(
  $$ select r.status::text, ap.starts_at = (pg_temp.slots(array[1, 2, 3]))[2], p.status
     from public.requests r
     join public.chantiers c on c.request_id = r.id
     join public.appointments ap on ap.chantier_id = c.id
     join public.appointment_proposals p on p.request_id = r.id
     where r.id = 'b1054000-0000-4000-8000-000000000001' $$,
  $$ values ('acceptee'::text, true, 'choisie'::text) $$,
  'rendez-vous fixé au créneau choisi, demande acceptée, proposition choisie');
select is((select count(*)::int from public.notifications
  where type = 'creneau_choisi' and user_id = 'b1051000-0000-4000-8000-000000000001'), 1,
  'artisan prévenu du créneau choisi');

select pg_temp.connecter('b1051000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select throws_ok($$ select public.artisan_propose_slots('b1054000-0000-4000-8000-000000000001', pg_temp.slots(array[5, 6])) $$,
  '22023', 'Cette demande n''attend plus de réponse', 'rendez-vous déjà fixé : plus de proposition');
reset role;

-- ---------- Autre client et visiteur ----------
select pg_temp.connecter('b1050000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select is((select count(*)::int from public.appointment_proposals), 0, 'autre client : ne voit rien');
select is((select count(*)::int from public.particulier_slot_proposals()), 0, 'autre client : aucune proposition');
select throws_ok($$ select public.particulier_choose_slot(
  (select id from public.appointment_proposals limit 1), now() + interval '2 days') $$,
  '42501', null, 'autre client : ne peut pas choisir');
reset role;
select ok(not has_function_privilege('anon', 'public.particulier_choose_slot(uuid, timestamptz)', 'execute'),
  'visiteur : refusé');
select ok(not has_function_privilege('authenticated', 'app.fix_request_appointment(uuid, timestamptz)', 'execute'),
  'fixation interne : réservée à la base');

select * from finish();
rollback;
