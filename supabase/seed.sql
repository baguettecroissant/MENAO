-- Données FICTIVES de développement local (jamais de données réelles, jamais appliqué en production).
-- Comptes : particulier, support, admin, artisan (en onboarding), artisan (dossier envoyé),
-- particulier réservé au test de réinitialisation du mot de passe, artisans visibles (recherche).
-- Mot de passe commun des comptes : « menao-local-dev-only » (local uniquement).

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('menao-local-dev-only', extensions.gen_salt('bf')), now(),
  jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', u.role),
  jsonb_build_object(
    'first_name', u.first_name, 'last_name', u.last_name, 'siret', u.siret,
    'legal', jsonb_build_object(
      'cgu', '2026-10-09-brouillon', 'confidentialite', '2026-10-09-brouillon', 'cgv_artisan', '2026-10-09-brouillon'
    )
  ),
  now(), now(), '', '', '', '', '', '', '', ''
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'particulier@example.test', 'particulier', 'Camille', 'Exemple', null),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'support@example.test', 'support', 'Sacha', 'Support', null),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 'admin@example.test', 'admin', 'Alex', 'Admin', null),
  -- Artisan en cours d'onboarding (SIRET fictif, inexistant dans Sirene (vérifié : 404)).
  ('a0000000-0000-4000-8000-000000000004'::uuid, 'artisan@example.test', 'artisan_en_attente', 'Dominique', 'Artisan', '00000003400017'),
  -- Artisan dont le dossier complet attend la validation d'un admin.
  ('a0000000-0000-4000-8000-000000000005'::uuid, 'dossier@example.test', 'artisan_en_attente', 'Claude', 'Dossier', '00000006700017'),
  -- Artisan validé dont la décennale expire bientôt (renouvellement, F-51).
  ('a0000000-0000-4000-8000-000000000007'::uuid, 'valide@example.test', 'artisan', 'Lou', 'Valide', null),
  -- Second admin, réservé au test e2e du renouvellement.
  ('a0000000-0000-4000-8000-000000000008'::uuid, 'admin2@example.test', 'admin', 'Sam', 'Admin', null),
  -- Troisième admin, réservé au test e2e du suivi des demandes et des chantiers (ADR 0046).
  ('a0000000-0000-4000-8000-000000000013'::uuid, 'admin3@example.test', 'admin', 'Charlie', 'Admin', null),
  -- Artisan validé sans abonnement (test e2e de l'abonnement, F-15).
  ('a0000000-0000-4000-8000-000000000009'::uuid, 'abonnement@example.test', 'artisan', 'Alix', 'Abonne', null),
  -- Artisan validé et abonné, compte Stripe Connect à finaliser (test e2e de la visibilité).
  ('a0000000-0000-4000-8000-000000000010'::uuid, 'paiement@example.test', 'artisan', 'Eden', 'Paiement', null),
  -- Artisans visibles (validés, en essai, paiements actifs) : résultats de recherche (F-09).
  ('a0000000-0000-4000-8000-000000000011'::uuid, 'plombier-nice@example.test', 'artisan', 'Noé', 'Exemple', null),
  ('a0000000-0000-4000-8000-000000000012'::uuid, 'plombier-dispo@example.test', 'artisan', 'Inès', 'Exemple', null),
  -- Artisan validé inscrit avant la charte qualité, réservé au test e2e de sa signature (ADR 0109).
  ('a0000000-0000-4000-8000-000000000014'::uuid, 'charte@example.test', 'artisan', 'Maxime', 'Exemple', null),
  -- Compte réservé au test e2e « mot de passe oublié ».
  ('a0000000-0000-4000-8000-000000000006'::uuid, 'motdepasse@example.test', 'particulier', 'Morgan', 'Exemple', null)
) as u (id, email, role, first_name, last_name, siret);

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  now(), now(), now()
from auth.users as u
where u.email like '%@example.test';

-- Dossier complet envoyé en vérification (SIRET inexistant dans Sirene, documents fictifs sans fichier).
update public.artisans set
  status = 'en_verification', submitted_at = now(),
  sirene_checked_at = now(), sirene_active = true, sirene_partial = false,
  raison_sociale = 'PEINTURE DOSSIER EXEMPLE', forme_juridique_code = '5499', ape_code = '43.34Z', ape_eligible = true,
  adresse_ligne = '1 RUE DE L''EXEMPLE', adresse_code_postal = '06000', adresse_commune = 'NICE', adresse_code_insee = '06088',
  assujetti_tva = true, experience_years = 12, zone_mode = 'communes',
  presentation = 'Peintre en bâtiment depuis douze ans à Nice : peinture intérieure et extérieure, enduits, finitions soignées.'
where user_id = 'a0000000-0000-4000-8000-000000000005';

insert into public.artisan_trades (artisan_id, trade_code)
  select id, 'peintre' from public.artisans where user_id = 'a0000000-0000-4000-8000-000000000005';
