-- F-31 : paiement de l'acompte (paiement en attente, enregistrement des événements Stripe,
-- chantier « acompte payé », notifications), droits de chaque rôle (CLAUDE.md).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('ab100000-0000-4000-8000-000000000001', 'pay.client@example.test', false, now(), '{}', '{"first_name":"Camille","last_name":"Exemple"}'),
  ('ab200000-0000-4000-8000-000000000001', 'pay.x1@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Xavier"}'),
  ('ab200000-0000-4000-8000-000000000002', 'pay.x2@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Yasmine"}'),
  ('ab300000-0000-4000-8000-000000000001', 'pay.support@example.test', false, now(), '{"role":"support"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- X1 peut encaisser (Stripe Connect actif), X2 pas encore.
insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, connect_charges_enabled, stripe_account_id, assujetti_tva) values
  ('ab400000-0000-4000-8000-000000000001', 'ab200000-0000-4000-8000-000000000001', 'valide', '00000002600013',
   'ARTISAN X1', '5710', '4 RUE DE LA PAIX', '75002', 'PARIS', 'communes', true, 'acct_test_x1', true),
  ('ab400000-0000-4000-8000-000000000002', 'ab200000-0000-4000-8000-000000000002', 'valide', '00000001800010',
   'ARTISAN X2', '1000', '8 RUE DU PORT', '06300', 'NICE', 'communes', false, null, true);
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_fin, numero, assureur, couverture, status)
select a, 'decennale', a || '/decennale.pdf', 'application/pdf', 1000, current_date + 200, 'DEC-1', 'Assurances Exemple',
  'France métropolitaine', 'valide'
from unnest(array['ab400000-0000-4000-8000-000000000001', 'ab400000-0000-4000-8000-000000000002']::uuid[]) a;
insert into public.projects (id, user_id, status, description, summary, trade_code, ville_code_insee, ville_nom,
  code_postal, adresse, location, criteria_validated_at) values
  ('ab500000-0000-4000-8000-000000000001', 'ab100000-0000-4000-8000-000000000001', 'demande_envoyee',
   'Ajouter des prises.', 'Installation de prises', 'electricien', '06088', 'Nice', '06000',
   '1 Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', now());
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone) values
  ('ab600000-0000-4000-8000-000000000001', 'ab500000-0000-4000-8000-000000000001',
   'ab400000-0000-4000-8000-000000000001', 'ab100000-0000-4000-8000-000000000001', '+33612345678'),
  ('ab600000-0000-4000-8000-000000000002', 'ab500000-0000-4000-8000-000000000001',
   'ab400000-0000-4000-8000-000000000002', 'ab100000-0000-4000-8000-000000000001', '+33612345678');

-- ---------- Devis envoyés : 330 € TTC (X1), acompte de 30 % ----------
select pg_temp.connecter('ab200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select set_config('test.chantier',
  public.artisan_fix_appointment('ab600000-0000-4000-8000-000000000001', current_date + 2, '10:00')::text, true);
select set_config('test.devis', public.artisan_save_quote_draft(current_setting('test.chantier')::uuid, $$[
  {"type":"materiel","designation":"Prise de courant","quantityMilli":4000,"unit":"u","unitPriceHtCents":2250,"vatRateBp":1000},
  {"type":"main_oeuvre","designation":"Pose","quantityMilli":3000,"unit":"h","unitPriceHtCents":5500,"vatRateBp":1000},
  {"type":"autre","designation":"Déplacement","quantityMilli":1000,"unit":"forfait","unitPriceHtCents":4500,"vatRateBp":1000}
]$$::jsonb)::text, true);
select set_config('test.numero', public.artisan_send_quote(current_setting('test.devis')::uuid, 30, current_date + 10, 2), true);
select throws_ok(format('select public.particulier_start_deposit(%L)', current_setting('test.devis')),
  '42501', null, 'artisan : pas de paiement à la place du client');
reset role;
select pg_temp.connecter('ab200000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select set_config('test.chantier2',
  public.artisan_fix_appointment('ab600000-0000-4000-8000-000000000002', current_date + 2, '14:00')::text, true);
select set_config('test.devis2', public.artisan_save_quote_draft(current_setting('test.chantier2')::uuid,
  '[{"type":"materiel","designation":"Prise","quantityMilli":1000,"unit":"u","unitPriceHtCents":1500,"vatRateBp":2000}]')::text, true);
select public.artisan_send_quote(current_setting('test.devis2')::uuid, 30, current_date + 10, 1);
reset role;

select pg_temp.connecter('ab100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok(format('select public.particulier_start_deposit(%L)', current_setting('test.devis')),
  '22023', 'L''acompte de ce devis ne peut pas être payé', 'devis non signé : pas d''acompte');
reset role;

-- Signature des deux devis (enregistrée comme par le webhook du prestataire).
select public.transition_chantier(c, 'devis_signe')
from unnest(array[current_setting('test.chantier'), current_setting('test.chantier2')]::uuid[]) c;
update public.quotes set status = 'signe', signed_at = now(), signed_pdf_path = artisan_id || '/signe.pdf'
where id in (current_setting('test.devis')::uuid, current_setting('test.devis2')::uuid);

