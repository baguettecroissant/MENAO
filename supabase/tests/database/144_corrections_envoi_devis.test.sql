-- Corrections de l'envoi des devis (audit du 31/10/2026, ADR 0305) : activité non soumise à la
-- décennale, compte suspendu, régime de TVA revérifié à l'envoi. Données fictives (e144…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1441000-0000-4000-8000-000000000001', 'corr.client@example.test', false, now(), '{}', '{"first_name":"Camille","last_name":"Exemple"}'),
  ('e1442000-0000-4000-8000-000000000001', 'corr.peintre@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Paul"}'),
  ('e1442000-0000-4000-8000-000000000002', 'corr.suspendu@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Sam"}'),
  ('e1442000-0000-4000-8000-000000000003', 'corr.tva@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Tom"}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- P : peintre déclaré non soumis à la décennale, sans attestation ; S : compte (bientôt) suspendu ;
-- T : assujetti à la TVA au brouillon, puis passé en franchise.
insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, connect_charges_enabled, assujetti_tva, decennale_non_soumis) values
  ('e1444000-0000-4000-8000-000000000001', 'e1442000-0000-4000-8000-000000000001', 'valide', '00000002600013',
   'PEINTURE P', '1000', '4 RUE DE LA PAIX', '75002', 'PARIS', 'communes', true, true, true),
  ('e1444000-0000-4000-8000-000000000002', 'e1442000-0000-4000-8000-000000000002', 'valide', '00000001800010',
   'ARTISAN S', '5710', '8 RUE DU PORT', '06300', 'NICE', 'communes', true, true, false),
  ('e1444000-0000-4000-8000-000000000003', 'e1442000-0000-4000-8000-000000000003', 'valide', '00000003400017',
   'ARTISAN T', '5710', '2 RUE DU LAC', '06000', 'NICE', 'communes', true, true, false);
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_fin, numero, assureur, couverture, status) values
  ('e1444000-0000-4000-8000-000000000002', 'decennale', 'e1444000/decennale-s.pdf', 'application/pdf', 1000,
   current_date + 200, 'DEC-S', 'Assurances Exemple', 'France métropolitaine', 'valide'),
  ('e1444000-0000-4000-8000-000000000003', 'decennale', 'e1444000/decennale-t.pdf', 'application/pdf', 1000,
   current_date + 200, 'DEC-T', 'Assurances Exemple', 'France métropolitaine', 'valide');
insert into public.projects (id, user_id, status, description, summary, trade_code, ville_code_insee, ville_nom,
  code_postal, adresse, location, criteria_validated_at) values
  ('e1445000-0000-4000-8000-000000000001', 'e1441000-0000-4000-8000-000000000001', 'demande_envoyee',
   'Repeindre le salon.', 'Peinture du salon', 'peintre', '06088', 'Nice', '06000',
   '1 Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', now());
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone) values
  ('e1446000-0000-4000-8000-000000000001', 'e1445000-0000-4000-8000-000000000001',
   'e1444000-0000-4000-8000-000000000001', 'e1441000-0000-4000-8000-000000000001', '+33612345678'),
  ('e1446000-0000-4000-8000-000000000002', 'e1445000-0000-4000-8000-000000000001',
   'e1444000-0000-4000-8000-000000000002', 'e1441000-0000-4000-8000-000000000001', '+33612345678'),
  ('e1446000-0000-4000-8000-000000000003', 'e1445000-0000-4000-8000-000000000001',
   'e1444000-0000-4000-8000-000000000003', 'e1441000-0000-4000-8000-000000000001', '+33612345678');

-- Brouillon de 330 € TTC (TVA 10 %) pour l'artisan donné.
create function pg_temp.brouillon(p_user uuid, p_request uuid) returns uuid language plpgsql as $$
declare
  v_chantier uuid;
begin
  perform pg_temp.connecter(p_user, 'artisan');
  v_chantier := public.artisan_fix_appointment(p_request, current_date + 2, '10:00');
  return public.artisan_save_quote_draft(v_chantier, $j$[
    {"type":"main_oeuvre","designation":"Peinture","quantityMilli":3000,"unit":"h","unitPriceHtCents":10000,"vatRateBp":1000}
  ]$j$::jsonb);
end;
$$;
select set_config('test.devis_p', pg_temp.brouillon('e1442000-0000-4000-8000-000000000001', 'e1446000-0000-4000-8000-000000000001')::text, true);
select set_config('test.devis_s', pg_temp.brouillon('e1442000-0000-4000-8000-000000000002', 'e1446000-0000-4000-8000-000000000002')::text, true);
select set_config('test.devis_t', pg_temp.brouillon('e1442000-0000-4000-8000-000000000003', 'e1446000-0000-4000-8000-000000000003')::text, true);

-- ---------- Activité non soumise à la décennale : envoi possible, sans assurance ----------
select pg_temp.connecter('e1442000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select lives_ok(format('select public.artisan_send_quote(%L, 30, %L, 2)', current_setting('test.devis_p'), current_date + 10),
  'non soumis à la décennale : devis envoyé sans attestation');
reset role;
select results_eq(
  $$ select status::text, (document #>> '{issuer,decennale_non_soumis}')::boolean, document #> '{issuer,decennale}'
     from public.quotes where id = current_setting('test.devis_p')::uuid $$,
  $$ values ('envoye'::text, true, 'null'::jsonb) $$,
  'document figé : activité non soumise, aucune assurance');

-- ---------- Compte suspendu : plus d'envoi ----------
update public.artisans set status = 'suspendu' where id = 'e1444000-0000-4000-8000-000000000002';
select pg_temp.connecter('e1442000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select throws_ok(format('select public.artisan_send_quote(%L, 30, %L, 2)', current_setting('test.devis_s'), current_date + 10),
  '42501', 'Votre compte n''est pas actif : l''envoi de devis est indisponible', 'compte suspendu : envoi refusé');
reset role;
select is((select status::text from public.quotes where id = current_setting('test.devis_s')::uuid), 'brouillon',
  'compte suspendu : le devis reste en brouillon');

-- ---------- Régime de TVA changé après le brouillon ----------
update public.artisans set assujetti_tva = false where id = 'e1444000-0000-4000-8000-000000000003';
select pg_temp.connecter('e1442000-0000-4000-8000-000000000003', 'artisan');
set local role authenticated;
select throws_ok(format('select public.artisan_send_quote(%L, 30, %L, 2)', current_setting('test.devis_t'), current_date + 10),
  '22023', 'Les taux de TVA du devis ne correspondent plus à votre régime de TVA : modifiez le devis',
  'franchise de TVA depuis le brouillon : envoi refusé');
reset role;
update public.artisans set assujetti_tva = true where id = 'e1444000-0000-4000-8000-000000000003';
select pg_temp.connecter('e1442000-0000-4000-8000-000000000003', 'artisan');
set local role authenticated;
select lives_ok(format('select public.artisan_send_quote(%L, 30, %L, 2)', current_setting('test.devis_t'), current_date + 10),
  'régime cohérent : envoi accepté, décennale exigée et présente');
reset role;

select * from finish();
rollback;