insert into public.artisan_zones (artisan_id, code_insee, nom)
  select id, z.code, z.nom from public.artisans, (values ('06088', 'Nice'), ('06004', 'Antibes')) as z (code, nom)
  where user_id = 'a0000000-0000-4000-8000-000000000005';
insert into public.certifications (artisan_id, type, numero, date_fin)
  select id, 'qualibat', 'Q-00000', current_date + 400 from public.artisans where user_id = 'a0000000-0000-4000-8000-000000000005';
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_emission, date_fin, assureur, numero, couverture)
select a.id, d.type::public.document_type, a.id || '/seed-' || d.type || '.pdf', 'application/pdf', 1000, d.emission, d.fin, d.assureur, d.numero, d.couverture
from public.artisans a,
  (values ('kbis', current_date - 20, null::date, null, null, null),
          ('decennale', null, current_date + 300, 'Assurances Exemple', 'DEC-0000', 'France métropolitaine'),
          ('rc_pro', null, current_date + 300, 'Assurances Exemple', 'RC-0000', null),
          ('identite', null, null, null, null, null),
          ('urssaf', current_date - 15, null, null, 'URSSAF-0000', null)) as d (type, emission, fin, assureur, numero, couverture)
where a.user_id = 'a0000000-0000-4000-8000-000000000005';
update public.profiles set avatar_path = 'a0000000-0000-4000-8000-000000000005/seed.jpg'
where user_id = 'a0000000-0000-4000-8000-000000000005';

-- Artisan validé (rôle « artisan » : fiche créée ici), décennale à renouveler dans 10 jours.
insert into public.artisans (user_id, status, siret, raison_sociale, sirene_checked_at, sirene_active, ape_code, ape_eligible,
  assujetti_tva, experience_years, zone_mode, presentation, submitted_at)
values ('a0000000-0000-4000-8000-000000000007', 'valide', '00000007500010', 'VALIDE EXEMPLE', now(), true, '43.21A', true,
  true, 9, 'communes', 'Électricien validé du jeu de données de développement, interventions à Nice et alentours.', now());
insert into public.artisan_trades (artisan_id, trade_code)
  select id, 'electricien' from public.artisans where user_id = 'a0000000-0000-4000-8000-000000000007';
insert into public.artisan_zones (artisan_id, code_insee, nom)
  select id, '06088', 'Nice' from public.artisans where user_id = 'a0000000-0000-4000-8000-000000000007';
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_emission, date_fin,
  assureur, numero, couverture, status, verified_at)
select a.id, d.type::public.document_type, a.id || '/seed-' || d.type || '.pdf', 'application/pdf', 1000, d.emission, d.fin,
  d.assureur, d.numero, d.couverture, 'valide', now()
from public.artisans a,
  (values ('kbis', current_date - 40, null::date, null, null, null),
          ('decennale', null, current_date + 10, 'Assurances Exemple', 'DEC-1111', 'France métropolitaine'),
          ('rc_pro', null, current_date + 300, 'Assurances Exemple', 'RC-1111', null),
          ('identite', null, null, null, null, null),
          ('urssaf', current_date - 40, null, null, 'URSSAF-1111', null)) as d (type, emission, fin, assureur, numero, couverture)
where a.user_id = 'a0000000-0000-4000-8000-000000000007';

-- Artisan validé sans abonnement (identifiant de fiche fixe, utilisé par le test e2e du webhook).
insert into public.artisans (id, user_id, status, raison_sociale, sirene_checked_at, sirene_active, assujetti_tva, zone_mode, submitted_at)
values ('b0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000009', 'valide', 'ABONNEMENT EXEMPLE',
  now(), true, true, 'communes', now());

-- Artisan validé, en période d'essai, compte Connect créé mais pas encore actif.
insert into public.artisans (id, user_id, status, raison_sociale, sirene_checked_at, sirene_active, assujetti_tva, zone_mode,
  submitted_at, stripe_customer_id, stripe_account_id)
values ('b0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000010', 'valide', 'PAIEMENT EXEMPLE',
  now(), true, true, 'communes', now(), 'cus_seed_paiement', 'acct_seed_paiement');
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status, trial_end)
values ('b0000000-0000-4000-8000-000000000010', 'base', 'cus_seed_paiement', 'sub_seed_paiement', 'trialing', now() + interval '90 days');

-- Artisans visibles pour la recherche (F-09) : plombier dans un rayon de 25 km autour de Nice,
-- disponible tout de suite ; plombier à Nice et Antibes, disponible dans deux semaines.
insert into public.artisans (id, user_id, status, raison_sociale, nom_commercial, sirene_checked_at, sirene_active,
  assujetti_tva, experience_years, zone_mode, base_label, base_code_insee, base_location, radius_km, presentation,
  submitted_at, stripe_customer_id, stripe_account_id, connect_charges_enabled, connect_payouts_enabled,
  connect_details_submitted, available_from)
