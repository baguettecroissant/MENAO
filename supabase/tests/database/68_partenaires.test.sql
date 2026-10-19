-- Programme Partenaires (F-59, ADR 0136) : partenaires réservés aux admins (lecture et écriture),
-- attribution des projets par la clé serveur seulement, attribution des inscriptions d'artisans,
-- commission à la première acceptation d'un artisan, à la première facture payée, garde-fous
-- (partenaire lui-même, plafond mensuel), validation après délai (avec un vrai contact, ADR 0145),
-- paiement et annulation journalisés. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c6800000-0000-4000-8000-000000000001', 'part68.client@example.test', false, now(), '{"role":"particulier"}', '{}'),
  ('c6800000-0000-4000-8000-000000000002', 'part68.artisan@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c6800000-0000-4000-8000-000000000003', 'part68.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('c6800000-0000-4000-8000-000000000004', 'part68.agence@example.test', false, now(), '{"role":"particulier"}', '{}'),
  ('c6800000-0000-4000-8000-000000000005', 'part68.nouveau@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, assujetti_tva) values
  ('c6810000-0000-4000-8000-000000000001', 'c6800000-0000-4000-8000-000000000002', 'valide',
   '00000068000017', 'PLOMBERIE EXEMPLE', '5710', '1 RUE DE L''EXEMPLE', '06000', 'NICE', 'communes', true),
  ('c6810000-0000-4000-8000-000000000002', 'c6800000-0000-4000-8000-000000000005', 'valide',
   '00000068000025', 'ELEC EXEMPLE', '5710', '2 RUE DE L''EXEMPLE', '06000', 'NICE', 'communes', true);
insert into public.projects (id, user_id, status, description, trade_code, ville_code_insee, ville_nom) values
  ('c6820000-0000-4000-8000-000000000001', 'c6800000-0000-4000-8000-000000000001', 'demande_envoyee', 'Projet A', 'plombier', '06088', 'Nice'),
  ('c6820000-0000-4000-8000-000000000002', 'c6800000-0000-4000-8000-000000000004', 'demande_envoyee', 'Projet B', 'plombier', '06088', 'Nice'),
  ('c6820000-0000-4000-8000-000000000003', 'c6800000-0000-4000-8000-000000000001', 'demande_envoyee', 'Projet C', 'plombier', '06088', 'Nice'),
  ('c6820000-0000-4000-8000-000000000004', 'c6800000-0000-4000-8000-000000000001', 'demande_envoyee', 'Projet D', 'plombier', '06088', 'Nice');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Réservé aux admins (session aal2) ----------
select pg_temp.connecter('c6800000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select throws_ok(
  $$ select public.admin_save_partner('agence-exemple', 'Agence Exemple', '73282932000074',
       'part68.agence@example.test', 'actif') $$,
  '42501', null, 'artisan : création de partenaire impossible');
select throws_ok($$ select * from public.admin_partners() $$, '42501', null, 'artisan : liste impossible');
select throws_ok(
  $$ select public.attribute_project_partner('c6820000-0000-4000-8000-000000000001', 'agence-exemple') $$,
  '42501', null, 'navigateur : attribution d''un projet impossible (clé serveur seulement)');
reset role;

select pg_temp.connecter('c6800000-0000-4000-8000-000000000003', 'admin', 'aal1');
set local role authenticated;
select throws_ok(
  $$ select public.admin_save_partner('agence-exemple', 'Agence Exemple', '73282932000074',
       'part68.agence@example.test', 'actif') $$,
  '42501', null, 'admin sans double authentification : impossible');
reset role;

-- ---------- Création et modification par un admin ----------
select pg_temp.connecter('c6800000-0000-4000-8000-000000000003', 'admin');
set local role authenticated;
select throws_ok(
  $$ select public.admin_save_partner('Agence_Exemple', 'Agence Exemple', '73282932000074',
       'part68.agence@example.test', 'actif') $$,
  '22023', 'Code invalide : 3 à 32 caractères, minuscules, chiffres et tirets.', 'code mal formé : refusé');
select throws_ok(
  $$ select public.admin_save_partner('agence-exemple', 'Agence Exemple', '73282932000075',
       'part68.agence@example.test', 'actif') $$,
  '22023', 'SIRET invalide : le programme est réservé aux professionnels.', 'SIRET invalide : refusé');
select throws_ok(
  $$ select public.admin_save_partner('agence-exemple', 'Agence Exemple', '73282932000074',
       'pas-une-adresse', 'actif') $$,
  '22023', 'Adresse e-mail de contact invalide.', 'e-mail invalide : refusé');
select lives_ok(
  $$ select public.admin_save_partner(' Agence-Exemple ', 'Agence Exemple', '7328 2932 0000 74',
       'Part68.Agence@example.test', 'actif', 2500) $$,
  'partenaire créé (code et e-mail normalisés, montant négocié)');
select lives_ok(
  $$ select public.admin_save_partner('comptable-exemple', 'Cabinet Exemple', '00000069000016',
       'part68.comptable@example.test', 'actif') $$,
  'second partenaire créé');
select throws_ok(
  $$ select public.admin_save_partner('agence-exemple', 'Autre', '73282932000074',
       'autre@example.test', 'actif') $$,
  '22023', 'Ce code est déjà utilisé.', 'code déjà utilisé : refusé');
select is((select siret from public.partners where code = 'agence-exemple'), '73282932000074', 'SIRET sans espaces');
select lives_ok(
  $$ select public.admin_save_partner('nouveau-code', 'Cabinet Exemple', '00000069000016',
       'part68.comptable@example.test', 'actif', null, 6000, 'Prime négociée',
       (select id from public.partners where code = 'comptable-exemple')) $$,
  'modification du partenaire');
select is((select code from public.partners where nom = 'Cabinet Exemple'), 'comptable-exemple',
  'le code ne change pas : les liens diffusés restent valables');
select lives_ok($$ select public.admin_save_partner_settings(30, 1000, 4000) $$, 'réglages enregistrés');
select throws_ok($$ select public.admin_save_partner_settings(365, 1000, 4000) $$,
  '22023', 'Délai de validation : entre 0 et 180 jours.', 'délai hors limites : refusé');
select is((select count(*)::int from public.partners), 2, 'admin : partenaires visibles');
reset role;
select is(
  (select count(*)::int from public.audit_logs where action in ('partenaire.cree', 'partenaire.modifie', 'partenaires.reglages')
     and actor_id = 'c6800000-0000-4000-8000-000000000003'),
  4, 'créations, modification et réglages inscrits au journal');

-- ---------- Attribution des projets (clé serveur) ----------
select ok(public.attribute_project_partner('c6820000-0000-4000-8000-000000000001', 'AGENCE-EXEMPLE'),
  'projet attribué par le lien partenaire');
select ok(not public.attribute_project_partner('c6820000-0000-4000-8000-000000000001', 'comptable-exemple'),
  'déjà attribué : le premier partenaire reste');
select ok(not public.attribute_project_partner('c6820000-0000-4000-8000-000000000003', 'code-inconnu'),
  'code inconnu : sans effet');
select ok(public.attribute_project_partner('c6820000-0000-4000-8000-000000000002', 'agence-exemple'),
  'projet du partenaire lui-même : attribué, la commission sera annulée');

-- ---------- Demande qualifiée : première acceptation d'un artisan ----------
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone) values
  ('c6830000-0000-4000-8000-000000000001', 'c6820000-0000-4000-8000-000000000001',
   'c6810000-0000-4000-8000-000000000001', 'c6800000-0000-4000-8000-000000000001', '+33600000068'),
  ('c6830000-0000-4000-8000-000000000002', 'c6820000-0000-4000-8000-000000000001',
   'c6810000-0000-4000-8000-000000000002', 'c6800000-0000-4000-8000-000000000001', '+33600000068'),
  ('c6830000-0000-4000-8000-000000000003', 'c6820000-0000-4000-8000-000000000002',
   'c6810000-0000-4000-8000-000000000001', 'c6800000-0000-4000-8000-000000000004', '+33600000069');
select is_empty($$ select 1 from public.partner_commissions $$, 'demande envoyée : pas encore de commission');
update public.requests set status = 'acceptee', responded_at = now()
where id = 'c6830000-0000-4000-8000-000000000001';
select results_eq(
  $$ select status::text, amount_cents from public.partner_commissions
     where project_id = 'c6820000-0000-4000-8000-000000000001' $$,
  $$ values ('en_attente', 2500) $$,
  'acceptée : commission en attente, au montant négocié');
update public.requests set status = 'acceptee', responded_at = now()
where id = 'c6830000-0000-4000-8000-000000000002';
select is((select count(*)::int from public.partner_commissions
           where project_id = 'c6820000-0000-4000-8000-000000000001'), 1,
  'seconde acceptation sur le même projet : une seule commission');
update public.requests set status = 'acceptee', responded_at = now()
where id = 'c6830000-0000-4000-8000-000000000003';
select results_eq(
  $$ select status::text, cancel_reason from public.partner_commissions
     where project_id = 'c6820000-0000-4000-8000-000000000002' $$,
  $$ values ('annulee', 'Compte du partenaire lui-même') $$,
  'client = partenaire : commission annulée d''office');

-- Plafond mensuel : une demande rémunérée par mois et par partenaire.
update public.partner_settings set plafond_demandes_mois = 1 where id;
select ok(public.attribute_project_partner('c6820000-0000-4000-8000-000000000003', 'agence-exemple'), 'troisième projet attribué');
insert into public.requests (project_id, artisan_id, particulier_id, contact_phone, status, responded_at) values
  ('c6820000-0000-4000-8000-000000000003', 'c6810000-0000-4000-8000-000000000001',
   'c6800000-0000-4000-8000-000000000001', '+33600000068', 'acceptee', now());
select results_eq(
  $$ select status::text, cancel_reason from public.partner_commissions
     where project_id = 'c6820000-0000-4000-8000-000000000003' $$,
  $$ values ('annulee', 'Plafond mensuel de demandes atteint') $$,
  'plafond atteint : commission annulée (gardée pour la transparence)');
update public.partner_settings set plafond_demandes_mois = null where id;

-- Partenaire suspendu : plus d'attribution.
update public.partners set status = 'suspendu' where code = 'agence-exemple';
select ok(not public.attribute_project_partner('c6820000-0000-4000-8000-000000000004', 'agence-exemple'),
  'partenaire suspendu : lien sans effet');
update public.partners set status = 'actif' where code = 'agence-exemple';

-- ---------- Inscription d'un artisan par un lien partenaire ----------
select lives_ok(
  $$ select app.apply_artisan_signup('c6810000-0000-4000-8000-000000000002',
       '{"partner_code": "comptable-exemple"}'::jsonb) $$,
  'inscription avec un code partenaire');
select is(
  (select p.code from public.partner_attributions a join public.partners p on p.id = a.partner_id
   where a.artisan_id = 'c6810000-0000-4000-8000-000000000002'),
  'comptable-exemple', 'fiche artisan attribuée au prescripteur');
select lives_ok(
  $$ select app.apply_artisan_signup('c6810000-0000-4000-8000-000000000001',
       '{"partner_code": "code-inconnu"}'::jsonb) $$,
  'code inconnu à l''inscription : sans erreur');
select is_empty($$ select 1 from public.partner_attributions where artisan_id = 'c6810000-0000-4000-8000-000000000001' $$,
  'code inconnu : aucune attribution');

-- ---------- Abonné payant : première facture payée ----------
insert into public.subscriptions (artisan_id, stripe_customer_id, stripe_subscription_id, status) values
  ('c6810000-0000-4000-8000-000000000002', 'cus_part68', 'sub_part68', 'active');
select pg_temp.connecter('c6800000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select throws_ok($$ select public.record_subscription_payment('sub_part68') $$, '42501', null,
  'premier paiement : réservé à la clé serveur (stripe-webhook)');
reset role;
select ok(public.record_subscription_payment('sub_part68'), 'premier paiement enregistré');
select ok(not public.record_subscription_payment('sub_part68'), 'paiements suivants : sans effet');
select ok(not public.record_subscription_payment('sub_inconnu'), 'abonnement inconnu : sans effet');
select results_eq(
  $$ select status::text, amount_cents from public.partner_commissions
     where artisan_id = 'c6810000-0000-4000-8000-000000000002' and kind = 'abonne_payant' $$,
  $$ values ('en_attente', 6000) $$,
  'prime du prescripteur en attente, au montant négocié');

-- ---------- Validation après le délai ----------
-- Vrai contact sur le projet A (ADR 0145) : la visite a eu lieu hier, sans annulation.
insert into public.chantiers (id, project_id, request_id, artisan_id, particulier_id, title) values
  ('c6840000-0000-4000-8000-000000000001', 'c6820000-0000-4000-8000-000000000001',
   'c6830000-0000-4000-8000-000000000001', 'c6810000-0000-4000-8000-000000000001',
   'c6800000-0000-4000-8000-000000000001', 'Projet A');
insert into public.appointments (chantier_id, starts_at) values
  ('c6840000-0000-4000-8000-000000000001', now() - interval '1 day');
update public.partner_commissions set validate_after = now() - interval '1 minute' where status = 'en_attente';
select is(app.validate_partner_commissions(), 2, 'deux commissions arrivées à échéance');
select is((select status::text from public.partner_commissions where project_id = 'c6820000-0000-4000-8000-000000000001'),
  'validee', 'demande qualifiée validée');
select is((select status::text from public.partner_commissions where kind = 'abonne_payant'),
  'validee', 'abonné toujours actif : prime validée');

-- Abonné résilié avant la fin du délai : prime annulée.
update public.partner_commissions set status = 'en_attente', validated_at = null, validate_after = now() - interval '1 minute'
where kind = 'abonne_payant';
update public.subscriptions set status = 'canceled' where stripe_subscription_id = 'sub_part68';
select is(app.validate_partner_commissions(), 1, 'une commission arrivée à échéance');
select results_eq(
  $$ select status::text, cancel_reason from public.partner_commissions where kind = 'abonne_payant' $$,
  $$ values ('annulee', 'Abonnement inactif à la fin du délai de validation') $$,
  'abonnement résilié : prime annulée');

-- ---------- Paiement et annulation par un admin ----------
select pg_temp.connecter('c6800000-0000-4000-8000-000000000003', 'admin');
set local role authenticated;
select throws_ok(
  $$ select public.admin_mark_commissions_paid(array(select id from public.partner_commissions), ' ') $$,
  '22023', 'Indiquez la référence du paiement (facture du partenaire, virement).', 'paiement sans référence : refusé');
select is(
  public.admin_mark_commissions_paid(array(select id from public.partner_commissions), 'FAC-2026-001'),
  1, 'seules les commissions validées passent payées');
select results_eq(
  $$ select status::text, payout_reference from public.partner_commissions
     where project_id = 'c6820000-0000-4000-8000-000000000001' $$,
  $$ values ('payee', 'FAC-2026-001') $$,
  'commission payée avec sa référence');
select throws_ok(
  $$ select public.admin_cancel_partner_commission(
       (select id from public.partner_commissions where project_id = 'c6820000-0000-4000-8000-000000000001'), 'Erreur') $$,
  '22023', 'Commission introuvable ou déjà payée.', 'commission payée : annulation impossible');
select results_eq(
  $$ select code, projects, qualified, artisans, paying, paid_cents from public.admin_partners() order by code $$,
  $$ values ('agence-exemple', 3, 1, 0, 0, 2500::bigint), ('comptable-exemple', 0, 0, 1, 0, 0::bigint) $$,
  'liste : projets attribués, demandes qualifiées, artisans, abonnés payants, montants payés');
reset role;
select is(
  (select count(*)::int from public.audit_logs where action = 'partenaires.commissions_payees'),
  1, 'paiement inscrit au journal');

-- ---------- Invisibles pour les autres comptes ----------
select pg_temp.connecter('c6800000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select is_empty($$ select 1 from public.partners $$, 'particulier : aucun partenaire visible');
select is_empty($$ select 1 from public.partner_attributions $$, 'particulier : aucune attribution visible');
select is_empty($$ select 1 from public.partner_commissions $$, 'particulier : aucune commission visible');
select is_empty($$ select 1 from public.partner_settings $$, 'particulier : réglages invisibles');
reset role;
select pg_temp.connecter('c6800000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select is_empty($$ select 1 from public.partner_attributions $$, 'artisan : aucune attribution visible');
select is_empty($$ select 1 from public.partner_commissions $$, 'artisan : aucune commission visible');
reset role;

select * from finish();
rollback;
