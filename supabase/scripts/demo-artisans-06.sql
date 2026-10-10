-- Artisans de DÉMONSTRATION dans les Alpes-Maritimes (06), pour tester la plateforme sur staging.
-- Données FICTIVES : noms inventés, entreprises « (démo) », SIRET inexistants dans Sirene
-- (vérifiés : 404 le 10 octobre 2026), e-mails en .test, documents sans fichier, comptes Stripe
-- fictifs (ces artisans ne peuvent pas encaisser de paiement : le parcours complet se teste avec un
-- vrai compte artisan). Comptes sans mot de passe connu : aucune connexion possible.
-- JAMAIS en production. Rejouable (identifiants fixes). Suppression : demo-artisans-06-cleanup.sql.

begin;

create temporary table demo (
  n int, first_name text, last_name text, raison_sociale text, nom_commercial text, siret text, forme text,
  ape text, tva boolean, experience int, insee text, cp text, ville text, lon double precision,
  lat double precision, rayon int, dispo int, presentation text
) on commit drop;
insert into demo values
    (1, 'Lucas', 'Ferrand', 'AZUR PLOMBERIE DEMO', 'Azur Plomberie (démo)', '00000610600017', '5499', '43.22A', true, 11,
     '06088', '06000', 'Nice', 7.2663, 43.7034, 20, null::int,
     'Plombier chauffagiste à Nice depuis onze ans : recherche de fuite, rénovation de salles de bain, chauffe-eau et chaudières. Devis clair et intervention soignée.'),
    (2, 'Sarah', 'Benali', 'SB PLOMBERIE DEMO', 'SB Plomberie (démo)', '00000611400011', '5499', '43.22A', true, 6,
     '06029', '06400', 'Cannes', 7.0174, 43.5528, 25, 10,
     'Plombière installée à Cannes : sanitaires, remplacement de chauffe-eau et petits dépannages. Je vous explique chaque intervention avant de commencer.'),
    (3, 'Julien', 'Morel', 'MOREL ELEC DEMO', 'Morel Élec (démo)', '00000612200014', '5499', '43.21A', true, 15,
     '06088', '06000', 'Nice', 7.2620, 43.7102, 25, null,
     'Électricien depuis quinze ans sur Nice et sa région : tableaux électriques, mises aux normes et éclairage. Diagnostic offert avant chaque devis.'),
    (4, 'Inès', 'Garnier', 'GARNIER ELECTRICITE DEMO', 'Garnier Électricité (démo)', '00000613000017', '5499', '43.21A', true, 8,
     '06004', '06600', 'Antibes', 7.1251, 43.5808, 20, null,
     'Électricienne à Antibes : bornes de recharge pour véhicules électriques, éclairage intérieur et extérieur, remplacement de tableaux électriques.'),
    (5, 'Thomas', 'Rinaldi', 'RINALDI CLIMAT DEMO', 'Rinaldi Climat (démo)', '00000614800019', '5499', '43.22B', true, 12,
     '06027', '06800', 'Cagnes-sur-Mer', 7.1489, 43.6644, 30, null,
     'Climatisation et pompes à chaleur depuis douze ans entre Cagnes-sur-Mer, Nice et Antibes : installation, mise en service et entretien annuel.'),
    (6, 'Marc', 'Olivier', 'OLIVIER MACONNERIE DEMO', 'Maçonnerie Olivier (démo)', '00000615500014', '5499', '43.99C', true, 20,
     '06069', '06130', 'Grasse', 6.9238, 43.6589, 30, null,
     'Maçon à Grasse depuis vingt ans : gros œuvre, extensions de maison, ouvertures de murs porteurs avec étude de structure. Chantiers propres et suivis.'),
    (7, 'Chloé', 'Fabre', 'FABRE PEINTURE DEMO', 'Fabre Peinture (démo)', '00000616300018', '1000', '43.34Z', false, 9,
     '06088', '06000', 'Nice', 7.2500, 43.7000, 15, null,
     'Peintre et plaquiste à Nice : peinture intérieure et extérieure, cloisons et faux plafonds. Micro-entreprise en franchise de TVA, finitions soignées.'),
    (8, 'Karim', 'Haddad', 'HADDAD CARRELAGE DEMO', 'Haddad Carrelage (démo)', '00000617100011', '5499', '43.33Z', true, 13,
     '06004', '06600', 'Antibes', 7.1180, 43.5850, 25, null,
     'Carreleur à Antibes depuis treize ans : carrelage de sol, faïence de cuisine et de salle de bain, grands formats et plans de travail carrelés.'),
    (9, 'Paul', 'Vidal', 'VIDAL MENUISERIE DEMO', 'Menuiserie Vidal (démo)', '00000618900013', '5499', '43.32A', true, 17,
     '06083', '06500', 'Menton', 7.4975, 43.7747, 25, null,
     'Menuisier à Menton depuis dix-sept ans : fenêtres et portes sur mesure, rénovation énergétique des menuiseries et agencements intérieurs en bois.'),
    (10, 'Emma', 'Lucchesi', 'LUCCHESI AGENCEMENT DEMO', 'Lucchesi Agencement (démo)', '00000619700016', '5499', '43.32A', true, 7,
     '06030', '06110', 'Le Cannet', 7.0194, 43.5769, 25, 7,
     'Menuisière agenceuse au Cannet : dressings, placards, cuisines et portes intérieures sur mesure, du plan à la pose.');

