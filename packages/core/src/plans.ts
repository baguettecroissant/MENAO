/**
 * Formules d'abonnement : paiement au mois ou à l'année, engagement d'un an (ADR 0383) et
 * comparatif détaillé de la page Espace Pro (F-15, ADR 0200). Contenu du comparatif paramétré en base (`plan_features`).
 * Fichier autonome (aucun import) : il est aussi importé par l'Edge Function billing-checkout.
 */

/** Engagement d'un an pour tous (ADR 0383), à partir du premier paiement, après l'essai. */
export const ENGAGEMENT_MONTHS = 12;
/** 2 mois offerts sur l'année payée d'avance (décision de l'utilisateur du 27 octobre 2026). */
export const ANNUAL_FREE_MONTHS = 2;

/** Paiement de l'abonnement d'un an : chaque mois, ou à l'année payée d'avance. */
export const BILLING_PERIODS = ["mensuel", "annuel"] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

/**
 * Texte affiché sur la page de paiement Stripe, près du bouton (ADR 0200, ADR 0383) : l'engagement
 * d'un an et son point de départ. La date du premier paiement n'est pas connue à ce moment : l'essai
 * démarre à la mise en ligne de la fiche. Montants déjà formatés.
 */
export function checkoutNotice(
  period: BillingPeriod,
  values: { annualPrice: string; monthlyPrice: string },
): string {
  const start =
    "Engagement d'un an à partir du premier paiement, à la fin des 2 mois d'essai, qui démarrent à la mise en ligne de votre fiche";
  const end = "Rien n'est prélevé avant, et vous pouvez renoncer sans frais pendant l'essai.";
  if (period === "mensuel") {
    return `${start} : ${values.monthlyPrice} HT par mois pendant ${ENGAGEMENT_MONTHS} mois. ${end}`;
  }
  return `${start} : ${values.annualPrice} HT payés d'avance pour l'année (${ANNUAL_FREE_MONTHS} mois offerts). ${end}`;
}

/**
 * Demandes de chantier par mois d'une formule (`plans.limites.demandes_mois`, ADR 0290) : un plafond,
 * jamais une promesse. Nombre, « illimite » si la formule n'a pas de plafond, null sans limites lues.
 */
export function planMonthlyRequests(limites: unknown): number | "illimite" | null {
  if (!limites || typeof limites !== "object" || Array.isArray(limites)) return null;
  if (!("demandes_mois" in limites)) return null;
  const value = (limites as Record<string, unknown>).demandes_mois;
  if (value === null) return "illimite";
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

/** Prix de l'année payée d'avance : 10 mois sur 12. */
export function annualPriceCents(monthlyCents: number): number {
  return monthlyCents * (ENGAGEMENT_MONTHS - ANNUAL_FREE_MONTHS);
}

/** Équivalent mensuel d'un prix annuel, arrondi au centime (affichage). */
export function monthlyEquivalentCents(annualCents: number): number {
  return Math.round(annualCents / ENGAGEMENT_MONTHS);
}

/** Rentabilité d'une formule pour l'artisan (calculateur de /pro/formules, ADR 0265). */
export type SubscriptionPayback =
  | { marginCents: number; kind: "every"; months: number }
  | { marginCents: number; kind: "perMonth"; jobs: number };

/**
 * Combien de chantiers rentabilisent l'abonnement : marge d'un chantier moyen comparée au prix
 * mensuel. Marge ≥ prix : « 1 chantier tous les N mois » (N arrondi vers le bas) ; sinon
 * « N chantiers par mois » (arrondi vers le haut). Aucune promesse de volume de demandes.
 */
export function subscriptionPayback(
  monthlyCents: number,
  jobCents: number,
  marginPercent: number,
): SubscriptionPayback | null {
  if (monthlyCents <= 0 || jobCents <= 0 || marginPercent <= 0 || marginPercent > 100) return null;
  const marginCents = Math.round((jobCents * marginPercent) / 100);
  if (marginCents <= 0) return null;
  if (marginCents >= monthlyCents) {
    return { marginCents, kind: "every", months: Math.floor(marginCents / monthlyCents) };
  }
  return { marginCents, kind: "perMonth", jobs: Math.ceil(monthlyCents / marginCents) };
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

const sameCell = (a: PlanFeatureCell, b: PlanFeatureCell) =>
  a.kind === b.kind && (a.kind !== "texte" || (b.kind === "texte" && a.text === b.text));

/** Vrai si la ligne n'a pas la même valeur dans toutes les formules (ADR 0368). */
export function planFeatureDiffers(cells: readonly PlanFeatureCell[]): boolean {
  return cells.some((cell) => !sameCell(cell, cells[0] ?? cell));
}

export type PlanComparisonSplit = {
  /** Les lignes qui changent d'une formule à l'autre, par catégorie (catégories vides retirées). */
  differences: PlanComparison;
  /** Les lignes identiques partout, dans l'ordre du comparatif. */
  common: { libelle: string; detail: string | null }[];
  total: number;
};

/**
 * Comparatif « ce qui change » (ADR 0368) : les lignes qui différencient les formules d'un côté,
 * celles incluses partout de l'autre.
 */
export function splitPlanComparison(comparison: PlanComparison): PlanComparisonSplit {
  const differences: PlanComparison = [];
  const common: PlanComparisonSplit["common"] = [];
  let total = 0;
  for (const group of comparison) {
    const items = group.items.filter((item) => planFeatureDiffers(item.cells));
    for (const item of group.items) {
      total += 1;
      if (!planFeatureDiffers(item.cells))
        common.push({ libelle: item.libelle, detail: item.detail });
    }
    if (items.length > 0) differences.push({ categorie: group.categorie, items });
  }
  return { differences, common, total };
}

/**
 * Nombre de lignes où la formule `to` apporte autre chose que la formule `from` (« Premium :
 * tout Base, plus N fonctions », ADR 0368). Indices dans l'ordre des formules du comparatif.
 */
export function planAddedFeatures(comparison: PlanComparison, from: number, to: number): number {
  let count = 0;
  for (const group of comparison) {
    for (const item of group.items) {
      const a = item.cells[from];
      const b = item.cells[to];
      if (a && b && b.kind !== "absent" && !sameCell(a, b)) count += 1;
    }
  }
  return count;
}
