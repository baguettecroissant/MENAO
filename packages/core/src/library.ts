// Bibliothèque d'ouvrages et marge (F-141, ADR 0293). Un ouvrage est vendu au client sous une
// désignation et un prix ; sa composition (fournitures, heures, autres frais) reste privée et donne
// son coût (déboursé sec). Le prix de vente découle de deux réglages : un coefficient sur les
// fournitures et un prix de vente de l'heure. La marge s'affiche en euros et en taux de marque
// (part du prix de vente qui reste à l'artisan). Montants en centimes, quantités en millièmes.

export const COMPONENT_KINDS = ["fourniture", "heures", "frais"] as const;
export type ComponentKind = (typeof COMPONENT_KINDS)[number];

export type LibrarySettings = {
  /** Coût d'une heure de travail (salaire chargé, ou rémunération visée). */
  hourCostCents: number | null;
  /** Prix de vente de l'heure. */
  hourPriceCents: number | null;
  /** Coefficient sur les fournitures et frais, en points de base (1,30 = 13 000). */
  supplyCoefBp: number;
  /** Seuil d'alerte de marge (taux de marque, points de base) ; null = pas d'alerte. */
  marginAlertBp: number | null;
  /** Ancienneté (mois) au-delà de laquelle un prix d'achat est signalé. */
  priceMaxAgeMonths: number;
};

export const DEFAULT_LIBRARY_SETTINGS: LibrarySettings = {
  hourCostCents: null,
  hourPriceCents: null,
  supplyCoefBp: 10_000,
  marginAlertBp: null,
  priceMaxAgeMonths: 6,
};

export type LibrarySupply = {
  id: string;
  /** Prix d'achat de l'artisan ; null tant qu'il ne l'a pas saisi (fourniture copiée du catalogue MENAO). */
  purchasePriceCents: number | null;
  /**
   * Fourchette de prix publics HT de la fourniture MENAO liée (F-147), quand une source est branchée :
   * sert de repère tant que le prix d'achat manque.
   */
  publicRange?: { minCents: number; maxCents: number } | null;
  /** Perte (chutes, casse), en points de base : 10 % = 1 000. */
  wasteBp: number;
};

export type WorkComponent = {
  kind: ComponentKind;
  supplyId: string | null;
  quantityMilli: number;
  /** Coût unitaire d'un autre frais (location, évacuation, sous-traitance). */
  costCents: number | null;
};

export type ComponentAmounts = { costCents: number | null; saleCents: number | null };

/** Coût et prix de vente d'un élément de la composition ; null quand une donnée manque. */
export function componentAmounts(
  c: WorkComponent,
  settings: LibrarySettings,
  supplies: ReadonlyMap<string, LibrarySupply>,
): ComponentAmounts {
  const coef = (cost: number | null) =>
    cost === null ? null : Math.round((cost * settings.supplyCoefBp) / 10_000);
  if (c.kind === "heures") {
    const per = (cents: number | null) =>
      cents === null ? null : Math.round((cents * c.quantityMilli) / 1000);
    return { costCents: per(settings.hourCostCents), saleCents: per(settings.hourPriceCents) };
  }
  let cost: number | null = null;
  if (c.kind === "fourniture") {
    const supply = c.supplyId ? supplies.get(c.supplyId) : undefined;
    if (supply && supply.purchasePriceCents !== null) {
      cost = supplyCost(supply.purchasePriceCents, supply.wasteBp, c.quantityMilli);
    }
  } else if (c.costCents !== null) {
    cost = Math.round((c.costCents * c.quantityMilli) / 1000);
  }
  return { costCents: cost, saleCents: coef(cost) };
}

/** Coût d'une quantité de fourniture (millièmes), perte comprise. */
function supplyCost(unitCents: number, wasteBp: number, quantityMilli: number): number {
  return Math.round((unitCents * (10_000 + wasteBp) * quantityMilli) / 10_000_000);
}

/** Fourchette d'un prix de vente HT (F-147) : bas, haut, et le milieu retenu par défaut. */
export type PriceRange = { lowCents: number; highCents: number; midCents: number };

/** Prix retenu dans une fourchette indicative (F-147) : le bas, le milieu (par défaut) ou le haut. */
export const PRICE_PICKS = ["bas", "milieu", "haut"] as const;
export type PricePick = (typeof PRICE_PICKS)[number];

/** Montant de la fourchette correspondant au choix de l'artisan. */
export function pickInRange(range: PriceRange, pick: PricePick): number {
  return pick === "bas" ? range.lowCents : pick === "haut" ? range.highCents : range.midCents;
}

/**
 * Prix indicatif d'un ouvrage (F-147) : pose × prix de vente de l'heure, plus fournitures et frais ×
 * coefficient. Chaque fourniture compte à son prix d'achat s'il est connu, sinon à la fourchette de
 * prix publics de la fourniture MENAO liée. Null si une donnée manque (prix de l'heure, ou fourniture
 * sans prix ni fourchette). Jamais un prix commun : tout passe par les réglages de l'artisan.
 */