-- Comptes (profil créé par le déclencheur d'inscription), sans mot de passe connu.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select '00000000-0000-0000-0000-000000000000',
  ('e0600000-0000-4000-8000-' || lpad(d.n::text, 12, '0'))::uuid,
  'authenticated', 'authenticated', 'demo-artisan-' || d.n || '@menao-demo.test',
  extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(),
  jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', 'artisan'),
  jsonb_build_object('first_name', d.first_name, 'last_name', d.last_name),
  now(), now(), '', '', '', '', '', '', '', ''
from demo d
on conflict (id) do nothing;

-- Fiches validées, zone en rayon autour de la commune de base, paiements actifs.
insert into public.artisans (id, user_id, status, siret, raison_sociale, nom_commercial, forme_juridique_code,
  ape_code, ape_eligible, sirene_checked_at, sirene_active, sirene_partial, assujetti_tva, experience_years,
  adresse_ligne, adresse_code_postal, adresse_commune, adresse_code_insee,
  zone_mode, base_label, base_code_insee, base_location, radius_km, presentation, submitted_at,
  stripe_customer_id, stripe_account_id, connect_charges_enabled, connect_payouts_enabled, connect_details_submitted,
  available_from)
select ('e0610000-0000-4000-8000-' || lpad(d.n::text, 12, '0'))::uuid,
  ('e0600000-0000-4000-8000-' || lpad(d.n::text, 12, '0'))::uuid,
  'valide', d.siret, d.raison_sociale, d.nom_commercial, d.forme, d.ape, true, now(), true, false, d.tva, d.experience,
  'RUE DE LA DEMO', d.cp, upper(d.ville), d.insee,
  'rayon', 'Rue de la Démo ' || d.cp || ' ' || d.ville, d.insee,
  extensions.st_setsrid(extensions.st_makepoint(d.lon, d.lat), 4326)::extensions.geography, d.rayon,
  d.presentation, now(),
  'cus_demo_06_' || d.n, 'acct_demo_06_' || d.n, true, true, true,
  case when d.dispo is null then null else current_date + d.dispo end
from demo d
on conflict (id) do nothing;

-- Métiers et prestations.
insert into public.artisan_trades (artisan_id, trade_code)
select ('e0610000-0000-4000-8000-' || lpad(t.n::text, 12, '0'))::uuid, t.code
from (values (1, 'plombier'), (1, 'chauffagiste'), (2, 'plombier'), (3, 'electricien'), (4, 'electricien'),
             (5, 'climaticien'), (5, 'chauffagiste'), (6, 'macon'), (7, 'peintre'), (7, 'plaquiste'),
             (8, 'carreleur'), (9, 'menuisier'), (10, 'menuisier')) as t (n, code)
on conflict do nothing;
insert into public.artisan_work_types (artisan_id, work_type_code)
select ('e0610000-0000-4000-8000-' || lpad(w.n::text, 12, '0'))::uuid, w.code
from (values (1, 'recherche-fuite'), (1, 'sanitaires'), (1, 'chauffe-eau'), (1, 'chaudiere'),
             (2, 'sanitaires'), (2, 'chauffe-eau'),
             (3, 'tableau-electrique'), (3, 'mise-aux-normes-electriques'), (3, 'eclairage'),
             (4, 'borne-recharge'), (4, 'eclairage'), (4, 'tableau-electrique'),
             (5, 'climatisation'), (5, 'pompe-a-chaleur'),
             (6, 'gros-oeuvre'), (6, 'extension'), (6, 'ouverture-mur-porteur'),
             (7, 'peinture-interieure'), (7, 'peinture-exterieure'), (7, 'cloisons'),
             (8, 'carrelage-sol'), (8, 'faience'),
             (9, 'fenetres'), (9, 'portes'), (9, 'agencement'),
             (10, 'agencement'), (10, 'portes')) as w (n, code)
on conflict do nothing;

-- Documents validés (sans fichier), en cours de validité.
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_emission, date_fin,
  assureur, numero, couverture, status, verified_at)
select a.id, d.type::public.document_type, a.id || '/demo-' || d.type || '.pdf', 'application/pdf', 1000,
  d.emission, d.fin, d.assureur, d.numero || right(a.id::text, 2), d.couverture, 'valide', now()
from public.artisans a,
  (values ('kbis', current_date - 30, null::date, null, null, null),
          ('decennale', null, current_date + 300, 'Assurances Démo', 'DEMO-DEC-', 'France métropolitaine'),
          ('rc_pro', null, current_date + 300, 'Assurances Démo', 'DEMO-RC-', null),
          ('identite', null, null, null, null, null)) as d (type, emission, fin, assureur, numero, couverture)
where a.id::text like 'e0610000-%'
  and not exists (select 1 from public.artisan_documents x where x.artisan_id = a.id and x.type::text = d.type);

-- Certifications vérifiées (numéros fictifs).
insert into public.certifications (artisan_id, type, numero, date_fin, verified_at)
select ('e0610000-0000-4000-8000-' || lpad(c.n::text, 12, '0'))::uuid, c.type::public.certification_type,
  'DEMO-' || upper(c.type) || '-' || c.n, current_date + 400, now()
from (values (1, 'qualibat'), (3, 'qualifelec'), (4, 'qualifelec'), (5, 'rge'), (5, 'qualipac'),
             (6, 'qualibat'), (9, 'rge')) as c (n, type)
where not exists (
  select 1 from public.certifications x
  where x.artisan_id = ('e0610000-0000-4000-8000-' || lpad(c.n::text, 12, '0'))::uuid and x.type::text = c.type
);

-- Abonnement en période d'essai (identifiants Stripe fictifs).
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status, trial_end)
select a.id, 'base', a.stripe_customer_id, 'sub_demo_06_' || right(a.id::text, 2), 'trialing', now() + interval '90 days'
from public.artisans a
where a.id::text like 'e0610000-%'
  and not exists (select 1 from public.subscriptions s where s.artisan_id = a.id);

commit;
