-- Fiche retirée du site public (F-188, ADR 0387) : invisible des particuliers, écrite par l'équipe.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1800000-0000-4000-8000-000000000001', 'masque180.artisan@example.test', false, now(), '{"role":"artisan"}', '{}');

insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, connect_charges_enabled, stripe_account_id, assujetti_tva)
values ('c1810000-0000-4000-8000-000000000001', 'c1800000-0000-4000-8000-000000000001', 'valide',
  '00000018000000', 'ARTISAN MASQUE', '5710', '1 RUE DE LA PAIX', '06000', 'NICE', 'communes', true,
  'acct_masque_1', true);
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status, trial_end)
values ('c1810000-0000-4000-8000-000000000001', 'base', 'cus_masque_1', 'sub_masque_1', 'trialing', now() + interval '30 days');

select ok(app.artisan_is_visible('c1810000-0000-4000-8000-000000000001'), 'fiche visible par défaut');

-- ---------- L'artisan ne peut pas changer ce réglage ----------
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', 'c1800000-0000-4000-8000-000000000001', 'role', 'authenticated', 'aal', 'aal1',
  'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
set local role authenticated;
select throws_ok(
  $$ update public.artisans set masque_public = true where id = 'c1810000-0000-4000-8000-000000000001' $$,
  '42501', null, 'un artisan ne modifie pas le retrait du site public');
reset role;

-- ---------- Retirée par l'équipe : invisible, statut inchangé ----------
update public.artisans set masque_public = true where id = 'c1810000-0000-4000-8000-000000000001';
select ok(not app.artisan_is_visible('c1810000-0000-4000-8000-000000000001'), 'fiche retirée : invisible');
select is((select status::text from public.artisans where id = 'c1810000-0000-4000-8000-000000000001'),
  'valide', 'le statut ne change pas');

select * from finish();
rollback;
