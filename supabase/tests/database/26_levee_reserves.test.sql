-- F-26 : levée des réserves (signalement par l'artisan, confirmation par le client, relance à J+7,
-- ticket à J+30), transitions et notifications, droits de chaque rôle (CLAUDE.md).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c3100000-0000-4000-8000-000000000001', 'lev.a@example.test', false, now(), '{}', '{"first_name":"Camille","last_name":"Exemple"}'),
  ('c3100000-0000-4000-8000-000000000002', 'lev.b@example.test', false, now(), '{}', '{"first_name":"Alex","last_name":"Exemple"}'),
  ('c3200000-0000-4000-8000-000000000001', 'lev.artisan@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Xavier"}'),
  ('c3200000-0000-4000-8000-000000000002', 'lev.autre@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Yasmine"}'),
  ('c3300000-0000-4000-8000-000000000001', 'lev.support@example.test', false, now(), '{"role":"support"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, connect_charges_enabled, stripe_account_id, assujetti_tva) values
  ('c3400000-0000-4000-8000-000000000001', 'c3200000-0000-4000-8000-000000000001', 'valide', '00000002600013',
   'ARTISAN PV', '5710', '4 RUE DE LA PAIX', '75002', 'PARIS', 'communes', true, 'acct_lev', true),
  ('c3400000-0000-4000-8000-000000000002', 'c3200000-0000-4000-8000-000000000002', 'valide', '00000001800010',
   'ARTISAN AUTRE', '1000', '8 RUE DU PORT', '06300', 'NICE', 'communes', true, 'acct_lev_autre', true);
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_fin, numero, assureur, couverture, status)
values ('c3400000-0000-4000-8000-000000000001', 'decennale', 'c3400000-0000-4000-8000-000000000001/decennale.pdf',
  'application/pdf', 1000, current_date + 200, 'DEC-1', 'Assurances Exemple', 'France métropolitaine', 'valide');
insert into public.projects (id, user_id, status, description, summary, trade_code, ville_code_insee, ville_nom,
  code_postal, adresse, location, criteria_validated_at) values
  ('c3500000-0000-4000-8000-000000000001', 'c3100000-0000-4000-8000-000000000001', 'demande_envoyee',
   'Ajouter des prises.', 'Installation de prises', 'electricien', '06088', 'Nice', '06000',
   '1 Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', now()),
  ('c3500000-0000-4000-8000-000000000002', 'c3100000-0000-4000-8000-000000000002', 'demande_envoyee',
   'Remplacer le tableau.', 'Tableau électrique', 'electricien', '06088', 'Nice', '06000',
   '2 Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', now());
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone) values
  ('c3600000-0000-4000-8000-000000000001', 'c3500000-0000-4000-8000-000000000001',
   'c3400000-0000-4000-8000-000000000001', 'c3100000-0000-4000-8000-000000000001', '+33612345678'),
  ('c3600000-0000-4000-8000-000000000002', 'c3500000-0000-4000-8000-000000000002',
   'c3400000-0000-4000-8000-000000000001', 'c3100000-0000-4000-8000-000000000002', '+33612345679');
select set_config('test.annee', extract(year from (now() at time zone 'Europe/Paris'))::int::text, true);
select set_config('test.aujourdhui', ((now() at time zone 'Europe/Paris')::date)::text, true);

-- Parcours jusqu'à la fin des travaux : rendez-vous, devis de 330 € TTC envoyé et signé, acompte
-- de 30 % payé, date de démarrage, démarrage, fin déclarée (appel en propriétaire de la base).
create function pg_temp.jusqu_a_la_fin(p_request uuid, p_client uuid, p_payment text) returns uuid
language plpgsql as $$
declare
  v_chantier uuid;
  v_devis uuid;
