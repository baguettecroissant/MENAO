-- F-24 : gamification artisan (ADR 0091) — points gagnés en atteignant des objectifs, niveaux,
-- badges, notifications push seulement, écran « Mon grade MENAO », récompense du niveau 5 (ticket
-- pour l'équipe), propreté dans l'avis du client, droits de chaque rôle (CLAUDE.md).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('f4100000-0000-4000-8000-000000000001', 'grade.client@example.test', false, now(), '{}', '{"first_name":"Camille","last_name":"Exemple"}'),
  ('f4200000-0000-4000-8000-000000000001', 'grade.artisan@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Xavier"}'),
  ('f4200000-0000-4000-8000-000000000002', 'grade.autre@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Yasmine"}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, connect_charges_enabled, stripe_account_id, assujetti_tva) values
  ('f4400000-0000-4000-8000-000000000001', 'f4200000-0000-4000-8000-000000000001', 'valide', '00000002600013',
   'ARTISAN GRADE', '5710', '4 RUE DE LA PAIX', '75002', 'PARIS', 'communes', true, 'acct_grade', true),
  ('f4400000-0000-4000-8000-000000000002', 'f4200000-0000-4000-8000-000000000002', 'valide', '00000001800010',
   'ARTISAN AUTRE', '1000', '8 RUE DU PORT', '06300', 'NICE', 'communes', true, 'acct_grade_autre', true);
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_fin, numero, assureur, couverture, status)
values ('f4400000-0000-4000-8000-000000000001', 'decennale', 'f4400000-0000-4000-8000-000000000001/decennale.pdf',
  'application/pdf', 1000, current_date + 200, 'DEC-1', 'Assurances Exemple', 'France métropolitaine', 'valide');
insert into public.projects (id, user_id, status, description, summary, trade_code, ville_code_insee, ville_nom,
  code_postal, adresse, location, criteria_validated_at) values
  ('f4500000-0000-4000-8000-000000000001', 'f4100000-0000-4000-8000-000000000001', 'demande_envoyee',
   'Ajouter des prises.', 'Installation de prises', 'electricien', '06088', 'Nice', '06000',
   '1 Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', now());
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone) values
  ('f4600000-0000-4000-8000-000000000001', 'f4500000-0000-4000-8000-000000000001',
   'f4400000-0000-4000-8000-000000000001', 'f4100000-0000-4000-8000-000000000001', '+33612345678');

-- ---------- Règles par défaut (maquettes) ----------
select is((select xp_min from public.gamification_levels where level = 5), 1000, 'niveau 5 à 1 000 XP');
select is((select reward from public.gamification_levels where level = 5), 'Ensemble de chantier MENAO',
  'récompense du niveau 5');
select results_eq(
  $$ select code from public.gamification_objectives where not active order by code $$,
  $$ values ('amateur_des_avis'::text), ('expert_des_avis'), ('premier_avis') $$,
  'objectifs de notation des clients (F-23) inactifs en attendant l''avis juridique');
select is((select count(*)::int from public.badges where active), 9, '9 badges, dont « Pro du nettoyage »');

-- Parcours jusqu'au chantier clôturé (mêmes étapes que le test 28), en propriétaire de la base.
create function pg_temp.chantier_cloture(p_request uuid, p_client uuid) returns uuid
language plpgsql as $$
declare
  v_chantier uuid;
  v_devis uuid;
  v_pv jsonb;
  v_solde jsonb;
begin
  perform pg_temp.connecter('f4200000-0000-4000-8000-000000000001', 'artisan');
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
  perform public.record_payment(v_devis, 'acompte', 'acct_grade', 'cs_a', 'pi_a', 9900, 'paye');
  perform pg_temp.connecter('f4200000-0000-4000-8000-000000000001', 'artisan');
  perform public.artisan_confirm_start(v_chantier, (now() at time zone 'Europe/Paris')::date + 5, '08:00');
  perform app.start_due_chantiers(now() + interval '8 days');
  -- Deux photos dans le suivi.
  insert into public.chantier_updates (chantier_id, kind, storage_path) values
    (v_chantier, 'photo', v_chantier || '/1.jpg'), (v_chantier, 'photo', v_chantier || '/2.jpg');
  perform pg_temp.connecter('f4200000-0000-4000-8000-000000000001', 'artisan');
  perform public.artisan_declare_finished(v_chantier);
  perform pg_temp.connecter(p_client, 'particulier');
  v_pv := public.particulier_start_reception(v_chantier, null,
    '{"document":true,"cgu_prestataire":true,"cgu_menao":true,"echeancier":true}'::jsonb);
  perform public.record_reception_signature((v_pv ->> 'request_id')::uuid, now(),
    'f4400000-0000-4000-8000-000000000001/pv/pv-signe.pdf', null);
  v_solde := public.particulier_start_balance(v_chantier);
  perform public.record_payment((v_solde ->> 'quote_id')::uuid, 'solde', 'acct_grade', 'cs_s', 'pi_s', 23100, 'paye');
  return v_chantier;
