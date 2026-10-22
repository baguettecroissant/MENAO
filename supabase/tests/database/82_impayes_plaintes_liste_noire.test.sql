-- Côté artisans (ADR 0158) : impayé (début noté, visibilité perdue à J+15, relances J+3, J+7,
-- J+15, jamais en push) ; 2 plaintes de clients en 12 mois → suspension, note pour l'équipe,
-- levée par un admin ; radiation → liste noire (SIREN, téléphone, e-mail). Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c8200000-0000-4000-a000-000000000001', 'lot82.impaye@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c8200000-0000-4000-a000-000000000002', 'lot82.ancien@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c8200000-0000-4000-a000-000000000003', 'lot82.plaintes@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c8200000-0000-4000-a000-000000000004', 'lot82.radie@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c8200000-0000-4000-a000-000000000005', 'lot82.retour@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c8200000-0000-4000-a000-000000000006', 'lot82.autre@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c8200000-0000-4000-a000-000000000011', 'lot82.client1@example.test', false, now(), '{"role":"particulier"}', '{}'),
  ('c8200000-0000-4000-a000-000000000012', 'lot82.client2@example.test', false, now(), '{"role":"particulier"}', '{}'),
  ('c8200000-0000-4000-a000-000000000099', 'lot82.admin@example.test', false, now(), '{"role":"admin"}', '{}');

insert into public.artisans (id, user_id, status, siret, raison_sociale, zone_mode, decennale_non_soumis) values
  ('c8210000-0000-4000-a000-000000000001', 'c8200000-0000-4000-a000-000000000001', 'valide', null, 'IMPAYE 82', 'communes', true),
  ('c8210000-0000-4000-a000-000000000002', 'c8200000-0000-4000-a000-000000000002', 'valide', null, 'ANCIEN 82', 'communes', true),
  ('c8210000-0000-4000-a000-000000000003', 'c8200000-0000-4000-a000-000000000003', 'valide', null, 'PLAINTES 82', 'communes', true),
  ('c8210000-0000-4000-a000-000000000004', 'c8200000-0000-4000-a000-000000000004', 'valide', '00000082000019', 'RADIE 82', 'communes', true),
  ('c8210000-0000-4000-a000-000000000005', 'c8200000-0000-4000-a000-000000000005', 'brouillon', '00000082000027', 'RETOUR 82', 'communes', true),
  ('c8210000-0000-4000-a000-000000000006', 'c8200000-0000-4000-a000-000000000006', 'brouillon', '00000082100017', 'AUTRE 82', 'communes', true);
update public.profiles set phone = '+33688888888' where user_id = 'c8200000-0000-4000-a000-000000000004';
-- Assurances valides pour l'artisan visé par les plaintes (levée de la suspension).
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, status, date_fin) values
  ('c8210000-0000-4000-a000-000000000003', 'rc_pro', 'c82/rc_pro.pdf', 'application/pdf', 1000, 'valide', current_date + 200);

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Impayé ----------
insert into public.subscriptions (artisan_id, stripe_customer_id, stripe_subscription_id, status) values
  ('c8210000-0000-4000-a000-000000000001', 'cus_l82_1', 'sub_l82_1', 'active'),
  ('c8210000-0000-4000-a000-000000000002', 'cus_l82_2', 'sub_l82_2', 'active');
select is((select past_due_since from public.subscriptions where stripe_subscription_id = 'sub_l82_1'), null::timestamptz,
  'abonnement actif : pas d''impayé');
update public.subscriptions set status = 'past_due' where stripe_subscription_id = 'sub_l82_1';
select ok((select past_due_since = now() from public.subscriptions where stripe_subscription_id = 'sub_l82_1'),
  'passage en impayé : début noté');