begin
  perform pg_temp.connecter('c3200000-0000-4000-8000-000000000001', 'artisan');
  v_chantier := public.artisan_fix_appointment(p_request, current_date + 2, '10:00');
  v_devis := public.artisan_save_quote_draft(v_chantier, $j$[
    {"type":"materiel","designation":"Prise de courant","quantityMilli":4000,"unit":"u","unitPriceHtCents":2250,"vatRateBp":1000},
    {"type":"main_oeuvre","designation":"Pose","quantityMilli":3000,"unit":"h","unitPriceHtCents":5500,"vatRateBp":1000},
    {"type":"autre","designation":"Déplacement","quantityMilli":1000,"unit":"forfait","unitPriceHtCents":4500,"vatRateBp":1000}
  ]$j$::jsonb);
  perform public.artisan_send_quote(v_devis, 30, current_date + 10, 2);
  perform public.transition_chantier(v_chantier, 'devis_signe');
  update public.quotes set status = 'signe', signed_at = now(), signed_pdf_path = artisan_id || '/signe.pdf'
  where id = v_devis;
  perform pg_temp.connecter(p_client, 'particulier');
  perform public.particulier_start_deposit(v_devis);
  perform public.record_payment(v_devis, 'acompte', 'acct_lev', 'cs_' || p_payment, 'pi_' || p_payment, 9900, 'paye');
  perform pg_temp.connecter('c3200000-0000-4000-8000-000000000001', 'artisan');
  perform public.artisan_confirm_start(v_chantier, (now() at time zone 'Europe/Paris')::date + 5, '08:00');
  perform app.start_due_chantiers(now() + interval '8 days');
  perform pg_temp.connecter('c3200000-0000-4000-8000-000000000001', 'artisan');
  perform public.artisan_declare_finished(v_chantier);
  return v_chantier;
end;
$$;
select set_config('test.consentements',
  '{"document":true,"cgu_prestataire":true,"cgu_menao":true,"echeancier":true}', true);
select set_config('test.chantier_a', pg_temp.jusqu_a_la_fin('c3600000-0000-4000-8000-000000000001',
  'c3100000-0000-4000-8000-000000000001', 'a')::text, true);
select set_config('test.chantier_b', pg_temp.jusqu_a_la_fin('c3600000-0000-4000-8000-000000000002',
  'c3100000-0000-4000-8000-000000000002', 'b')::text, true);
-- Chantier A : PV avec réserves signé ; chantier B : travaux terminés, sans PV.
select pg_temp.connecter('c3100000-0000-4000-8000-000000000001', 'particulier');
select set_config('test.pv', public.particulier_start_reception(current_setting('test.chantier_a')::uuid,
  'Plinthe à repeindre dans le salon.', current_setting('test.consentements')::jsonb)::text, true);
select public.record_reception_signature((current_setting('test.pv')::jsonb ->> 'request_id')::uuid, now(),
  'c3400000-0000-4000-8000-000000000001/pv/pv-signe.pdf', null);
select is((select status::text from public.chantiers where id = current_setting('test.chantier_a')::uuid),
  'reserves_a_lever', 'chantier A : réserves à lever');

-- ---------- Signalement de la levée (artisan) ----------
select pg_temp.connecter('c3200000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select throws_ok(format('select public.artisan_signal_reserves_lifted(%L, null)', current_setting('test.chantier_a')),
  '42501', 'Chantier introuvable', 'autre artisan : pas de levée sur le chantier d''autrui');
reset role;
select pg_temp.connecter('c3100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok(format('select public.artisan_signal_reserves_lifted(%L, null)', current_setting('test.chantier_a')),
  '42501', 'Chantier introuvable', 'client : la levée est signalée par l''artisan');
reset role;
select pg_temp.connecter('c3200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select throws_ok(format('select public.artisan_signal_reserves_lifted(%L, null)', current_setting('test.chantier_b')),
  '22023', 'Aucune réserve à lever sur ce chantier', 'chantier sans réserves : rien à lever');
select throws_ok(format('select public.artisan_signal_reserves_lifted(%L, %L)', current_setting('test.chantier_a'), repeat('x', 1001)),
  '22023', 'Votre message dépasse 1 000 caractères', 'message trop long');
select lives_ok(format('select public.artisan_signal_reserves_lifted(%L, %L)', current_setting('test.chantier_a'),
  '  Plinthe repeinte hier.  '), 'X1 signale la levée des réserves');
reset role;
select results_eq(
  $$ select r.lift_signaled_at is not null, r.lift_message, c.status::text
     from public.receptions r join public.chantiers c on c.id = r.chantier_id
     where r.chantier_id = current_setting('test.chantier_a')::uuid $$,
  $$ values (true, 'Plinthe repeinte hier.'::text, 'reserves_a_lever'::text) $$,
  'levée signalée, chantier toujours en réserves à lever');
select results_eq(
  $$ select user_id, data - 'chantier_id' from public.notifications where type = 'levee_signalee' $$,
  $$ values ('c3100000-0000-4000-8000-000000000001'::uuid,
             '{"titre":"Installation de prises","artisan":"Xavier","message":"Plinthe repeinte hier."}'::jsonb) $$,
  'notification « levée signalée » au client, avec le message');

