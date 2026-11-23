import { PAYMENTS_OPEN, REQUESTS_OPEN } from "@menao/core";

/**
 * Ouverture progressive (F-188, ADR 0387) : demandes de devis et paiements fermés jusqu'au
 * lancement. Les tests de bout en bout les rouvrent (NEXT_PUBLIC_MENAO_FULL_ACCESS=true au build,
 * CI uniquement).
 */
const fullAccess = process.env.NEXT_PUBLIC_MENAO_FULL_ACCESS === "true";

export const requestsOpen = REQUESTS_OPEN || fullAccess;
export const paymentsOpen = PAYMENTS_OPEN || fullAccess;
