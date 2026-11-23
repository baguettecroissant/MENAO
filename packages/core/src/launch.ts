/**
 * Ouverture progressive de MENAO (F-188, ADR 0387). Décision des dirigeants du 23 novembre 2026 :
 * le site public ouvre (référencement, découverte par le public et les futurs collaborateurs),
 * mais les demandes de devis des particuliers et tous les paiements Stripe restent fermés jusqu'au
 * lancement. Chaque interrupteur s'ouvre en passant sa valeur à `true`, dans une seule PR.
 */

/** Site public ouvert : plus de page d'attente, indexation en production. */
export const SITE_OPEN = true;

/** Demandes de devis des particuliers (recherche d'artisans, demande préparée, widget). */
export const REQUESTS_OPEN = false;

/**
 * Paiements Stripe : abonnement des artisans, compte de paiement (Connect), acomptes et soldes des
 * particuliers, recharges de minutes, espace de facturation.
 */
export const PAYMENTS_OPEN = false;
