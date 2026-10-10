/**
 * « Signaler un problème lié au chantier » (F-42) : catégorie, description, photos ; ticket pour
 * l'équipe MENAO. Un chantier actif passe en litige (étapes suspendues) jusqu'à la décision de
 * l'équipe : reprise (retour à l'état d'avant le litige) ou annulation. Mêmes règles en base
 * (migration litiges). ADR 0032.
 */
import { ACTIVE_CHANTIER_STATUSES, type ChantierStatus } from "./chantier-state";

export const DISPUTE_CATEGORIES = [
  "retard",
  "malfacon",
  "comportement",
  "paiement",
  "autre",
] as const;
export type DisputeCategory = (typeof DISPUTE_CATEGORIES)[number];
export const DISPUTE_OUTCOMES = ["reprise", "annulation"] as const;
export type DisputeOutcome = (typeof DISPUTE_OUTCOMES)[number];

export const DISPUTE_DESCRIPTION_LIMITS = { min: 20, max: 2000 } as const;
export const TICKET_MESSAGE_MAX_LENGTH = 2000;
/** Photos d'un signalement : 20 au plus. */
export const MAX_TICKET_PHOTOS = 20;

/** Le signalement suspend le chantier (passage en litige) s'il est actif ; sinon ticket seul. */
export function reportSuspendsChantier(status: ChantierStatus): boolean {
  return (ACTIVE_CHANTIER_STATUSES as readonly ChantierStatus[]).includes(status);
}