end;
$$;
select set_config('test.chantier', pg_temp.chantier_cloture('f4600000-0000-4000-8000-000000000001',
  'f4100000-0000-4000-8000-000000000001')::text, true);
select is((select status::text from public.chantiers where id = current_setting('test.chantier')::uuid),
  'cloture', 'chantier clôturé');

-- ---------- Points : objectif « Premier chantier terminé » ----------
select results_eq(
  $$ select objective_code, xp from public.xp_events where artisan_id = 'f4400000-0000-4000-8000-000000000001' $$,
  $$ values ('premier_chantier'::text, 100) $$,
  'chantier clôturé : +100 XP (premier chantier)');
select is(app.gamification_metric('f4400000-0000-4000-8000-000000000001', 'photos_total'), 2, 'photos comptées');
select is(app.gamification_metric('f4400000-0000-4000-8000-000000000001', 'sans_reserve'), 1, 'PV sans réserves compté');

-- ---------- Avis du client avec la propreté ; badge « Pro du nettoyage » abaissé pour le test ----------
update public.badges set target = 1 where code = 'pro_du_nettoyage';
select pg_temp.connecter('f4100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok(
  format('select public.particulier_submit_review(%L, 95, 95, 95, null, %L, %L)', current_setting('test.chantier'),
    'excellent', repeat('x', 60)),
  '22023', 'Notez chaque critère', 'propreté obligatoire');
select lives_ok(
  format('select public.particulier_submit_review(%L, 95, 95, 95, 95, %L, %L)', current_setting('test.chantier'),
    'excellent', repeat('x', 60)),
  'avis publié avec la propreté');
reset role;
select is((select cleanliness from public.reviews where chantier_id = current_setting('test.chantier')::uuid),
  95::smallint, 'propreté enregistrée');
select is((select sum(xp)::int from public.xp_events where artisan_id = 'f4400000-0000-4000-8000-000000000001'),
  200, 'avis à 90 % ou plus : +100 XP (client conquis)');
select is((select badge_code from public.artisan_badges where artisan_id = 'f4400000-0000-4000-8000-000000000001'),
  'pro_du_nettoyage', 'badge « Pro du nettoyage » obtenu');
select results_eq(
  $$ select type::text, data ->> 'badge', (data ->> 'niveau')::int from public.notifications
     where user_id = 'f4200000-0000-4000-8000-000000000001' and type in ('badge_debloque', 'niveau_atteint')
     order by type $$,
  $$ values ('badge_debloque'::text, 'Pro du nettoyage'::text, null::int), ('niveau_atteint', null, 2) $$,
  'notifications : badge débloqué et niveau 2 atteint');
select ok(not app.email_wanted('f4200000-0000-4000-8000-000000000001', 'badge_debloque'), 'badge : pas d''e-mail (push seul)');
select ok(not app.email_wanted('f4200000-0000-4000-8000-000000000001', 'niveau_atteint'), 'niveau : pas d''e-mail (push seul)');
select app.refresh_gamification('f4400000-0000-4000-8000-000000000001');
select is((select count(*)::int from public.xp_events where artisan_id = 'f4400000-0000-4000-8000-000000000001'), 2,
  'recalcul sans doublon');

