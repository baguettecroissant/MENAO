/**
 * Machine à états du chantier (spec §9), protégée en base par `transition_chantier()` et la table
 * `chantier_transitions` (même contenu que CHANTIER_TRANSITIONS). ADR 0016 : le refus et
 * l'expiration restent des statuts de la demande ; le chantier naît quand l'artisan fixe le
 * rendez-vous.
 */

export const CHANTIER_STATUSES = [
  "demande_envoyee",
  "rdv_planifie",
  "devis_envoye",
  "devis_en_revision",
  "devis_refuse",
  "devis_signe",
  "acompte_paye",
  "planifie",
  "en_cours",
  "travaux_termines",
  "reserves_a_lever",
  "receptionne",
  "cloture",
  "en_litige",
  "annule",
] as const;
export type ChantierStatus = (typeof CHANTIER_STATUSES)[number];

export const CHANTIER_EVENTS = [
  "rdv_fixe",
  "devis_envoye",
  "revision_demandee",
  "devis_refuse",
  "devis_signe",
  "acompte_paye",
  "date_confirmee",
  "demarrage",
  "fin_declaree",
  "pv_sans_reserves",
  "pv_avec_reserves",
  "reserves_levees",
  "solde_paye",
  "litige_ouvert",
  "litige_resolu",
  "litige_annule",
  "annulation",
] as const;
export type ChantierEvent = (typeof CHANTIER_EVENTS)[number];

/** États où un litige peut être ouvert (« tout état actif »). */
export const ACTIVE_CHANTIER_STATUSES = [
  "rdv_planifie",
  "devis_envoye",
  "devis_en_revision",
  "devis_signe",
  "acompte_paye",
  "planifie",
  "en_cours",
  "travaux_termines",
  "reserves_a_lever",
  "receptionne",
] as const satisfies readonly ChantierStatus[];

/** Annulation possible avant le paiement de l'acompte. */
const BEFORE_DEPOSIT = [
  "demande_envoyee",
  "rdv_planifie",
  "devis_envoye",
  "devis_en_revision",
  "devis_signe",
] as const satisfies readonly ChantierStatus[];

/**
 * Annulation par l'artisan (F-18) : tant qu'aucun devis n'est signé. Après signature, l'annulation
 * relève du contrat signé. TODO(legal) : règles d'annulation après signature du devis.
 */
export const ARTISAN_CANCELLABLE_STATUSES = [
  "rdv_planifie",
  "devis_envoye",
  "devis_en_revision",
] as const satisfies readonly ChantierStatus[];

/** (état de départ, événement, état d'arrivée). « litige_resolu » ramène à l'état d'avant le litige. */
export const CHANTIER_TRANSITIONS: readonly (readonly [
  ChantierStatus,
  ChantierEvent,
  ChantierStatus,
])[] = [
  ["demande_envoyee", "rdv_fixe", "rdv_planifie"],
  ["rdv_planifie", "devis_envoye", "devis_envoye"],
  ["devis_envoye", "devis_refuse", "devis_refuse"],
  ["devis_envoye", "revision_demandee", "devis_en_revision"],
  ["devis_en_revision", "devis_envoye", "devis_envoye"],
  ["devis_envoye", "devis_signe", "devis_signe"],
  ["devis_signe", "acompte_paye", "acompte_paye"],
  ["acompte_paye", "date_confirmee", "planifie"],
  ["planifie", "demarrage", "en_cours"],
  ["en_cours", "fin_declaree", "travaux_termines"],
  ["travaux_termines", "pv_sans_reserves", "receptionne"],
  ["travaux_termines", "pv_avec_reserves", "reserves_a_lever"],
  ["reserves_a_lever", "reserves_levees", "receptionne"],
  ["receptionne", "solde_paye", "cloture"],
  ...BEFORE_DEPOSIT.map((s) => [s, "annulation", "annule"] as const),
  ...ACTIVE_CHANTIER_STATUSES.map((s) => [s, "litige_ouvert", "en_litige"] as const),
  ["en_litige", "litige_annule", "annule"],
];

/**
 * État suivant, ou null si la transition est interdite. Pour « litige_resolu », `beforeDispute`
 * est l'état du chantier à l'ouverture du litige.
 */
export function nextChantierStatus(
  from: ChantierStatus,
  event: ChantierEvent,
  beforeDispute?: ChantierStatus | null,
): ChantierStatus | null {
  if (event === "litige_resolu") {
    const active: readonly ChantierStatus[] = ACTIVE_CHANTIER_STATUSES;
    return from === "en_litige" && beforeDispute && active.includes(beforeDispute)
      ? beforeDispute
      : null;
  }
  return CHANTIER_TRANSITIONS.find(([f, e]) => f === from && e === event)?.[2] ?? null;
}

export function canTransition(from: ChantierStatus, event: ChantierEvent): boolean {
  return nextChantierStatus(from, event) !== null;
}

/** F-16 « En attente de devis » : rendez-vous fixé ou modification demandée. */
const AWAITING_QUOTE: readonly ChantierStatus[] = ["rdv_planifie", "devis_en_revision"];

/** Nombre de clients distincts qui attendent un devis de l'artisan. */
export function clientsAwaitingQuote(
  chantiers: readonly { status: ChantierStatus; particulierId: string }[],
): number {
  return new Set(
    chantiers.filter((c) => AWAITING_QUOTE.includes(c.status)).map((c) => c.particulierId),
  ).size;
}