-- ---------- Relance à J+7, ticket à J+30 ----------
select is((select schedule from cron.job where jobname = 'menao-relance-levee-reserves'), '0 8 * * *',
  'tâche quotidienne de relance');
select set_config('request.jwt.claims', '', true);
select is(app.remind_reserves_lifting(now()), 0, 'avant J+7 : rien');
select is(app.remind_reserves_lifting(now() + interval '8 days'), 1, 'J+8 : relance du client');
select is(app.remind_reserves_lifting(now() + interval '9 days'), 0, 'une seule relance');
select is((select count(*)::int from public.notifications where type = 'levee_relance'
  and user_id = 'c3100000-0000-4000-8000-000000000001'), 1, 'notification de relance au client');
select is(app.remind_reserves_lifting(now() + interval '31 days'), 1, 'J+31 : ticket pour l''équipe');
select results_eq(
  $$ select type::text, user_id, project_id, contact_email, status::text from public.tickets where type = 'reserves' $$,
  $$ values ('reserves'::text, 'c3100000-0000-4000-8000-000000000001'::uuid, 'c3500000-0000-4000-8000-000000000001'::uuid,
             'lev.a@example.test'::text, 'ouvert'::text) $$,
  'ticket « réserves » ouvert pour le chantier, au nom du client');
select is(app.remind_reserves_lifting(now() + interval '40 days'), 0, 'un seul ticket');

-- Nouveau signalement : relance et escalade repartent de cette date.
select pg_temp.connecter('c3200000-0000-4000-8000-000000000001', 'artisan');
select public.artisan_signal_reserves_lifted(current_setting('test.chantier_a')::uuid, null);
select set_config('request.jwt.claims', '', true);
select is(app.remind_reserves_lifting(now() + interval '8 days'), 1, 'nouveau signalement : nouvelle relance');

-- ---------- Confirmation de la levée (client) ----------
select pg_temp.connecter('c3100000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select throws_ok(format('select public.particulier_confirm_reserves_lifted(%L)', current_setting('test.chantier_a')),
  '42501', 'Chantier introuvable', 'autre client : pas de confirmation sur le chantier d''autrui');
select throws_ok(format('select public.particulier_confirm_reserves_lifted(%L)', current_setting('test.chantier_b')),
  '22023', 'Aucune réserve à lever sur ce chantier', 'chantier sans réserves : rien à confirmer');
reset role;
select pg_temp.connecter('c3200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select throws_ok(format('select public.particulier_confirm_reserves_lifted(%L)', current_setting('test.chantier_a')),
  '42501', 'Chantier introuvable', 'artisan : la levée est confirmée par le client');
reset role;
select pg_temp.connecter('c3100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select lives_ok(format('select public.particulier_confirm_reserves_lifted(%L)', current_setting('test.chantier_a')),
  'le client confirme la levée des réserves');
select throws_ok(format('select public.particulier_confirm_reserves_lifted(%L)', current_setting('test.chantier_a')),
  '22023', 'Aucune réserve à lever sur ce chantier', 'levée déjà confirmée');
reset role;
select results_eq(
  $$ select c.status::text, r.lifted_at is not null, e.from_status::text
     from public.chantiers c
     join public.receptions r on r.chantier_id = c.id
     join public.chantier_events e on e.chantier_id = c.id and e.event = 'reserves_levees'
     where c.id = current_setting('test.chantier_a')::uuid $$,
  $$ values ('receptionne'::text, true, 'reserves_a_lever'::text) $$,
  'réserves levées : chantier réceptionné, transition journalisée');
select results_eq(
  $$ select user_id, data - 'chantier_id' from public.notifications where type = 'levee_confirmee' $$,
  $$ values ('c3200000-0000-4000-8000-000000000001'::uuid, '{"titre":"Installation de prises","client":"Camille"}'::jsonb) $$,
  'notification « levée confirmée » à l''artisan');
select pg_temp.connecter('c3200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select throws_ok(format('select public.artisan_signal_reserves_lifted(%L, null)', current_setting('test.chantier_a')),
  '22023', 'Aucune réserve à lever sur ce chantier', 'chantier réceptionné : plus de levée à signaler');
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select throws_ok(format('select public.particulier_confirm_reserves_lifted(%L)', current_setting('test.chantier_a')),
  '42501', null, 'visiteur : aucune action');
reset role;

select * from finish();
rollback;