export function workPriceRange(
  components: readonly WorkComponent[],
  settings: LibrarySettings,
  supplies: ReadonlyMap<string, LibrarySupply>,
): PriceRange | null {
  if (components.length === 0) return null;
  let low = 0;
  let high = 0;
  for (const c of components) {
    if (c.kind === "heures") {
      if (settings.hourPriceCents === null) return null;
      const sale = Math.round((settings.hourPriceCents * c.quantityMilli) / 1000);
      low += sale;
      high += sale;
      continue;
    }
    let costLow: number;
    let costHigh: number;
    if (c.kind === "fourniture") {
      const supply = c.supplyId ? supplies.get(c.supplyId) : undefined;
      if (!supply) return null;
      if (supply.purchasePriceCents !== null) {
        costLow = costHigh = supplyCost(supply.purchasePriceCents, supply.wasteBp, c.quantityMilli);
      } else if (supply.publicRange) {
        costLow = supplyCost(supply.publicRange.minCents, supply.wasteBp, c.quantityMilli);
        costHigh = supplyCost(supply.publicRange.maxCents, supply.wasteBp, c.quantityMilli);
      } else {
        return null;
      }
    } else {
      if (c.costCents === null) return null;
      costLow = costHigh = Math.round((c.costCents * c.quantityMilli) / 1000);
    }
    low += Math.round((costLow * settings.supplyCoefBp) / 10_000);
    high += Math.round((costHigh * settings.supplyCoefBp) / 10_000);
  }
  return { lowCents: low, highCents: high, midCents: Math.round((low + high) / 2) };
}

/** Taux de marque en points de base : (prix − coût) / prix. */
export function markupRateBp(priceCents: number, costCents: number): number | null {
  if (priceCents <= 0) return null;
  return Math.round(((priceCents - costCents) * 10_000) / priceCents);
}

export type WorkPricing = {
  /** Déboursé sec ; null sans composition ou si un élément n'a pas de coût. */
  costCents: number | null;
  /** Prix calculé par la composition ; null si un élément n'a pas de prix de vente. */
  computedPriceCents: number | null;
  /**
   * Prix retenu : fixé à la main, sinon calculé, sinon le bas, le milieu ou le haut de la fourchette
   * indicative selon le choix de l'artisan (F-147 : fourniture MENAO sans prix d'achat, mais avec des
   * prix publics).
   */
  priceCents: number | null;
  /** Fourchette indicative (prix d'achat ou prix publics) ; null si une donnée manque. */
  range: PriceRange | null;
  marginCents: number | null;
  markupBp: number | null;
  supplies: ComponentAmounts;
  labor: ComponentAmounts & { hoursMilli: number };
  other: ComponentAmounts;
};

function sum(values: readonly (number | null)[]): number | null {
  return values.some((v) => v === null) ? null : values.reduce<number>((s, v) => s + (v ?? 0), 0);
}

/** Coût, prix et marge d'un ouvrage. */
export function workPricing(
  manualPriceCents: number | null,
  components: readonly WorkComponent[],
  settings: LibrarySettings,
  supplies: ReadonlyMap<string, LibrarySupply>,
  pick: PricePick = "milieu",
): WorkPricing {
  const amounts = components.map((c) => ({ c, a: componentAmounts(c, settings, supplies) }));
  const group = (kind: ComponentKind): ComponentAmounts => {
    const of = amounts.filter((x) => x.c.kind === kind);
    return {
      costCents: of.length ? sum(of.map((x) => x.a.costCents)) : 0,
      saleCents: of.length ? sum(of.map((x) => x.a.saleCents)) : 0,
    };
  };
  const supplyGroup = group("fourniture");
  const laborGroup = group("heures");
  const otherGroup = group("frais");
  const empty = components.length === 0;
  const costCents = empty ? null : sum(amounts.map((x) => x.a.costCents));
  const computedPriceCents = empty ? null : sum(amounts.map((x) => x.a.saleCents));
  const range = empty ? null : workPriceRange(components, settings, supplies);
  const priceCents =
    manualPriceCents ?? computedPriceCents ?? (range ? pickInRange(range, pick) : null);
  const marginCents = priceCents !== null && costCents !== null ? priceCents - costCents : null;
  return {
    costCents,
    computedPriceCents,
    priceCents,
    range,
    marginCents,
    markupBp:
      priceCents !== null && costCents !== null ? markupRateBp(priceCents, costCents) : null,
    supplies: supplyGroup,
    labor: {
      ...laborGroup,
      hoursMilli: components
        .filter((c) => c.kind === "heures")
        .reduce((s, c) => s + c.quantityMilli, 0),
    },
    other: otherGroup,
  };
}

/** Marge d'un devis : sur les lignes dont le coût est connu seulement. */
export function quoteMargin(lines: readonly { totalHtCents: number; costCents: number | null }[]) {
  const known = lines.filter((l) => l.costCents !== null);
  const sale = known.reduce((s, l) => s + l.totalHtCents, 0);
  const cost = known.reduce((s, l) => s + (l.costCents ?? 0), 0);
  return {
    marginCents: known.length ? sale - cost : null,
    markupBp: known.length ? markupRateBp(sale, cost) : null,
    counted: known.length,
    lines: lines.length,
  };
}