select ok(app.artisan_subscription_active('c8210000-0000-4000-a000-000000000001'), 'impayé récent : toujours visible');
update public.subscriptions set past_due_since = now() - interval '16 days' where stripe_subscription_id = 'sub_l82_1';
select ok(not app.artisan_subscription_active('c8210000-0000-4000-a000-000000000001'), 'impayé de plus de 15 jours : retiré');
update public.subscriptions set status = 'active' where stripe_subscription_id = 'sub_l82_1';
select ok(app.artisan_subscription_active('c8210000-0000-4000-a000-000000000001'), 'paiement reçu : de nouveau visible');
select is((select past_due_since from public.subscriptions where stripe_subscription_id = 'sub_l82_1'), null::timestamptz,
  'paiement reçu : impayé effacé');

-- Relances : J+3, J+7, J+15, une fois chacune ; un retard rattrapé n'envoie que la plus avancée.
update public.subscriptions set status = 'past_due' where stripe_subscription_id = 'sub_l82_1';
update public.subscriptions set past_due_since = now() - interval '4 days' where stripe_subscription_id = 'sub_l82_1';
update public.subscriptions set status = 'past_due' where stripe_subscription_id = 'sub_l82_2';
update public.subscriptions set past_due_since = now() - interval '20 days' where stripe_subscription_id = 'sub_l82_2';
insert into public.push_tokens (user_id, token, platform) values
  ('c8200000-0000-4000-a000-000000000001', 'ExponentPushToken[lot82]', 'ios');
select is(app.remind_unpaid_subscriptions(), 2, 'une relance par abonnement impayé');
select results_eq(
  $$ select u.email::text, (n.data ->> 'etape')::int from public.notifications n join auth.users u on u.id = n.user_id
     where n.type = 'abonnement_impaye' order by 1 $$,
  $$ values ('lot82.ancien@example.test', 3), ('lot82.impaye@example.test', 1) $$,
  'J+4 : étape 1 ; J+20 : directement l''étape 3');
select is(app.remind_unpaid_subscriptions(), 0, 'nouvel appel : pas de doublon');
select is(app.remind_unpaid_subscriptions(now() + interval '4 days'), 1, 'J+8 : étape 2');
select is(app.remind_unpaid_subscriptions(now() + interval '12 days'), 1, 'J+16 : étape 3');
select is(app.remind_unpaid_subscriptions(now() + interval '30 days'), 0, 'plus rien après l''étape 3');
select is_empty(
  $$ select 1 from public.notifications where type = 'abonnement_impaye' and push_status is not null $$,
  'jamais en push (règle 10)');

-- ---------- Plaintes ----------
insert into public.projects (id, user_id, description, trade_code, ville_code_insee, ville_nom) values
  ('c8220000-0000-4000-a000-000000000001', 'c8200000-0000-4000-a000-000000000011', 'Chantier 1', 'plombier', '06088', 'Nice'),
  ('c8220000-0000-4000-a000-000000000002', 'c8200000-0000-4000-a000-000000000012', 'Chantier 2', 'plombier', '06088', 'Nice');
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone, status) values
  ('c8230000-0000-4000-a000-000000000001', 'c8220000-0000-4000-a000-000000000001', 'c8210000-0000-4000-a000-000000000003',
   'c8200000-0000-4000-a000-000000000011', '+33612345678', 'acceptee'),
  ('c8230000-0000-4000-a000-000000000002', 'c8220000-0000-4000-a000-000000000002', 'c8210000-0000-4000-a000-000000000003',
   'c8200000-0000-4000-a000-000000000012', '+33612345678', 'acceptee');
insert into public.chantiers (id, project_id, request_id, artisan_id, particulier_id, title) values
  ('c8240000-0000-4000-a000-000000000001', 'c8220000-0000-4000-a000-000000000001', 'c8230000-0000-4000-a000-000000000001',
   'c8210000-0000-4000-a000-000000000003', 'c8200000-0000-4000-a000-000000000011', 'Chantier 1'),
  ('c8240000-0000-4000-a000-000000000002', 'c8220000-0000-4000-a000-000000000002', 'c8230000-0000-4000-a000-000000000002',
   'c8210000-0000-4000-a000-000000000003', 'c8200000-0000-4000-a000-000000000012', 'Chantier 2');

