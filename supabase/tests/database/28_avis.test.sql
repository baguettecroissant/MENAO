-- F-28 : avis du client une fois le PV de réception signé (un par chantier), score MENAO, relance
-- unique à J+3 après la clôture, réponse de l'artisan, signalement, masquage par l'équipe, lecture
-- publique, droits de chaque rôle (CLAUDE.md).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('d4100000-0000-4000-8000-000000000001', 'avis.a@example.test', false, now(), '{}', '{"first_name":"Camille","last_name":"exemple"}'),
  ('d4100000-0000-4000-8000-000000000002', 'avis.b@example.test', false, now(), '{}', '{"first_name":"Alex","last_name":"Exemple"}'),
  ('d4100000-0000-4000-8000-000000000003', null, true, null, '{}', '{}'),
  ('d4200000-0000-4000-8000-000000000001', 'avis.artisan@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Xavier"}'),
  ('d4200000-0000-4000-8000-000000000002', 'avis.autre@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Yasmine"}'),
  ('d4300000-0000-4000-8000-000000000001', 'avis.support@example.test', false, now(), '{"role":"support"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, connect_charges_enabled, stripe_account_id, assujetti_tva) values
  ('d4400000-0000-4000-8000-000000000001', 'd4200000-0000-4000-8000-000000000001', 'valide', '00000002600013',
   'ARTISAN AVIS', '5710', '4 RUE DE LA PAIX', '75002', 'PARIS', 'communes', true, 'acct_avis', true),
  ('d4400000-0000-4000-8000-000000000002', 'd4200000-0000-4000-8000-000000000002', 'valide', '00000001800010',
   'ARTISAN AUTRE', '1000', '8 RUE DU PORT', '06300', 'NICE', 'communes', true, 'acct_avis_autre', true);
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_fin, numero, assureur, couverture, status)
values ('d4400000-0000-4000-8000-000000000001', 'decennale', 'd4400000-0000-4000-8000-000000000001/decennale.pdf',
  'application/pdf', 1000, current_date + 200, 'DEC-1', 'Assurances Exemple', 'France métropolitaine', 'valide');
insert into public.projects (id, user_id, status, description, summary, trade_code, ville_code_insee, ville_nom,
  code_postal, adresse, location, criteria_validated_at) values
  ('d4500000-0000-4000-8000-000000000001', 'd4100000-0000-4000-8000-000000000001', 'demande_envoyee',
   'Ajouter des prises.', 'Installation de prises', 'electricien', '06088', 'Nice', '06000',
   '1 Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', now()),
  ('d4500000-0000-4000-8000-000000000002', 'd4100000-0000-4000-8000-000000000002', 'demande_envoyee',
   'Remplacer le tableau.', 'Tableau électrique', 'electricien', '06088', 'Nice', '06000',
   '2 Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', now());
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone) values
  ('d4600000-0000-4000-8000-000000000001', 'd4500000-0000-4000-8000-000000000001',
   'd4400000-0000-4000-8000-000000000001', 'd4100000-0000-4000-8000-000000000001', '+33612345678'),
  ('d4600000-0000-4000-8000-000000000002', 'd4500000-0000-4000-8000-000000000002',
   'd4400000-0000-4000-8000-000000000001', 'd4100000-0000-4000-8000-000000000002', '+33612345679');
select set_config('test.aujourdhui', ((now() at time zone 'Europe/Paris')::date)::text, true);

-- Parcours jusqu'à la fin des travaux (mêmes étapes que le test 27), en propriétaire de la base.
create function pg_temp.jusqu_a_la_fin(p_request uuid, p_client uuid, p_payment text) returns uuid
language plpgsql as $$
declare
  v_chantier uuid;
  v_devis uuid;
begin
  perform pg_temp.connecter('d4200000-0000-4000-8000-000000000001', 'artisan');
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
  perform public.record_payment(v_devis, 'acompte', 'acct_avis', 'cs_' || p_payment, 'pi_' || p_payment, 9900, 'paye');
  perform pg_temp.connecter('d4200000-0000-4000-8000-000000000001', 'artisan');
  perform public.artisan_confirm_start(v_chantier, (now() at time zone 'Europe/Paris')::date + 5, '08:00');
  perform app.start_due_chantiers(now() + interval '8 days');
  perform pg_temp.connecter('d4200000-0000-4000-8000-000000000001', 'artisan');
  perform public.artisan_declare_finished(v_chantier);
  return v_chantier;
