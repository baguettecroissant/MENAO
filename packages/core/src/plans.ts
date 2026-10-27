/**
 * Formules d'abonnement : paiement à l'année, garantie de l'engagement et comparatif détaillé de
 * la page Espace Pro (F-15, ADR 0200). Contenu du comparatif paramétré en base (`plan_features`).
 */

/** Engagement à l'année : 12 mois, payés d'avance, à partir du premier paiement (après l'essai). */
export const ENGAGEMENT_MONTHS = 12;
/** 2 mois offerts sur l'année payée d'avance (décision de l'utilisateur du 27 octobre 2026). */
export const ANNUAL_FREE_MONTHS = 2;

/**
 * Garantie de l'engagement : moins de 4 demandes reçues 2 mois complets de suite, et l'artisan
 * part sans frais. Les demandes qu'il apporte lui-même (sa fiche, « Redemander un devis ») ne
 * comptent pas (ADR 0198).
 */
export const ENGAGEMENT_GUARANTEE = { minRequests: 4, consecutiveMonths: 2 } as const;

/** Prix de l'année payée d'avance : 10 mois sur 12. */
export function annualPriceCents(monthlyCents: number): number {
  return monthlyCents * (ENGAGEMENT_MONTHS - ANNUAL_FREE_MONTHS);
}

/** Équivalent mensuel d'un prix annuel, arrondi au centime (affichage). */
export function monthlyEquivalentCents(annualCents: number): number {
  return Math.round(annualCents / ENGAGEMENT_MONTHS);
}

/**
 * Sortie sans frais d'un engagement : activité cessée, ou les derniers mois complets (du plus
 * ancien au plus récent) sous le minimum de demandes, autant de fois de suite que la garantie.
 * Il suffit que la série se produise une fois pendant l'engagement.
 */
export function engagementExitAllowed(input: {
  monthlyRequests: readonly number[];
  ceasedActivity: boolean;
}): boolean {
  if (input.ceasedActivity) return true;
  let run = 0;
  for (const count of input.monthlyRequests) {
    run = count < ENGAGEMENT_GUARANTEE.minRequests ? run + 1 : 0;
    if (run >= ENGAGEMENT_GUARANTEE.consecutiveMonths) return true;
  }
  return false;
}

export type PlanFeatureCell =
  { kind: "inclus" } | { kind: "absent" } | { kind: "texte"; text: string };

/** Valeur d'une formule dans le comparatif (jsonb) : vrai, faux ou absent, ou un court texte. */
export function planFeatureCell(value: unknown): PlanFeatureCell {
  if (value === true) return { kind: "inclus" };
  if (typeof value === "number") return { kind: "texte", text: String(value) };
  if (typeof value === "string" && value.trim()) return { kind: "texte", text: value.trim() };
  return { kind: "absent" };
}

export type PlanFeatureRow = {
  categorie: string;
  libelle: string;
  detail: string | null;
  ordre: number;
  valeurs: unknown;
};

export type PlanComparison = {
  categorie: string;
  items: { libelle: string; detail: string | null; cells: PlanFeatureCell[] }[];
}[];

/**
 * Comparatif par catégorie, dans l'ordre des lignes (`ordre`), une cellule par formule dans
 * l'ordre des formules affichées.
 */
export function planComparison(
  rows: readonly PlanFeatureRow[],
  planCodes: readonly string[],
): PlanComparison {
  const groups: PlanComparison = [];
  for (const row of [...rows].sort((a, b) => a.ordre - b.ordre)) {
    const values =
      row.valeurs && typeof row.valeurs === "object" && !Array.isArray(row.valeurs)
        ? (row.valeurs as Record<string, unknown>)
        : {};
    const item = {
      libelle: row.libelle,
      detail: row.detail,
      cells: planCodes.map((code) => planFeatureCell(values[code])),
    };
    const group = groups.find((g) => g.categorie === row.categorie);
    if (group) group.items.push(item);
    else groups.push({ categorie: row.categorie, items: [item] });
  }
  return groups;
}
