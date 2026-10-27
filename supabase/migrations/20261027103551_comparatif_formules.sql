-- Comparatif détaillé des formules de la page Espace Pro (F-15, ADR 0200), d'après la page tarifs
-- de TrustUp Pro montrée par l'utilisateur le 27 octobre 2026 : accroche et points forts de chaque
-- formule, puis un tableau par catégorie. Contenu paramétré en base (spec F-15 : « jamais en dur »),
-- modifiable par l'équipe sans déploiement ; seules les fonctionnalités de Base sont déjà livrées
-- (Premium et Entreprise restent « Bientôt disponible », `ouverte` à faux).

-- ---------------------------------------------------------------------------
-- Formules : accroche, points forts et limites
-- ---------------------------------------------------------------------------
alter table public.plans
  add column accroche text check (char_length(accroche) between 1 and 80);

update public.plans set
  accroche = 'Pour l''artisan qui travaille seul',
  avantages = '["Demandes de chantier vérifiées, sans commission", "Devis, signature et paiements en ligne", "Suivi de chantier, réception et factures", "Dépenses, envoi au comptable et application"]',
  limites = limites || '{"comptes": 1, "metiers": 2, "demandes_mois": 10}'
where code = 'base';

update public.plans set
  accroche = 'Pour l''entreprise qui grandit',
  avantages = '["Tout le contenu de Base", "Jusqu''à 25 demandes par mois, métiers illimités", "Brouillon de devis prêt dès la demande", "Échéancier en plusieurs tranches", "Marge réelle par chantier", "3 comptes et appel de démarrage"]',
  limites = limites || '{"comptes": 3, "metiers": null, "demandes_mois": 25}'
where code = 'premium';

update public.plans set
  accroche = 'Pour plusieurs équipes',
  avantages = '["Tout le contenu de Premium", "Demandes illimitées", "Devis pré-générés selon vos paramètres", "Plusieurs équipes sur un planning unifié", "Jusqu''à 10 comptes et interlocuteur dédié"]',
  limites = limites || '{"comptes": 10, "metiers": null, "demandes_mois": null}'
where code = 'entreprise';

-- ---------------------------------------------------------------------------
-- Lignes du comparatif : une fonctionnalité, sa catégorie, et sa valeur pour chaque formule
-- (clé = code de la formule) : vrai (inclus), faux (non inclus) ou un court texte.
-- ---------------------------------------------------------------------------
create table public.plan_features (
  id uuid primary key default gen_random_uuid(),
  categorie text not null check (char_length(categorie) between 1 and 60),
  libelle text not null check (char_length(libelle) between 1 and 100),
  detail text check (char_length(detail) between 1 and 160),
  valeurs jsonb not null default '{}'::jsonb check (jsonb_typeof(valeurs) = 'object'),
  ordre smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (categorie, libelle)
);

create trigger plan_features_set_updated_at before update on public.plan_features
  for each row execute function app.set_updated_at();

-- Lecture publique (page Espace Pro pré-générée) ; écriture par la clé serveur seulement.
alter table public.plan_features enable row level security;
revoke all on public.plan_features from anon, authenticated;
grant select on public.plan_features to anon, authenticated;
create policy "plan_features : lecture publique" on public.plan_features
  for select to anon, authenticated using (true);

