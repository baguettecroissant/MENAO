/** Vue d'ensemble du back-office (F-58, ADR 0045) : regroupements et taux des chiffres clés. */
import type { ChantierStatus } from "./chantier-state";

/** Étapes du parcours, pour compter les chantiers sans détailler chacun des quinze statuts. */
export const CHANTIER_STAGES = [
  "demande",
  "devis",
  "travaux",
  "reception",
  "termine",
  "litige",
  "abandonne",
] as const;
export type ChantierStage = (typeof CHANTIER_STAGES)[number];

const STAGE_OF: Record<ChantierStatus, ChantierStage> = {
  demande_envoyee: "demande",
  rdv_planifie: "demande",
  devis_envoye: "devis",
  devis_en_revision: "devis",
  devis_signe: "travaux",
  acompte_paye: "travaux",
  planifie: "travaux",
  en_cours: "travaux",
  travaux_termines: "reception",
  reserves_a_lever: "reception",
  receptionne: "reception",
  cloture: "termine",
  en_litige: "litige",
  devis_refuse: "abandonne",
  annule: "abandonne",
};

export function chantierStage(status: ChantierStatus): ChantierStage {
  return STAGE_OF[status];
}

/** Chantiers par étape, à partir des compteurs par statut de la base (statuts inconnus ignorés). */
export function chantiersByStage(byStatus: Record<string, number>): Record<ChantierStage, number> {
  const counts = Object.fromEntries(CHANTIER_STAGES.map((s) => [s, 0])) as Record<
    ChantierStage,
    number
  >;
  for (const [status, n] of Object.entries(byStatus)) {
    const stage = STAGE_OF[status as ChantierStatus];
    if (stage) counts[stage] += n;
  }
  return counts;
}

/** Pourcentage arrondi à l'unité, ou null sans dénominateur. */
export function percent(part: number, total: number): number | null {
  return total > 0 ? Math.round((part / total) * 100) : null;
}

/**
 * Demandes arrivées à leur terme (acceptées, refusées ou expirées sans réponse) : part des
 * demandes qui ont reçu une réponse, et part des demandes acceptées.
 */
export function requestRates(c: { accepted: number; refused: number; expired: number }): {
  response: number | null;
  acceptance: number | null;
} {
  const total = c.accepted + c.refused + c.expired;
  return {
    response: percent(c.accepted + c.refused, total),
    acceptance: percent(c.accepted, total),
  };
}

/** Part des recherches qui ont abouti à l'envoi d'une demande. */
export function searchConversion(c: { searches: number; sent: number }): number | null {
  return percent(c.sent, c.searches);
}