end;
$$;
select set_config('test.chantier_a', pg_temp.jusqu_a_la_fin('d4600000-0000-4000-8000-000000000001',
  'd4100000-0000-4000-8000-000000000001', 'a')::text, true);
select set_config('test.chantier_b', pg_temp.jusqu_a_la_fin('d4600000-0000-4000-8000-000000000002',
  'd4100000-0000-4000-8000-000000000002', 'b')::text, true);
-- Chantier A : PV sans réserves signé, solde payé, chantier clôturé. Chantier B : travaux terminés.
select pg_temp.connecter('d4100000-0000-4000-8000-000000000001', 'particulier');
select set_config('test.pv', public.particulier_start_reception(current_setting('test.chantier_a')::uuid, null,
  '{"document":true,"cgu_prestataire":true,"cgu_menao":true,"echeancier":true}'::jsonb)::text, true);
select public.record_reception_signature((current_setting('test.pv')::jsonb ->> 'request_id')::uuid, now(),
  'd4400000-0000-4000-8000-000000000001/pv/pv-signe.pdf', null);
select set_config('test.solde', public.particulier_start_balance(current_setting('test.chantier_a')::uuid)::text, true);
select public.record_payment((current_setting('test.solde')::jsonb ->> 'quote_id')::uuid, 'solde', 'acct_avis',
  'cs_s', 'pi_s', 23100, 'paye');
select is((select status::text from public.chantiers where id = current_setting('test.chantier_a')::uuid),
  'cloture', 'chantier A clôturé');

-- ---------- Relance unique 3 jours après la clôture, sans avis ----------
select is(app.remind_reviews(now() + interval '2 days'), 0, 'J+2 : pas encore de relance');
select is(app.remind_reviews(now() + interval '31 days'), 0, 'clôture de plus de 30 jours : pas de relance');
select is(app.remind_reviews(now() + interval '4 days'), 1, 'J+4 : client relancé');
select is(app.remind_reviews(now() + interval '5 days'), 0, 'une seule relance');
select results_eq(
  $$ select user_id, data ->> 'chantier_id', data ->> 'artisan' from public.notifications where type = 'avis_relance' $$,
  $$ values ('d4100000-0000-4000-8000-000000000001'::uuid, current_setting('test.chantier_a'), 'Xavier'::text) $$,
  'notification « avis_relance » au client');

-- ---------- Dépôt de l'avis ----------
select pg_temp.connecter('d4100000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select throws_ok(
  format('select public.particulier_submit_review(%L, 80, 100, 100, 90, %L, %L)', current_setting('test.chantier_b'),
    'excellent', repeat('x', 60)),
  '22023', 'Vous pourrez noter l''artisan une fois le PV de réception signé', 'sans PV signé : pas d''avis');
select throws_ok(
  format('select public.particulier_submit_review(%L, 80, 100, 100, 90, %L, %L)', current_setting('test.chantier_a'),
    'excellent', repeat('x', 60)),
  '42501', 'Chantier introuvable', 'autre client : pas d''avis sur le chantier d''autrui');
reset role;
select pg_temp.connecter('d4200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select throws_ok(
  format('select public.particulier_submit_review(%L, 100, 100, 100, 90, %L, %L)', current_setting('test.chantier_a'),
    'excellent', repeat('x', 60)),
  '42501', 'Chantier introuvable', 'artisan : pas d''avis sur son propre chantier');
reset role;
select pg_temp.connecter('d4100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok(
  format('select public.particulier_submit_review(%L, 80, 100, 100, 90, %L, %L)', current_setting('test.chantier_a'),
    'excellent', '   ' || repeat('x', 49) || '   '),
  '22023', 'Votre avis doit compter entre 50 et 2 000 caractères', 'commentaire de moins de 50 caractères refusé');
select throws_ok(
  format('select public.particulier_submit_review(%L, null, 100, 101, 90, %L, %L)', current_setting('test.chantier_a'),
    'excellent', repeat('x', 60)),
  '22023', 'Notez chaque critère', 'critère manquant ou hors bornes refusé');
select throws_ok(
  $$ insert into public.reviews (chantier_id, artisan_id, particulier_id, author_name, quality, delays, communication,
       value_for_money, score, comment, experience_on)
     values (current_setting('test.chantier_a')::uuid, 'd4400000-0000-4000-8000-000000000001', auth.uid(), 'Moi',
       100, 100, 100, 'excellent', 100, repeat('x', 60), current_date) $$,
  '42501', null, 'écriture directe refusée');
