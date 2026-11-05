import type { ClientDraft } from "@menao/core";

/**
 * Demande préparée par la bulle de l'assistant (ADR 0220), passée à la page de recherche : la
 * navigation se fait sans recharger la page, la demande reste donc en mémoire (ni stockage du
 * navigateur, ni adresse de la page). Elle n'est reprise qu'une fois.
 */
let pending: ClientDraft | null = null;

export function handOffDraft(draft: ClientDraft): void {
  pending = draft;
}

/** Lecture sans effet (initialisation de l'état) ; `clearDraft` la retire ensuite. */
export function peekDraft(): ClientDraft | null {
  return pending;
}

export function clearDraft(): void {
  pending = null;
}
