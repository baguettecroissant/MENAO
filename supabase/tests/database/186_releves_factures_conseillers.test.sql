-- Gains, relevé du 25 et facture des conseillers (F-197, lot 86, ADR 0397) : informations de
-- facturation contrôlées, relevé émis à partir du 25 une fois par mois, facture préparée numérotée
-- avec la TVA du régime, primes à venir, virement marqué par un admin, cloisonnement entre
-- conseillers. Données fictives (c186…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1860000-0000-4000-8000-000000000001', 'c186.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('c1860000-0000-4000-8000-000000000002', 'c186.sarah@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('c1860000-0000-4000-8000-000000000003', 'c186.ines@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('c1860000-0000-4000-8000-000000000004', 'c186.marc@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c1860000-0000-4000-8000-000000000005', 'c186.paul@example.test', false, now(), '{"role":"artisan"}', '{}');

insert into public.commercials (id, user_id, code, nom, status) values
  ('c1861000-0000-4000-8000-000000000001', 'c1860000-0000-4000-8000-000000000002', 'sarah-186', 'Sarah Exemple', 'actif'),
  ('c1861000-0000-4000-8000-000000000002', 'c1860000-0000-4000-8000-000000000003', 'ines-186', 'Inès Exemple', 'actif');

-- Marc : deux primes validées (validation et abonnement). Paul : dossier en cours, en essai.
insert into public.artisans (id, user_id, siret, raison_sociale, status) values
  ('c1862000-0000-4000-8000-000000000001', 'c1860000-0000-4000-8000-000000000004', '00000186100004', 'THERMO C186', 'brouillon'),
  ('c1862000-0000-4000-8000-000000000002', 'c1860000-0000-4000-8000-000000000005', '00000186200002', 'OLIVIERS C186', 'brouillon');
insert into public.commercial_attributions (commercial_id, artisan_id) values
  ('c1861000-0000-4000-8000-000000000001', 'c1862000-0000-4000-8000-000000000001'),
  ('c1861000-0000-4000-8000-000000000001', 'c1862000-0000-4000-8000-000000000002');
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status, trial_end) values
  ('c1862000-0000-4000-8000-000000000002', 'base', 'cus_c186', 'sub_c186', 'trialing', now() + interval '10 days');

-- Le 25 du mois en cours, 9 h à Paris ; primes validées la veille.
create temp table t_dates as
  select ((date_trunc('month', now() at time zone 'Europe/Paris') + interval '24 days 9 hours')
    at time zone 'Europe/Paris') as le25;
grant select on t_dates to authenticated;
insert into public.commercial_bonuses (id, commercial_id, artisan_id, kind, amount_cents, status, validate_after, validated_at)
select v.id::uuid, 'c1861000-0000-4000-8000-000000000001', 'c1862000-0000-4000-8000-000000000001',
  v.kind::public.commercial_bonus_kind, v.amount, 'validee', t.le25 - interval '1 day', t.le25 - interval '1 day'
from t_dates t, (values
  ('c1864000-0000-4000-8000-000000000001', 'validation', 11000),
  ('c1864000-0000-4000-8000-000000000002', 'abonnement', 3000)) as v (id, kind, amount);

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

select ok((select relrowsecurity from pg_class where oid = 'public.commercial_billing'::regclass), 'RLS : facturation');
select ok((select relrowsecurity from pg_class where oid = 'public.commercial_statements'::regclass), 'RLS : relevés');
select ok((select relrowsecurity from pg_class where oid = 'public.commercial_invoices'::regclass), 'RLS : factures');
select ok(app.is_valid_iban('FR76 3000 6000 0112 3456 7890 189'), 'IBAN valide (clé 97)');
select ok(not app.is_valid_iban('FR7630006000011234567890188'), 'IBAN : mauvaise clé refusée');

-- ---------- Sarah : informations de facturation ----------
select pg_temp.connecter('c1860000-0000-4000-8000-000000000002', 'commercial');
set local role authenticated;
select is((public.commercial_onboarding_state() ->> 'facturation')::boolean, false, 'Bien démarrer : facturation à faire');
select throws_ok($$ select public.commercial_save_billing('Sarah Exemple EI', '00000186300000', '1 rue Exemple, 06000 Nice',
  'franchise', null, 'FR7630006000011234567890188', 'SE-2026-', 1) $$, '22023', 'IBAN invalide.', 'IBAN refusé');
select throws_ok($$ select public.commercial_save_billing('Sarah Exemple EI', '00000186300000', '1 rue Exemple, 06000 Nice',
  'assujetti', null, 'FR7630006000011234567890189', 'SE-2026-', 1) $$, '22023', 'Numéro de TVA invalide.',
  'assujettie sans numéro de TVA');
select lives_ok($$ select public.commercial_save_billing('Sarah Exemple EI', '00000186300000', '1 rue Exemple, 06000 Nice',
  'assujetti', 'FR12000186300', 'FR76 3000 6000 0112 3456 7890 189', 'se-2026-', 1) $$, 'facturation enregistrée');
select is((select iban from public.commercial_billing), 'FR7630006000011234567890189', 'IBAN sans espaces');
select is((select invoice_prefix from public.commercial_billing), 'SE-2026-', 'préfixe en majuscules');
select is((public.commercial_onboarding_state() ->> 'facturation')::boolean, true, 'Bien démarrer : facturation faite');
select throws_ok($$ select public.admin_commercial_statements(null) $$, '42501', null, 'relevés du mois réservés aux admins');
reset role;

-- ---------- Relevé du 25 ----------
select is(app.issue_commercial_statements((select le25 - interval '3 days' from t_dates)), 0, 'avant le 25 : aucun relevé');
select is(app.issue_commercial_statements((select le25 from t_dates)), 1, 'le 25 : un relevé');
select is(app.issue_commercial_statements((select le25 + interval '1 day' from t_dates)), 0, 'une seule fois par mois');
select is((select total_cents from public.commercial_statements
  where commercial_id = 'c1861000-0000-4000-8000-000000000001'), 14000, 'relevé : total des primes validées');
select is((select count(*)::int from public.commercial_bonuses where statement_id is not null
  and commercial_id = 'c1861000-0000-4000-8000-000000000001'), 2, 'primes rattachées au relevé');
select is((select (data ->> 'total_centimes')::int from public.notifications
  where user_id = 'c1860000-0000-4000-8000-000000000002' and type = 'conseiller_releve'), 14000,
  'notification du relevé au conseiller');

-- ---------- Sarah : relevé, facture, gains ----------
select pg_temp.connecter('c1860000-0000-4000-8000-000000000002', 'commercial');
set local role authenticated;
select is((select count(*)::int from public.commercial_statements_list()), 1, 'ses relevés');
select is(jsonb_array_length(public.commercial_statement((select id from public.commercial_statements_list())) -> 'lines'),
  2, 'relevé : deux lignes');
select lives_ok($$ select public.commercial_issue_invoice((select id from public.commercial_statements_list())) $$,
  'facture émise');
select is((select number from public.commercial_invoices), 'SE-2026-001', 'numéro de la facture');
select is((select vat_cents from public.commercial_invoices), 2800, 'TVA à 20 %');
select is((select total_ttc_cents from public.commercial_invoices), 16800, 'total TTC');
select is((select seller ->> 'siret' from public.commercial_invoices), '00000186300000', 'identité figée');
select throws_ok($$ select public.commercial_issue_invoice((select id from public.commercial_statements_list())) $$,
  '22023', 'La facture de ce relevé est déjà émise.', 'pas deux factures pour un relevé');
select is((select next_number from public.commercial_billing), 2, 'numéro suivant');
select lives_ok($$ select public.commercial_save_billing('Sarah Exemple EI', '00000186300000', '1 rue Exemple, 06000 Nice',
  'assujetti', 'FR12000186300', 'FR7630006000011234567890189', 'AUTRE-', 9) $$, 'facturation modifiée');
select is((select invoice_prefix || next_number from public.commercial_billing), 'SE-2026-2',
  'numérotation figée après la première facture');
select is((public.commercial_gains() ->> 'mois_centimes')::int, 14000, 'gains du mois');
select is((public.commercial_gains() ->> 'payes_annee_centimes')::int, 0, 'rien de payé encore');
select is(
  array(select x ->> 'etape' from jsonb_array_elements(public.commercial_gains() -> 'a_venir') x order by 1),
  array['dossier', 'essai'], 'à venir : dossier de Paul et fin de son essai');
select is(jsonb_array_length(public.commercial_gains() -> 'mois'), 6, 'six derniers mois');
reset role;

-- ---------- Inès ne voit rien de Sarah ----------
select pg_temp.connecter('c1860000-0000-4000-8000-000000000003', 'commercial');
set local role authenticated;
select is((select count(*)::int from public.commercial_statements), 0, 'relevés d''une collègue invisibles');
select is((select count(*)::int from public.commercial_invoices), 0, 'factures d''une collègue invisibles');
select is((select count(*)::int from public.commercial_billing), 0, 'facturation d''une collègue invisible');
select is(public.commercial_statement((select id from public.commercial_statements limit 1)), null, 'relevé d''une collègue : rien');
select throws_ok($$ select public.commercial_issue_invoice('c1864000-0000-4000-8000-000000000009') $$, 'P0002',
  'Relevé introuvable.', 'facture sur un relevé inconnu');
reset role;

-- ---------- Admin : relevés du mois et virement ----------
select pg_temp.connecter('c1860000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select is(jsonb_array_length(public.admin_commercial_statements((select le25::date from t_dates))), 1, 'relevés du mois');
select is(public.admin_commercial_statements((select le25::date from t_dates)) -> 0 ->> 'invoice_number', 'SE-2026-001',
  'facture visible');
select lives_ok($$ select public.admin_mark_commercial_invoice_paid((select id from public.commercial_invoices), 'VIR-C186') $$,
  'virement marqué');
reset role;
select is((select count(*)::int from public.commercial_bonuses
  where commercial_id = 'c1861000-0000-4000-8000-000000000001' and status = 'payee'), 2, 'primes payées');
select ok((select paid_at is not null from public.commercial_invoices), 'facture payée');
select is((select count(*)::int from public.audit_logs where action = 'commercial.facture_payee'), 1, 'virement journalisé');

select * from finish();
rollback;
