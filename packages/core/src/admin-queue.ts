/**
 * File « À traiter » du back-office (ADR 0133) : une seule liste triée par urgence, au lieu de
 * cartes de même poids dans un ordre fixe. Chaque élément porte son pôle (filtres de la vue
 * d'ensemble) et, s'il en a une, son échéance.
 *
 * - Urgent : litiges, tickets dont le délai de réponse est dépassé, demandes qui expirent sous
 *   12 h, notifications Stripe ou DocuSeal en échec.
 * - Important : demandes de suppression de compte (délai d'un mois), assurances qui expirent sous
 *   7 jours, paiements échoués, abonnements impayés, nouveaux artisans à accompagner (ADR 0160).
 * - À faire : dossiers à vérifier, contrôles aléatoires du mois, documents renouvelés.
 */

export const ADMIN_QUEUE_KINDS = [
  "litiges",
  "tickets_retard",
  "demandes_expirent",
  "notifications",
  "suppressions",
  "assurances",
  "paiements_echoues",
  "impayes",
  "accompagnements",
  "dossiers",
  "controles",
  "renouvellements",
] as const;
export type AdminQueueKind = (typeof ADMIN_QUEUE_KINDS)[number];

export const ADMIN_QUEUE_SEVERITIES = ["urgent", "important", "a_faire"] as const;
export type AdminQueueSeverity = (typeof ADMIN_QUEUE_SEVERITIES)[number];

export const ADMIN_POLES = ["verification", "support", "activite", "argent", "technique"] as const;
export type AdminPole = (typeof ADMIN_POLES)[number];

const RULES: Record<AdminQueueKind, { severity: AdminQueueSeverity; pole: AdminPole }> = {
  litiges: { severity: "urgent", pole: "support" },
  tickets_retard: { severity: "urgent", pole: "support" },
  demandes_expirent: { severity: "urgent", pole: "activite" },
  notifications: { severity: "urgent", pole: "technique" },
  suppressions: { severity: "important", pole: "support" },
  assurances: { severity: "important", pole: "verification" },
  paiements_echoues: { severity: "important", pole: "argent" },
  impayes: { severity: "important", pole: "argent" },
  accompagnements: { severity: "important", pole: "activite" },
  dossiers: { severity: "a_faire", pole: "verification" },
  controles: { severity: "a_faire", pole: "verification" },
  renouvellements: { severity: "a_faire", pole: "verification" },
};

export type AdminQueueItem = {
  kind: AdminQueueKind;
  count: number;
  severity: AdminQueueSeverity;
  pole: AdminPole;
  /** Échéance la plus proche (ISO), quand il y en a une. */
  deadline: string | null;
};

/**
 * Éléments non vides, triés : niveau d'urgence, puis échéance la plus proche (les éléments sans
 * échéance après), puis l'ordre de ADMIN_QUEUE_KINDS.
 */
export function adminQueue(
  counts: Partial<Record<AdminQueueKind, number>>,
  deadlines: Partial<Record<AdminQueueKind, string | null>> = {},
): AdminQueueItem[] {
  const severityRank = (s: AdminQueueSeverity) => ADMIN_QUEUE_SEVERITIES.indexOf(s);
  const time = (d: string | null) => (d ? Date.parse(d) : Number.POSITIVE_INFINITY);
  return ADMIN_QUEUE_KINDS.filter((kind) => (counts[kind] ?? 0) > 0)
    .map((kind) => ({
      kind,
      count: counts[kind] ?? 0,
      ...RULES[kind],
      deadline: deadlines[kind] ?? null,
    }))
    .sort(
      (a, b) =>
        severityRank(a.severity) - severityRank(b.severity) ||
        time(a.deadline) - time(b.deadline) ||
        ADMIN_QUEUE_KINDS.indexOf(a.kind) - ADMIN_QUEUE_KINDS.indexOf(b.kind),
    );
}

/** Nombre d'éléments par pôle (filtres), dans l'ordre de ADMIN_POLES, pôles vides exclus. */
export function adminQueuePoles(
  items: readonly AdminQueueItem[],
): { pole: AdminPole; count: number }[] {
  return ADMIN_POLES.map((pole) => ({
    pole,
    count: items.filter((item) => item.pole === pole).length,
  })).filter((p) => p.count > 0);
}