create function pg_temp.litige(p_user uuid, p_chantier uuid, p_project uuid) returns void language sql as $$
  insert into public.tickets (type, user_id, project_id, chantier_id, category, contact_email, subject, message)
  values ('litige', p_user, p_project, p_chantier, 'retard', 'lot82@example.test', 'Litige', 'Le chantier n''avance plus du tout.')
$$;

select pg_temp.litige('c8200000-0000-4000-a000-000000000011', 'c8240000-0000-4000-a000-000000000001', 'c8220000-0000-4000-a000-000000000001');
select is((select status::text from public.artisans where id = 'c8210000-0000-4000-a000-000000000003'), 'valide',
  'une plainte : pas de suspension');
-- Litige ouvert par l'artisan lui-même : ce n'est pas une plainte contre lui.
select pg_temp.litige('c8200000-0000-4000-a000-000000000003', 'c8240000-0000-4000-a000-000000000002', 'c8220000-0000-4000-a000-000000000002');
select is((select status::text from public.artisans where id = 'c8210000-0000-4000-a000-000000000003'), 'valide',
  'litige ouvert par l''artisan : ignoré');
select pg_temp.litige('c8200000-0000-4000-a000-000000000012', 'c8240000-0000-4000-a000-000000000002', 'c8220000-0000-4000-a000-000000000002');
select results_eq(
  $$ select status::text, suspension_reason from public.artisans where id = 'c8210000-0000-4000-a000-000000000003' $$,
  $$ values ('suspendu', 'plaintes') $$, 'deuxième plainte de clients : profil suspendu');
select matches(
  (select n.body from public.ticket_notes n join public.tickets t on t.id = n.ticket_id
   where t.chantier_id = 'c8240000-0000-4000-a000-000000000002' and t.user_id = 'c8200000-0000-4000-a000-000000000012'),
  '^2 plaintes de clients', 'note pour l''équipe sur le ticket');
select is((select data ->> 'par' from public.notifications
           where type = 'compte_suspendu' and user_id = 'c8200000-0000-4000-a000-000000000003'),
  'plaintes', 'artisan prévenu');
select pg_temp.connecter('c8200000-0000-4000-a000-000000000099', 'admin');
set local role authenticated;
select lives_ok($$ select public.admin_reactivate_artisan('c8210000-0000-4000-a000-000000000003') $$,
  'suspension levée par un admin après l''enquête');
reset role;
select is((select status::text from public.artisans where id = 'c8210000-0000-4000-a000-000000000003'), 'valide',
  'de nouveau validé');

-- ---------- Liste noire ----------
update public.artisans set status = 'radie', radiated_at = now(), radiation_reason = 'Fraude'
where id = 'c8210000-0000-4000-a000-000000000004';
select results_eq(
  $$ select kind, value from public.blocked_identities where artisan_id = 'c8210000-0000-4000-a000-000000000004' order by kind $$,
  $$ values ('email', 'lot82.radie@example.test'), ('siren', '000000820'), ('telephone', '+33688888888') $$,
  'radiation : SIREN, téléphone et e-mail sur la liste noire');
select ok(app.identity_blocked('c8210000-0000-4000-a000-000000000005'), 'même SIREN qu''un radié : bloqué');
select ok(not app.identity_blocked('c8210000-0000-4000-a000-000000000006'), 'autre entreprise : libre');
update public.profiles set phone = '+33688888888' where user_id = 'c8200000-0000-4000-a000-000000000006';
select ok(app.identity_blocked('c8210000-0000-4000-a000-000000000006'), 'téléphone d''un radié : bloqué');
select ok(not app.identity_blocked('c8210000-0000-4000-a000-000000000004'), 'le radié lui-même n''est pas comparé à sa propre fiche');

select pg_temp.connecter('c8200000-0000-4000-a000-000000000005', 'artisan');
set local role authenticated;
select is_empty($$ select 1 from public.blocked_identities $$, 'liste noire : jamais lue par un artisan');
reset role;

select * from finish();
rollback;
