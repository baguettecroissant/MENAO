-- ADR 0218 : assistant des pages Pro. Demande de rappel sans compte (ticket rappel_pro), limites,
-- visibilité réservée à l'équipe ; journal ai_runs. Personnes et numéros fictifs.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('e1010000-0000-4000-8000-000000000001', 'ap.artisan@example.test', '{"role":"artisan"}', '{}'),
  ('e1010000-0000-4000-8000-000000000002', 'ap.support@example.test', '{"role":"support"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Journal ----------
select lives_ok(
  $$ insert into public.ai_runs (function_name, model, outcome, latency_ms)
     values ('pro-assistant', 'claude-haiku-5-5', 'ok', 1200) $$,
  'journal : pro-assistant accepté');

-- ---------- Visiteur sans compte ----------
set local role anon;

select throws_ok($$ select public.request_pro_callback('  ', '+33612345678', 'a@example.test') $$,
  '22023', 'Prénom obligatoire', 'prénom obligatoire');
select throws_ok($$ select public.request_pro_callback('Camille', '0612345678', 'a@example.test') $$,
  '22023', 'Numéro de téléphone invalide', 'téléphone au format international');
select throws_ok($$ select public.request_pro_callback('Camille', '+33612345678', 'pas-un-email') $$,
  '22023', 'Adresse e-mail invalide', 'e-mail valide');
select lives_ok(
  $$ select public.request_pro_callback(' Camille ', '+33612345678', 'Camille@Example.test', 'Menuisier', 'Nice') $$,
  'demande de rappel sans compte');
select lives_ok(
  $$ select public.request_pro_callback('Camille', '+33612345678', 'autre@example.test') $$,
  'deuxième demande');
select throws_ok(
  $$ select public.request_pro_callback('Camille', '+33699999999', 'camille@example.test') $$,
  '22023', 'Votre demande est déjà enregistrée : nous vous rappelons très vite.',
  '2 demandes par téléphone ou par e-mail et par 24 h');
select is((select count(*)::int from public.tickets), 0, 'tickets invisibles sans session');

-- ---------- Artisan connecté ----------
reset role;
select pg_temp.connecter('e1010000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select is((select count(*)::int from public.tickets where type = 'rappel_pro'), 0,
  'un artisan ne voit pas les demandes de rappel');

-- ---------- Équipe ----------
reset role;
select pg_temp.connecter('e1010000-0000-4000-8000-000000000002', 'support');
set local role authenticated;
select results_eq(
  $$ select contact_email, contact_phone, message, due_at <= now() + interval '1 day', user_id is null
     from public.tickets where type = 'rappel_pro' order by created_at, contact_email limit 1 $$,
  $$ values ('camille@example.test'::text, '+33612345678'::text,
             E'Prénom : Camille\nMétier : Menuisier\nCommune : Nice'::text, true, true) $$,
  'demande reçue par l''équipe, à traiter sous 24 h');
select results_eq(
  $$ select message from public.tickets where type = 'rappel_pro' and contact_email = 'autre@example.test' $$,
  $$ values ('Prénom : Camille'::text) $$,
  'métier et commune facultatifs');

-- ---------- Contraintes ----------
reset role;
select throws_ok(
  $$ insert into public.tickets (type, contact_email) values ('rappel_pro', 'b@example.test') $$,
  '23514', null, 'rappel sans téléphone refusé');
select throws_ok(
  $$ insert into public.tickets (type, contact_email, contact_phone)
     values ('rappel_pro', 'b@example.test', '0612345678') $$,
  '23514', null, 'téléphone hors format international refusé');

select * from finish();
rollback;