/** Alerte avant l'envoi : seulement si l'artisan a fixé un seuil et que la marge est dessous. */
export function belowMarginAlert(markupBp: number | null, alertBp: number | null): boolean {
  return alertBp !== null && markupBp !== null && markupBp < alertBp;
}

/** Prix d'achat à revoir : plus vieux que l'ancienneté réglée (dates AAAA-MM-JJ). */
export function supplyPriceIsOld(priceOn: string | null, today: string, maxAgeMonths: number) {
  if (!priceOn) return false;
  const [y, m, d] = priceOn.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  if (!y || !m || !d || !ty || !tm || !td) return false;
  const months = (ty - y) * 12 + (tm - m) - (td < d ? 1 : 0);
  return months >= maxAgeMonths;
}

/** « 1,30 » ou « × 1,3 » → 13 000 points de base ; null si invalide (0,5 à 10). */
export function parseCoefficient(input: string): number | null {
  const m = /^(\d{1,2})(?:[.,](\d{1,4}))?$/.exec(input.replace(/[×x\s]/gi, ""));
  if (!m) return null;
  const bp = Number(m[1]) * 10_000 + Number((m[2] ?? "").padEnd(4, "0"));
  return bp >= 5_000 && bp <= 100_000 ? bp : null;
}

/** 13 000 → « 1,30 ». */
export function formatCoefficient(bp: number): string {
  return (bp / 10_000).toFixed(bp % 100 === 0 ? 2 : 4).replace(".", ",");
}

/** Points de base → « 26,4 % ». */
export function formatRateBp(bp: number): string {
  return `${(bp / 100).toFixed(1).replace(".", ",")} %`;
}

/** « 20 » ou « 20,5 % » → points de base (0 à 90 %) ; null si invalide. */
export function parseRatePercent(input: string): number | null {
  const m = /^(\d{1,2})(?:[.,](\d{1,2}))?$/.exec(input.replace(/[%\s]/g, ""));
  if (!m) return null;
  const bp = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
  return bp <= 9_000 ? bp : null;
}

export type WorkForQuote = {
  id: string;
  designation: string;
  description: string | null;
  unit: string;
  lineType: "materiel" | "main_oeuvre" | "autre";
  vatRateBp: number;
  detailed: boolean;
};

export type LibraryQuoteLine = {
  type: "materiel" | "main_oeuvre" | "autre";
  designation: string;
  description: string;
  unit: string;
  unitPriceHtCents: number;
  vatRateBp: number;
  /** Coût unitaire privé ; null quand il est inconnu. */
  unitCostCents: number | null;
  workId: string;
};

/**
 * Lignes de devis d'un ouvrage (ADR 0294), pour une quantité de 1 de son unité : une ligne au prix
 * retenu, ou, s'il est « détaillé » et composé, une ligne de fournitures (fournitures et autres
 * frais) et une ligne de main d'œuvre. Un prix fixé à la main garde les fournitures au prix calculé
 * et reporte la différence sur la main d'œuvre. Sans prix, aucune ligne.
 */
export function workQuoteLines(
  work: WorkForQuote,
  pricing: WorkPricing,
  labels: { supplies: string; labor: string },
): LibraryQuoteLine[] {
  if (pricing.priceCents === null) return [];
  const base = {
    description: work.description ?? "",
    unit: work.unit,
    vatRateBp: work.vatRateBp,
    workId: work.id,
  };
  const suppliesSale =
    pricing.supplies.saleCents === null || pricing.other.saleCents === null
      ? null
      : pricing.supplies.saleCents + pricing.other.saleCents;
  const suppliesCost =
    pricing.supplies.costCents === null || pricing.other.costCents === null
      ? null
      : pricing.supplies.costCents + pricing.other.costCents;
  if (!work.detailed || suppliesSale === null || pricing.labor.hoursMilli === 0) {
    return [
      {
        ...base,
        type: work.lineType,
        designation: work.designation,
        unitPriceHtCents: pricing.priceCents,
        unitCostCents: pricing.costCents,
      },
    ];
  }
  return [
    {
      ...base,
      type: "materiel",
      designation: `${work.designation} ${labels.supplies}`.slice(0, 200),
      unitPriceHtCents: Math.min(suppliesSale, pricing.priceCents),
      unitCostCents: suppliesCost,
    },
    {
      ...base,
      type: "main_oeuvre",
      designation: `${work.designation} ${labels.labor}`.slice(0, 200),
      description: "",
      unitPriceHtCents: Math.max(0, pricing.priceCents - suppliesSale),
      unitCostCents: pricing.labor.costCents,
    },
  ];
}

/** Coût d'une ligne de devis : coût unitaire × quantité (millièmes). */
export function lineCostCents(unitCostCents: number | null, quantityMilli: number): number | null {
  return unitCostCents === null ? null : Math.round((unitCostCents * quantityMilli) / 1000);
}
