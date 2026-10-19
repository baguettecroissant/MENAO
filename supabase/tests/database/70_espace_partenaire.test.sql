-- Espace partenaire (F-59, lot 2, ADR 0139) : lien créé et renouvelé par un admin seulement,
-- journalisé ; lecture sans compte par le jeton (chiffres et montants, aucune donnée
-- personnelle) ; lien inconnu, mal formé ou renouvelé : rien. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c7000000-0000-4000-8000-000000000001', 'esp70.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('c7000000-0000-4000-8000-000000000002', 'esp70.artisan@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.partners (id, code, nom, siret, contact_email, montant_demande_centimes) values
  ('c7010000-0000-4000-8000-000000000001', 'agence-esp70', 'Agence Exemple', '73282932000074',
   'esp70.agence@example.test', 1500);
update public.partner_settings set montant_abonne_centimes = 4000, delai_validation_jours = 30 where id;
insert into public.partner_commissions (partner_id, kind, amount_cents, status, validate_after, validated_at, paid_at, payout_reference, cancel_reason) values
  ('c7010000-0000-4000-8000-000000000001', 'demande_qualifiee', 1500, 'en_attente', now() + interval '30 days', null, null, null, null),
  ('c7010000-0000-4000-8000-000000000001', 'demande_qualifiee', 1500, 'validee', now() - interval '1 day', now(), null, null, null),
  ('c7010000-0000-4000-8000-000000000001', 'demande_qualifiee', 1500, 'payee', now() - interval '40 days', now() - interval '9 days', now(), 'FAC-1', null),
  ('c7010000-0000-4000-8000-000000000001', 'abonne_payant', 4000, 'annulee', now() - interval '1 day', null, null, null, 'Abonnement inactif');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Lien créé par un admin seulement ----------
select pg_temp.connecter('c7000000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select throws_ok($$ select public.admin_renew_partner_dashboard('c7010000-0000-4000-8000-000000000001') $$,
  '42501', null, 'artisan : création du lien impossible');
reset role;

select pg_temp.connecter('c7000000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select matches(public.admin_renew_partner_dashboard('c7010000-0000-4000-8000-000000000001'), '^[0-9a-f]{48}$',
  'admin : lien créé (48 caractères aléatoires)');
select throws_ok($$ select public.admin_renew_partner_dashboard(gen_random_uuid()) $$,
  '22023', 'Partenaire introuvable.', 'partenaire inconnu : refusé');
reset role;
select is((select count(*)::int from public.audit_logs where action = 'partenaire.lien_espace'), 1, 'création du lien journalisée');

-- ---------- Lecture sans compte par le jeton ----------
select set_config('test.jeton', (select dashboard_token from public.partners where code = 'agence-esp70'), true);
set local role anon;
select is(public.partner_dashboard(current_setting('test.jeton')) ->> 'nom', 'Agence Exemple',
  'visiteur sans compte : espace lisible avec le lien');
reset role;
select results_eq(
  format($$ select d ->> 'qualified', d ->> 'pending_cents', d ->> 'validated_cents', d ->> 'paid_cents',
                   d ->> 'montant_demande_centimes', d ->> 'montant_abonne_centimes', d ->> 'delai_validation_jours'
            from (select public.partner_dashboard(%L) as d) s $$,
    (select dashboard_token from public.partners where code = 'agence-esp70')),
  $$ values ('3', '1500', '1500', '1500', '1500', '4000', '30') $$,
  'chiffres : demandes, montants par statut, primes (négociée ou par défaut), délai');
select ok(
  not (public.partner_dashboard((select dashboard_token from public.partners where code = 'agence-esp70'))::jsonb
       ?| array['siret', 'contact_email', 'notes']),
  'ni SIRET, ni e-mail, ni notes internes dans l''espace');
select ok(public.partner_dashboard('0123456789abcdef0123456789abcdef0123456789abcdef') is null, 'lien inconnu : rien');
select ok(public.partner_dashboard('pas-un-jeton') is null, 'lien mal formé : rien');

-- Renouvellement : l'ancien lien ne répond plus.
select pg_temp.connecter('c7000000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select lives_ok($$ select public.admin_renew_partner_dashboard('c7010000-0000-4000-8000-000000000001') $$, 'lien renouvelé');
reset role;
select ok(public.partner_dashboard(current_setting('test.jeton')) is null, 'ancien lien : ne répond plus');

select * from finish();
rollback;