-- ---------- Particulier : paiement en attente, repris ----------
select pg_temp.connecter('ab100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select set_config('test.paiement', public.particulier_start_deposit(current_setting('test.devis')::uuid)::text, true);
select is(current_setting('test.paiement')::jsonb - 'payment_id',
  jsonb_build_object('amount_cents', 9900, 'stripe_account_id', 'acct_test_x1', 'previous_session_id', null,
    'numero', current_setting('test.numero'), 'client_email', 'pay.client@example.test'),
  'paiement en attente : acompte de l''échéancier figé (30 % de 330 €), compte de l''artisan');
select is(public.particulier_start_deposit(current_setting('test.devis')::uuid) ->> 'payment_id',
  current_setting('test.paiement')::jsonb ->> 'payment_id', 'paiement en attente repris');
select throws_ok(format('select public.particulier_start_deposit(%L)', current_setting('test.devis2')),
  '22023', 'L''artisan ne peut pas encore recevoir de paiement : réessayez plus tard',
  'artisan sans compte Stripe actif : paiement impossible');
select is((select count(*)::int from public.payments), 1, 'particulier : son paiement lisible');
select throws_ok('update public.payments set status = ''paye''', '42501', null, 'particulier : aucune écriture directe');
reset role;

-- ---------- Autres rôles ----------
select pg_temp.connecter('ab200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select is((select count(*)::int from public.payments), 1, 'X1 : paiement de son chantier lisible');
select throws_ok(format('select public.record_payment(%L, %L, %L, %L, %L, %s, %L)',
    current_setting('test.devis'), 'acompte', 'acct_test_x1', 'cs_1', 'pi_1', 9900, 'paye'),
  '42501', null, 'artisan : enregistrement des paiements réservé au serveur');
reset role;
select pg_temp.connecter('ab200000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select is((select count(*)::int from public.payments), 0, 'X2 : paiements d''autrui invisibles');
reset role;
select pg_temp.connecter('ab300000-0000-4000-8000-000000000001', 'support');
set local role authenticated;
select is((select count(*)::int from public.payments), 1, 'support : paiements lisibles');
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select throws_ok('select 1 from public.payments', '42501', null, 'visiteur : aucun accès');
reset role;

-- ---------- Serveur (webhook Stripe) ----------
update public.payments set stripe_checkout_session_id = 'cs_1'
where id = (current_setting('test.paiement')::jsonb ->> 'payment_id')::uuid;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select is(public.record_payment(current_setting('test.devis')::uuid, 'acompte', 'acct_test_x1', 'cs_1', 'pi_1', 9800, 'paye'),
  'incoherent', 'montant différent : refusé');
select is(public.record_payment(current_setting('test.devis')::uuid, 'acompte', 'acct_autre', 'cs_1', 'pi_1', 9900, 'paye'),
  'incoherent', 'autre compte Stripe : refusé');
select is(public.record_payment(current_setting('test.devis')::uuid, 'acompte', 'acct_test_x1', 'cs_0', null, 9900, 'annule'),
  'ignore', 'ancienne session expirée : paiement courant inchangé');
select is(public.record_payment(current_setting('test.devis')::uuid, 'acompte', 'acct_test_x1', 'cs_1', 'pi_1', 9900, 'en_cours'),
  'en_cours', 'virement en attente');
reset role;
select pg_temp.connecter('ab100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok(format('select public.particulier_start_deposit(%L)', current_setting('test.devis')),
  '22023', 'Un paiement de l''acompte est déjà en cours (virement en attente)', 'virement en attente : pas de second paiement');
reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select is(public.record_payment(current_setting('test.devis')::uuid, 'acompte', 'acct_test_x1', 'cs_1', 'pi_1', 9900, 'paye'),
  'paye', 'fonds reçus : acompte payé');
select is(public.record_payment(current_setting('test.devis')::uuid, 'acompte', 'acct_test_x1', 'cs_1', 'pi_1', 9900, 'paye'),
  'deja_paye', 'événement rejoué sans effet');
select is(public.record_payment(current_setting('test.devis2')::uuid, 'acompte', 'acct_test_x1', 'cs_9', 'pi_9', 450, 'paye'),
  'inconnu', 'aucun paiement attendu : ignoré');
reset role;

select results_eq(
  $$ select p.status::text, p.paid_at is not null, p.stripe_payment_intent_id, c.status::text
     from public.payments p join public.chantiers c on c.id = p.chantier_id
     where p.quote_id = current_setting('test.devis')::uuid $$,
  $$ values ('paye'::text, true, 'pi_1'::text, 'acompte_paye'::text) $$,
  'acompte payé, chantier « acompte payé »');
select results_eq(
  $$ select type::text, data - 'chantier_id' from public.notifications
     where type = 'acompte_paye' order by data ->> 'destinataire' $$,
  $$ values ('acompte_paye'::text, '{"destinataire":"artisan","titre":"Installation de prises","client":"Camille","montant":9900}'::jsonb),
            ('acompte_paye'::text, '{"destinataire":"client","titre":"Installation de prises","artisan":"Xavier","montant":9900}'::jsonb) $$,
  'notifications « acompte payé » à l''artisan et au client');

select pg_temp.connecter('ab100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok(format('select public.particulier_start_deposit(%L)', current_setting('test.devis')),
  '22023', 'L''acompte de ce devis ne peut pas être payé', 'acompte payé : plus de paiement');
reset role;

select * from finish();
rollback;