select set_config('test.avis', public.particulier_submit_review(current_setting('test.chantier_a')::uuid, 80, 100, 100, 90,
  'excellent', '  Travail soigné, chantier laissé propre et artisan ponctuel du début à la fin.  ')::text, true);
select throws_ok(
  format('select public.particulier_submit_review(%L, 10, 10, 10, 90, %L, %L)', current_setting('test.chantier_a'),
    'trop_cher', repeat('x', 60)),
  '22023', 'Vous avez déjà laissé un avis sur ce chantier', 'un seul avis par chantier');
select results_eq(
  $$ select author_name, score::int, status::text, experience_on::text, comment from public.reviews $$,
  $$ values ('Camille E.'::text, 95, 'publie'::text, current_setting('test.aujourdhui'),
             'Travail soigné, chantier laissé propre et artisan ponctuel du début à la fin.'::text) $$,
  'avis publié : prénom et initiale, score (80 + 100 + 100 + 100) / 4, date du PV, commentaire nettoyé');
select throws_ok(
  format('update public.reviews set score = 100 where id = %L', current_setting('test.avis')),
  '42501', null, 'modification directe refusée');
reset role;
select results_eq(
  $$ select review_count, quality::int, delays::int, communication::int, value_for_money::int, global_score::int
     from public.artisan_scores where artisan_id = 'd4400000-0000-4000-8000-000000000001' $$,
  $$ values (1, 80, 100, 100, 100, 95) $$,
  'score MENAO de l''artisan recalculé');
select results_eq(
  $$ select user_id, data ->> 'client', (data ->> 'score')::int from public.notifications where type = 'avis_recu' $$,
  $$ values ('d4200000-0000-4000-8000-000000000001'::uuid, 'Camille'::text, 95) $$,
  'notification « avis_recu » à l''artisan');