values
  ('b0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000011', 'valide', 'PLOMBERIE NICE EXEMPLE',
   'Noé Plomberie', now(), true, true, 14, 'rayon', '1 Rue de l''Exemple 06000 Nice', '06088',
   'SRID=4326;POINT(7.26 43.70)', 25,
   'Plombier chauffagiste depuis quatorze ans : recherche de fuite, salles de bain, chauffe-eau. Intervention rapide sur Nice et alentours.',
   now(), 'cus_seed_nice', 'acct_seed_nice', true, true, true, null),
  ('b0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000012', 'valide', 'PLOMBERIE DISPO EXEMPLE',
   null, now(), true, true, 4, 'communes', null, null, null, null,
   'Plombière à Nice et Antibes : sanitaires et petites réparations.',
   now(), 'cus_seed_dispo', 'acct_seed_dispo', true, true, true, current_date + 14);
-- Identité de l'entreprise (SIRET inexistant dans Sirene) : mentions obligatoires du devis (F-20).
update public.artisans set
  siret = case id when 'b0000000-0000-4000-8000-000000000011' then '00000110000015' else '00000110100013' end,
  forme_juridique_code = '5499', adresse_ligne = '1 RUE DE L''EXEMPLE', adresse_code_postal = '06000',
  adresse_commune = 'NICE', adresse_code_insee = '06088'
where id in ('b0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000012');
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status, trial_end) values
  ('b0000000-0000-4000-8000-000000000011', 'base', 'cus_seed_nice', 'sub_seed_nice', 'trialing', now() + interval '90 days'),
  ('b0000000-0000-4000-8000-000000000012', 'base', 'cus_seed_dispo', 'sub_seed_dispo', 'trialing', now() + interval '90 days');
insert into public.artisan_trades (artisan_id, trade_code) values
  ('b0000000-0000-4000-8000-000000000011', 'plombier'), ('b0000000-0000-4000-8000-000000000011', 'chauffagiste'),
  ('b0000000-0000-4000-8000-000000000012', 'plombier');
insert into public.artisan_work_types (artisan_id, work_type_code) values
  ('b0000000-0000-4000-8000-000000000011', 'recherche-fuite'), ('b0000000-0000-4000-8000-000000000011', 'sanitaires'),
  ('b0000000-0000-4000-8000-000000000011', 'chauffe-eau'), ('b0000000-0000-4000-8000-000000000012', 'sanitaires');
insert into public.artisan_zones (artisan_id, code_insee, nom) values
  ('b0000000-0000-4000-8000-000000000012', '06088', 'Nice'), ('b0000000-0000-4000-8000-000000000012', '06004', 'Antibes');
insert into public.certifications (artisan_id, type, numero, date_fin, verified_at) values
  ('b0000000-0000-4000-8000-000000000011', 'qualibat', 'Q-11111', current_date + 400, now());
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_emission, date_fin,
  assureur, numero, couverture, status, verified_at)
select a.id, d.type::public.document_type, a.id || '/seed-' || d.type || '.pdf', 'application/pdf', 1000, d.emission, d.fin,
  d.assureur, d.numero, d.couverture, 'valide', now()
from public.artisans a,
  (values ('kbis', current_date - 30, null::date, null, null, null),
          ('decennale', null, current_date + 250, 'Assurances Exemple', 'DEC-2222', 'France métropolitaine'),
          ('rc_pro', null, current_date + 250, 'Assurances Exemple', 'RC-2222', null),
          ('identite', null, null, null, null, null),
          ('urssaf', current_date - 30, null, null, 'URSSAF-2222', null)) as d (type, emission, fin, assureur, numero, couverture)
where a.id in ('b0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000012');

-- Artisan validé sans charte signée : l'espace pro lui demande de la signer (ADR 0109).
insert into public.artisans (id, user_id, status, raison_sociale, sirene_checked_at, sirene_active, assujetti_tva, zone_mode, submitted_at)
values ('b0000000-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000014', 'valide', 'CHARTE EXEMPLE',
  now(), true, true, 'communes', now());

-- Charte qualité (ADR 0104) et engagement (ADR 0117) signés par les autres artisans du jeu de données : ils ouvrent leur
-- espace pro sans passer par la signature.
insert into public.artisan_charter_acceptances (artisan_id, version, rules_count, signer_name, company, siret, signature_path, engagement_version)
select a.id, 'V5', 25, 'Signataire Exemple', coalesce(a.raison_sociale, 'ENTREPRISE EXEMPLE'),
  coalesce(a.siret, '00000001800010'), 'M 10 10 L 200 80 L 400 40', 'B1'
from public.artisans a
where a.id <> 'b0000000-0000-4000-8000-000000000014';