insert into public.plan_features (categorie, libelle, detail, valeurs, ordre) values
  ('Demandes de chantier', 'Demandes de clients vérifiées dans votre zone', null,
   '{"base": true, "premium": true, "entreprise": true}', 10),
  ('Demandes de chantier', 'Demandes reçues par mois', null,
   '{"base": "Jusqu''à 10", "premium": "Jusqu''à 25", "entreprise": "Illimitées"}', 20),
  ('Demandes de chantier', 'Métiers proposés', null,
   '{"base": "2", "premium": "Illimités", "entreprise": "Illimités"}', 30),
  ('Demandes de chantier', 'Demandes directes de vos clients',
   'Depuis votre fiche ou votre carte de visite, la demande n''est envoyée qu''à vous.',
   '{"base": true, "premium": true, "entreprise": true}', 40),
  ('Demandes de chantier', 'Aucune commission sur vos chantiers', null,
   '{"base": true, "premium": true, "entreprise": true}', 50),

  ('Devis et signature', 'Devis et factures illimités', null,
   '{"base": true, "premium": true, "entreprise": true}', 110),
  ('Devis et signature', 'Dictée intelligente du devis', null,
   '{"base": true, "premium": true, "entreprise": true}', 120),
  ('Devis et signature', 'Catalogue de vos prestations', null,
   '{"base": true, "premium": true, "entreprise": true}', 130),
  ('Devis et signature', 'Signature électronique du client', 'Avec un code de vérification.',
   '{"base": true, "premium": true, "entreprise": true}', 140),
  ('Devis et signature', 'Brouillon de devis prêt dès la demande',
   'Préparé à partir de la demande, des photos et de votre catalogue.',
   '{"base": false, "premium": true, "entreprise": true}', 150),
  ('Devis et signature', 'Devis pré-générés selon vos paramètres',
   'Prix, marges et délais de votre entreprise appliqués, à valider.',
   '{"base": false, "premium": false, "entreprise": true}', 160),

  ('Paiements', 'Acompte et solde payés en ligne',
   'Directement sur votre compte, sans passer par MENAO.',
   '{"base": true, "premium": true, "entreprise": true}', 210),
  ('Paiements', 'Relances automatiques du client', 'Devis à signer, paiement en attente.',
   '{"base": true, "premium": true, "entreprise": true}', 220),
  ('Paiements', 'Échéancier en plusieurs tranches', 'Situations de travaux pour les gros chantiers.',
   '{"base": false, "premium": true, "entreprise": true}', 230),

  ('Chantiers et planning', 'Suivi de chantier, photos et messagerie', null,
   '{"base": true, "premium": true, "entreprise": true}', 310),
  ('Chantiers et planning', 'Procès-verbal de réception signé en ligne', null,
   '{"base": true, "premium": true, "entreprise": true}', 320),
  ('Chantiers et planning', 'Agenda synchronisé avec votre téléphone', null,
   '{"base": true, "premium": true, "entreprise": true}', 330),
  ('Chantiers et planning', 'Planning partagé entre vos comptes', null,
   '{"base": false, "premium": true, "entreprise": true}', 340),
  ('Chantiers et planning', 'Plusieurs équipes sur un planning unifié', null,
   '{"base": false, "premium": false, "entreprise": true}', 350),

  ('Gestion', 'Tableau de bord : activité et chiffre d''affaires', null,
   '{"base": true, "premium": true, "entreprise": true}', 410),
  ('Gestion', 'Dépenses : tickets lus automatiquement', null,
   '{"base": true, "premium": true, "entreprise": true}', 420),
  ('Gestion', 'Envoi automatique au comptable', null,
   '{"base": true, "premium": true, "entreprise": true}', 430),
  ('Gestion', 'Marge réelle par chantier', 'Dépenses comparées au montant facturé.',
   '{"base": false, "premium": true, "entreprise": true}', 440),
  ('Gestion', 'Devis et factures fournisseurs rattachés aux chantiers', null,
   '{"base": false, "premium": false, "entreprise": true}', 450),

  ('Visibilité', 'Fiche publique et badge « Assuré et vérifié »', null,
   '{"base": true, "premium": true, "entreprise": true}', 510),
  ('Visibilité', 'Carte de visite avec QR code', null,
   '{"base": true, "premium": true, "entreprise": true}', 520),
  ('Visibilité', 'Avis clients vérifiés', null,
   '{"base": true, "premium": true, "entreprise": true}', 530),
  ('Visibilité', 'Demande d''avis Google après la réception', null,
   '{"base": false, "premium": true, "entreprise": true}', 540),

  ('Équipe et accompagnement', 'Comptes utilisateurs', null,
   '{"base": "1", "premium": "3", "entreprise": "10"}', 610),
  ('Équipe et accompagnement', 'Application iPhone et Android', null,
   '{"base": true, "premium": true, "entreprise": true}', 620),
  ('Équipe et accompagnement', 'Aide de l''équipe MENAO', 'Par message, depuis votre espace.',
   '{"base": true, "premium": true, "entreprise": true}', 630),
  ('Équipe et accompagnement', 'Appel de démarrage', null,
   '{"base": false, "premium": true, "entreprise": true}', 640),
  ('Équipe et accompagnement', 'Interlocuteur dédié', null,
   '{"base": false, "premium": false, "entreprise": true}', 650);
