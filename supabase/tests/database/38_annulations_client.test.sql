-- F-11, F-12 : annulation par le client (ADR 0040). Demande en attente, puis chantier avant
-- l'acompte ; motif obligatoire ; l'artisan est prévenu, le client seul peut annuler.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('ba100000-0000-4000-8000-000000000001', 'annul.a@example.test', false, now(), '{}', '{"first_name":"Camille","last_name":"Exemple"}'),
  ('ba100000-0000-4000-8000-000000000002', 'annul.b@example.test', false, now(), '{}', '{"first_name":"Alex","last_name":"Exemple"}'),
  ('ba200000-0000-4000-8000-000000000001', 'annul.x@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Xavier"}'),
  ('ba200000-0000-4000-8000-000000000002', 'annul.y@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Yasmine"}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, connect_charges_enabled) values
  ('ba400000-0000-4000-8000-000000000001', 'ba200000-0000-4000-8000-000000000001', 'valide', 'ARTISAN X', 'communes', true),
  ('ba400000-0000-4000-8000-000000000002', 'ba200000-0000-4000-8000-000000000002', 'valide', 'ARTISAN Y', 'communes', true);
insert into public.projects (id, user_id, status, description, summary, trade_code, ville_code_insee, ville_nom,
  code_postal, adresse, location, criteria_validated_at) values
  ('ba500000-0000-4000-8000-000000000001', 'ba100000-0000-4000-8000-000000000001', 'demande_envoyee',
   'Ajouter des prises.', 'Installation de prises', 'electricien', '06088', 'Nice', '06000',
   '1 Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', now());
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone) values
  ('ba600000-0000-4000-8000-000000000001', 'ba500000-0000-4000-8000-000000000001',
   'ba400000-0000-4000-8000-000000000001', 'ba100000-0000-4000-8000-000000000001', '+33612345678'),
  ('ba600000-0000-4000-8000-000000000002', 'ba500000-0000-4000-8000-000000000001',
   'ba400000-0000-4000-8000-000000000002', 'ba100000-0000-4000-8000-000000000001', '+33612345678');
delete from public.notifications where user_id in (
  'ba200000-0000-4000-8000-000000000001', 'ba200000-0000-4000-8000-000000000002');

select has_column('public', 'projects', 'preferred_artisan_id', 'projet : artisan préféré (« Redemander un devis »)');

-- ---------- Demande en attente ----------
select pg_temp.connecter('ba100000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select throws_ok(
  $$ select public.particulier_cancel_request('ba600000-0000-4000-8000-000000000002', 'autre_artisan') $$,
  '42501', null, 'autre client : ne peut pas annuler la demande');
reset role;

select pg_temp.connecter('ba100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok(
  $$ select public.particulier_cancel_request('ba600000-0000-4000-8000-000000000002', null) $$,
  '22023', 'Choisissez un motif', 'motif obligatoire');
select throws_ok(
  $$ select public.particulier_cancel_request('ba600000-0000-4000-8000-000000000002', 'autre', repeat('a', 501)) $$,
  '22023', 'Commentaire trop long (500 caractères au plus)', 'commentaire limité');
select lives_ok(
  $$ select public.particulier_cancel_request('ba600000-0000-4000-8000-000000000002', 'autre_artisan', '  Trouvé plus près. ') $$,
  'client : annule sa demande en attente');
select results_eq(
  $$ select status::text, cancellation_reason::text, cancellation_comment, cancelled_at is not null
     from public.requests where id = 'ba600000-0000-4000-8000-000000000002' $$,
  $$ values ('annulee', 'autre_artisan', 'Trouvé plus près.', true) $$, 'demande annulée avec son motif');
select throws_ok(
  $$ select public.particulier_cancel_request('ba600000-0000-4000-8000-000000000002', 'autre_artisan') $$,
  '22023', 'Cette demande n''attend plus de réponse', 'demande déjà annulée');
reset role;
select results_eq(
  $$ select type::text, data ->> 'client', data ->> 'metier', data ->> 'raison', data ->> 'message'
     from public.notifications where user_id = 'ba200000-0000-4000-8000-000000000002' $$,
  $$ values ('demande_annulee', 'Camille', 'Électricien', 'autre_artisan', 'Trouvé plus près.') $$,
  'artisan prévenu de l''annulation');

-- ---------- Chantier avant l'acompte ----------
select pg_temp.connecter('ba200000-0000-4000-8000-000000000001', 'artisan');
select set_config('test.chantier',
  public.artisan_fix_appointment('ba600000-0000-4000-8000-000000000001', current_date + 2, '10:00')::text, true);
delete from public.notifications;

select pg_temp.connecter('ba100000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select throws_ok(
  $$ select public.particulier_cancel_chantier(current_setting('test.chantier')::uuid, 'plus_besoin') $$,
  '42501', null, 'autre client : ne peut pas annuler le chantier');
reset role;

select pg_temp.connecter('ba100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select lives_ok(
  $$ select public.particulier_cancel_chantier(current_setting('test.chantier')::uuid, 'plus_besoin') $$,
  'client : annule le chantier avant l''acompte');
select throws_ok(
  $$ select public.particulier_cancel_chantier(current_setting('test.chantier')::uuid, 'plus_besoin') $$,
  '22023', 'Ce chantier ne peut plus être annulé', 'chantier déjà annulé');
reset role;
select results_eq(
  $$ select c.status::text, a.status::text, r.status::text, r.cancellation_reason::text
     from public.chantiers c
     join public.appointments a on a.chantier_id = c.id
     join public.requests r on r.id = c.request_id
     where c.id = current_setting('test.chantier')::uuid $$,
  $$ values ('annule', 'annule', 'annulee', 'plus_besoin') $$,
  'chantier, rendez-vous et demande annulés');
select results_eq(
  $$ select event::text, details ->> 'par', details ->> 'raison' from public.chantier_events
     where chantier_id = current_setting('test.chantier')::uuid and event = 'annulation' $$,
  $$ values ('annulation', 'particulier', 'plus_besoin') $$, 'annulation journalisée');
select results_eq(
  $$ select user_id, type::text, data ->> 'destinataire', data ->> 'client' from public.notifications $$,
  $$ values ('ba200000-0000-4000-8000-000000000001'::uuid, 'chantier_annule', 'artisan', 'Camille') $$,
  'seul l''artisan est prévenu');

select * from finish();
rollback;
