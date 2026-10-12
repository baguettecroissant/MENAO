-- F-14 étape 6 — ce que Stripe attend encore pour activer les paiements de l'artisan : champs à
-- fournir (en retard ou demandés), champs en cours de vérification, raison de la désactivation
-- et date limite. Copiés depuis le compte Stripe (webhook account.updated, retour de Stripe) ;
-- la page « Paiements » les présente en rubriques lisibles (packages/core/src/connect.ts).
-- Écrits par le serveur uniquement : aucun droit de modification pour l'artisan.
alter table public.artisans
  add column connect_requirements_due text[] not null default '{}',
  add column connect_requirements_pending text[] not null default '{}',
  add column connect_disabled_reason text check (char_length(connect_disabled_reason) <= 100),
  add column connect_requirements_deadline timestamptz;
