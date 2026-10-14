-- Relance « Paiement en attente » (ADR 0090) : rappel unique au client dont l'acompte n'est pas
-- réglé 2 jours après la signature du devis ; pas de relance si l'acompte est payé ou en cours de
-- confirmation (virement, prélèvement) ; préférence « rappels » ; tâche réservée à la base.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e4100000-0000-4000-8000-000000000001', 'relance.a@example.test', false, now(), '{}', '{"first_name":"Camille"}'),
  ('e4100000-0000-4000-8000-000000000002', 'relance.b@example.test', false, now(), '{}', '{"first_name":"Alex"}'),
  ('e4100000-0000-4000-8000-000000000003', 'relance.c@example.test', false, now(), '{}', '{"first_name":"Sam"}'),
  ('e4200000-0000-4000-8000-000000000001', 'relance.artisan@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Xavier"}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, connect_charges_enabled, stripe_account_id, assujetti_tva) values
  ('e4400000-0000-4000-8000-000000000001', 'e4200000-0000-4000-8000-000000000001', 'valide', '00000002600013',
   'ARTISAN RELANCE', '5710', '4 RUE DE LA PAIX', '75002', 'PARIS', 'communes', true, 'acct_relance', true);
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_fin, numero, assureur, couverture, status)
values ('e4400000-0000-4000-8000-000000000001', 'decennale', 'e4400000-0000-4000-8000-000000000001/decennale.pdf',
  'application/pdf', 1000, current_date + 200, 'DEC-1', 'Assurances Exemple', 'France métropolitaine', 'valide');
insert into public.projects (id, user_id, status, description, summary, trade_code, ville_code_insee, ville_nom,
  code_postal, adresse, location, criteria_validated_at)
select ('e4500000-0000-4000-8000-00000000000' || n)::uuid, ('e4100000-0000-4000-8000-00000000000' || n)::uuid,
  'demande_envoyee', 'Ajouter des prises.', 'Installation de prises', 'electricien', '06088', 'Nice', '06000',
  n || ' Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', now()
from generate_series(1, 3) n;
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone)
select ('e4600000-0000-4000-8000-00000000000' || n)::uuid, ('e4500000-0000-4000-8000-00000000000' || n)::uuid,
  'e4400000-0000-4000-8000-000000000001', ('e4100000-0000-4000-8000-00000000000' || n)::uuid, '+3361234567' || n
from generate_series(1, 3) n;

-- Devis signé (acompte de 30 %, soit 99 €), en propriétaire de la base ; `p_payment` : état de
-- l'acompte (null : aucun paiement).
create function pg_temp.devis_signe(p_request uuid, p_client uuid, p_payment text) returns uuid
language plpgsql as $$
declare
  v_chantier uuid;
  v_devis uuid;
begin
  perform pg_temp.connecter('e4200000-0000-4000-8000-000000000001', 'artisan');
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
  if p_payment is not null then
    perform pg_temp.connecter(p_client, 'particulier');
    perform public.particulier_start_deposit(v_devis);
    perform public.record_payment(v_devis, 'acompte', 'acct_relance', 'cs_' || p_client, 'pi_' || p_client,
      9900, p_payment::public.payment_status);
  end if;
  return v_chantier;
end;
$$;
-- A : acompte jamais réglé ; B : acompte payé ; C : virement en cours de confirmation.
select set_config('test.chantier_a', pg_temp.devis_signe('e4600000-0000-4000-8000-000000000001',
  'e4100000-0000-4000-8000-000000000001', null)::text, true);
select set_config('test.chantier_b', pg_temp.devis_signe('e4600000-0000-4000-8000-000000000002',
  'e4100000-0000-4000-8000-000000000002', 'paye')::text, true);
select set_config('test.chantier_c', pg_temp.devis_signe('e4600000-0000-4000-8000-000000000003',
  'e4100000-0000-4000-8000-000000000003', 'en_cours')::text, true);
select results_eq(
  $$ select status::text from public.chantiers where particulier_id::text like 'e41%' order by particulier_id $$,
  $$ values ('devis_signe'::text), ('acompte_paye'), ('devis_signe') $$,
  'A et C en attente de l''acompte, B acompte payé');

-- ---------- Relance unique 2 jours après la signature ----------
select is(app.remind_deposits(now() + interval '1 day'), 0, 'J+1 : pas encore de relance');
select is(app.remind_deposits(now() + interval '31 days'), 0, 'signature de plus de 30 jours : pas de relance');
select is(app.remind_deposits(now() + interval '3 days'), 1, 'J+3 : seul le client A est relancé');
select is(app.remind_deposits(now() + interval '4 days'), 0, 'une seule relance');
select results_eq(
  $$ select user_id, data ->> 'chantier_id', data ->> 'artisan' from public.notifications where type = 'acompte_relance' $$,
  $$ values ('e4100000-0000-4000-8000-000000000001'::uuid, current_setting('test.chantier_a'), 'Xavier'::text) $$,
  'notification « acompte_relance » au client A, avec le chantier et l''artisan');

-- ---------- Préférences et droits ----------
select is(app.notification_category('acompte_relance'), 'rappels', 'relance désactivable (« rappels »)');
select ok(not has_function_privilege('authenticated', 'app.remind_deposits(timestamptz)', 'execute'),
  'clients et artisans ne lancent pas la relance');
select ok(not has_function_privilege('anon', 'app.remind_deposits(timestamptz)', 'execute'),
  'visiteurs : pas de relance');
select ok(exists (select 1 from cron.job where jobname = 'menao-relance-acompte'), 'tâche quotidienne planifiée');

select * from finish();
rollback;