-- ---------- « Mon grade MENAO » ----------
select pg_temp.connecter('f4200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select is((public.artisan_grade() ->> 'xp')::int, 200, 'grade : 200 XP');
select is((public.artisan_grade() ->> 'level')::int, 2, 'grade : niveau 2');
select is(
  (select o ->> 'progress' from jsonb_array_elements(public.artisan_grade() -> 'objectives') o where o ->> 'code' = 'artisan_regulier'),
  '1', 'progression d''un objectif en cours (1/5 chantiers)');
select is(
  (select b ->> 'seen' from jsonb_array_elements(public.artisan_grade() -> 'badges') b where b ->> 'code' = 'pro_du_nettoyage'),
  'false', 'badge pas encore montré');
select public.artisan_mark_badges_seen();
select is(
  (select b ->> 'seen' from jsonb_array_elements(public.artisan_grade() -> 'badges') b where b ->> 'code' = 'pro_du_nettoyage'),
  'true', 'écran « Nouveau badge débloqué » montré une fois');
select is((select count(*)::int from public.xp_events), 2, 'artisan : ses points seulement');
select throws_ok($$ insert into public.xp_events (artisan_id, objective_code, xp)
  values ('f4400000-0000-4000-8000-000000000001', 'artisan_regulier', 1000) $$, '42501', null, 'points : écriture directe refusée');

-- ---------- Récompense du niveau 5 ----------
select throws_ok($$ select public.artisan_claim_reward(5::smallint, 'L', 'XL', '43 rue de France', 'Nice', 'France', '0612345678') $$,
  '22023', 'Vous n''avez pas encore atteint ce niveau', 'niveau 5 non atteint');
reset role;
update public.gamification_levels set xp_min = 200 where level = 5;
update public.gamification_levels set xp_min = 190 where level = 4;
update public.gamification_levels set xp_min = 180 where level = 3;
update public.gamification_levels set xp_min = 170 where level = 2;
select pg_temp.connecter('f4200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select throws_ok($$ select public.artisan_claim_reward(4::smallint, 'L', 'XL', '43 rue de France', 'Nice', 'France', '0612345678') $$,
  '22023', 'Aucune récompense pour ce niveau', 'pas de récompense au niveau 4');
select throws_ok($$ select public.artisan_claim_reward(5::smallint, 'XXXL', 'XL', '43 rue de France', 'Nice', 'France', '0612345678') $$,
  '22023', 'Choisissez vos tailles', 'taille inconnue refusée');
select throws_ok($$ select public.artisan_claim_reward(5::smallint, 'L', 'XL', '43', 'Nice', 'France', '0612345678') $$,
  '22023', 'Indiquez votre adresse de livraison', 'adresse trop courte refusée');
select throws_ok($$ select public.artisan_claim_reward(5::smallint, 'L', 'XL', '43 rue de France', 'Nice', 'France', 'abc') $$,
  '22023', 'Indiquez un numéro de téléphone valide', 'téléphone invalide refusé');
select lives_ok($$ select public.artisan_claim_reward(5::smallint, 'L', 'XL', '43 rue de France', 'Nice', 'France', '06 12 34 56 78') $$,
  'récompense demandée');
select throws_ok($$ select public.artisan_claim_reward(5::smallint, 'L', 'XL', '43 rue de France', 'Nice', 'France', '0612345678') $$,
  '22023', 'Vous avez déjà demandé cette récompense', 'une seule demande par niveau');
select is(jsonb_array_length(public.artisan_grade() -> 'claims'), 1, 'grade : récompense demandée');
reset role;
select results_eq(
  $$ select t.type::text, t.subject, t.message from public.tickets t join public.reward_claims r on r.ticket_id = t.id $$,
  $$ values ('recompense'::text, 'Récompense du niveau 5 : Ensemble de chantier MENAO'::text,
     'Veste : L. Pantalon : XL. Livraison : 43 rue de France, Nice, France. Téléphone : 06 12 34 56 78.'::text) $$,
  'ticket « recompense » pour l''équipe, avec tailles et adresse');

-- ---------- Droits des autres rôles ----------
select pg_temp.connecter('f4200000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select is((select count(*)::int from public.xp_events), 0, 'autre artisan : aucun point visible');
select is((select count(*)::int from public.reward_claims), 0, 'autre artisan : aucune récompense visible');
select is((public.artisan_grade() ->> 'xp')::int, 0, 'autre artisan : sa propre progression (0 XP)');
reset role;
select pg_temp.connecter('f4100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok('select public.artisan_grade()', '42501', 'Réservé aux artisans', 'client : pas de grade');
select is((select count(*)::int from public.artisan_badges), 0, 'client : aucun badge visible');
select is((select count(*)::int from public.badges), 9, 'règles lisibles par les comptes connectés');
reset role;
set local role anon;
select throws_ok('select 1 from public.badges', '42501', null, 'visiteur : pas d''accès aux règles');
reset role;
select ok(not has_function_privilege('authenticated', 'app.refresh_gamification(uuid, boolean)', 'execute'),
  'recalcul réservé à la base');

select * from finish();
rollback;