-- ---------- Lecture : parties, autres comptes, public ----------
select pg_temp.connecter('d4100000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select is_empty($$ select * from public.reviews $$, 'autre client : avis d''autrui invisible en direct');
reset role;
select pg_temp.connecter('d4200000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select is_empty($$ select * from public.reviews $$, 'autre artisan : avis invisibles en direct');
select is_empty($$ select * from public.artisan_scores $$, 'autre artisan : score d''autrui invisible en direct');
reset role;
select pg_temp.connecter('d4200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select is((select count(*)::int from public.reviews), 1, 'artisan noté : voit l''avis');
select is((select global_score::int from public.artisan_scores), 95, 'artisan noté : voit son score');
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select throws_ok($$ select * from public.reviews $$, '42501', null, 'visiteur : pas de lecture directe');
select is((select count(*)::int from public.artisan_public_reviews('d4400000-0000-4000-8000-000000000001')), 0,
  'artisan non visible (sans abonnement) : aucun avis publié');
reset role;
-- Abonnement actif : l'artisan devient visible, ses avis publiés aussi.
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status, trial_end)
values ('d4400000-0000-4000-8000-000000000001', 'base', 'cus_avis', 'sub_avis', 'active', null);
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select results_eq(
  $$ select author_name, score::int, experience_on::text, reply from public.artisan_public_reviews('d4400000-0000-4000-8000-000000000001') $$,
  $$ values ('Camille E.'::text, 95, current_setting('test.aujourdhui'), null::text) $$,
  'visiteur : avis publié lisible, sans identifiant du client');
select is(public.artisan_public_profile('d4400000-0000-4000-8000-000000000001') #>> '{score,global}', '95',
  'visiteur : score MENAO sur la fiche');
select throws_ok(
  format('select public.particulier_submit_review(%L, 80, 100, 100, 90, %L, %L)', current_setting('test.chantier_a'),
    'excellent', repeat('x', 60)),
  '42501', null, 'visiteur : aucune action');
reset role;

-- ---------- Réponse publique de l'artisan (une fois) ----------
select pg_temp.connecter('d4200000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select throws_ok(format('select public.artisan_reply_review(%L, %L)', current_setting('test.avis'), 'Merci'),
  '42501', 'Avis introuvable', 'autre artisan : pas de réponse');
reset role;
select pg_temp.connecter('d4200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select throws_ok(format('select public.artisan_reply_review(%L, %L)', current_setting('test.avis'), '   '),
  '22023', 'Votre réponse doit compter entre 1 et 2 000 caractères', 'réponse vide refusée');
select lives_ok(format('select public.artisan_reply_review(%L, %L)', current_setting('test.avis'),
  '  Merci Camille pour votre confiance !  '), 'réponse publiée');
select throws_ok(format('select public.artisan_reply_review(%L, %L)', current_setting('test.avis'), 'Encore'),
  '22023', 'Vous avez déjà répondu à cet avis', 'une seule réponse');
reset role;
select is((select reply from public.artisan_public_reviews('d4400000-0000-4000-8000-000000000001')),
  'Merci Camille pour votre confiance !', 'réponse visible publiquement');

-- ---------- Signalement à l'équipe ----------
select pg_temp.connecter('d4100000-0000-4000-8000-000000000003', 'particulier');
set local role authenticated;
select throws_ok(format('select public.report_review(%L, %L)', current_setting('test.avis'), 'Avis mensonger selon moi'),
  '42501', 'Connectez-vous pour signaler un avis', 'session anonyme : signalement refusé');
reset role;
select pg_temp.connecter('d4200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select throws_ok(format('select public.report_review(%L, %L)', current_setting('test.avis'), 'Faux'),
  '22023', 'Décrivez le problème en 10 à 1 000 caractères', 'motif trop court refusé');
select set_config('test.ticket', public.report_review(current_setting('test.avis')::uuid,
  'Ce client cite le nom d''un voisin.')::text, true);
select is(public.report_review(current_setting('test.avis')::uuid, 'Autre motif décrit ici'),
  current_setting('test.ticket')::uuid, 'un seul signalement ouvert par personne et par avis');
reset role;
select results_eq(
  $$ select type::text, review_id::text, contact_email, status::text from public.tickets $$,
  $$ values ('avis'::text, current_setting('test.avis'), 'avis.artisan@example.test'::text, 'ouvert'::text) $$,
  'ticket « avis » pour l''équipe');

-- ---------- Masquage et republication par l'équipe ----------
select pg_temp.connecter('d4100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok(format('select public.admin_moderate_review(%L, %L, %L)', current_setting('test.avis'), 'masque',
  'Motif suffisamment long'), '42501', 'Réservé à l''équipe MENAO', 'client : pas de modération');
reset role;
select pg_temp.connecter('d4300000-0000-4000-8000-000000000001', 'support');
set local role authenticated;
select throws_ok(format('select public.admin_moderate_review(%L, %L, %L)', current_setting('test.avis'), 'masque',
  'Court'), '22023', 'Indiquez le motif du masquage en 10 à 500 caractères', 'masquage sans motif refusé');
select lives_ok(format('select public.admin_moderate_review(%L, %L, %L)', current_setting('test.avis'), 'masque',
  'Données personnelles d''un tiers'), 'avis masqué par l''équipe');
reset role;
select results_eq(
  $$ select r.status::text, r.moderation_reason, (select count(*)::int from public.artisan_scores),
       (select status::text from public.tickets), (select action from public.audit_logs where target_id = r.id)
     from public.reviews r $$,
  $$ values ('masque'::text, 'Données personnelles d''un tiers'::text, 0, 'resolu'::text, 'avis.masque'::text) $$,
  'masqué : motif conservé, score retiré, signalement clos, action journalisée');
select is((select count(*)::int from public.artisan_public_reviews('d4400000-0000-4000-8000-000000000001')), 0,
  'avis masqué : plus visible publiquement');
select pg_temp.connecter('d4200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select throws_ok(format('select public.report_review(%L, %L)', current_setting('test.avis'), 'Motif suffisamment long'),
  '42501', 'Avis introuvable', 'avis masqué : plus de signalement');
select throws_ok(format('select public.artisan_reply_review(%L, %L)', current_setting('test.avis'), 'Réponse'),
  '22023', 'Cet avis n''est pas publié', 'avis masqué : plus de réponse');
reset role;
select pg_temp.connecter('d4300000-0000-4000-8000-000000000001', 'support');
set local role authenticated;
select lives_ok(format('select public.admin_moderate_review(%L, %L, null)', current_setting('test.avis'), 'publie'),
  'avis republié');
reset role;
select results_eq(
  $$ select r.status::text, r.moderation_reason, s.global_score::int
     from public.reviews r join public.artisan_scores s on s.artisan_id = r.artisan_id $$,
  $$ values ('publie'::text, null::text, 95) $$,
  'republié : score de nouveau calculé');

select * from finish();
rollback;
