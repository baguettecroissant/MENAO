/**
 * Devis (F-19) : lignes et totaux en centimes entiers (CLAUDE.md règle 5), quantités en
 * millièmes (2,5 h = 2500) pour ne jamais calculer avec des nombres à virgule. La base applique
 * les mêmes règles (artisan_save_quote_draft).
 *
 * Arrondi : total HT de chaque ligne au centime le plus proche (moitié vers le haut), puis TVA
 * calculée par taux sur la somme hors taxe des lignes de ce taux.
 * TODO(legal) : règle d'arrondi et ventilation de la TVA à faire valider par l'expert-comptable.
 */

export const QUOTE_LINE_TYPES = ["materiel", "main_oeuvre", "autre"] as const;
export type QuoteLineType = (typeof QUOTE_LINE_TYPES)[number];

export const QUOTE_UNITS = ["u", "h", "jour", "m", "ml", "m2", "m3", "kg", "l", "forfait"] as const;
export type QuoteUnit = (typeof QUOTE_UNITS)[number];

/** Unité proposée selon le type de ligne (maquettes). */
export const DEFAULT_UNIT: Record<QuoteLineType, QuoteUnit> = {
  materiel: "u",
  main_oeuvre: "h",
  autre: "forfait",
};

/** Taux de TVA en points de base : 5,5 %, 10 %, 20 % ; 0 % pour la franchise en base. */
export const VAT_RATES_BP = [550, 1000, 2000] as const;
export const VAT_EXEMPT_BP = 0;

/** Taux possibles : franchise en base (art. 293 B du CGI) pour un artisan non assujetti. */
export function allowedVatRates(assujettiTva: boolean): readonly number[] {
  return assujettiTva ? VAT_RATES_BP : [VAT_EXEMPT_BP];
}

/** Bornes (mêmes contrôles en base). */
export const QUOTE_LIMITS = {
  maxLines: 200,
  maxQuantityMilli: 100_000_000, // 100 000 unités
  maxUnitPriceCents: 100_000_000, // 1 000 000 €
  maxLineTotalCents: 1_000_000_000, // 10 000 000 € par ligne
  designationMaxLength: 200,
  descriptionMaxLength: 1000,
} as const;

export type QuoteLineAmounts = {
  quantityMilli: number;
  unitPriceHtCents: number;
  vatRateBp: number;
};

/** Division entière arrondie au plus proche (moitié vers le haut), pour des valeurs positives. */
function roundDiv(numerator: bigint, denominator: bigint): number {
  return Number((numerator * 2n + denominator) / (denominator * 2n));
}

/** Total HT d'une ligne : quantité × prix unitaire, au centime le plus proche. */
export function lineTotalHtCents(quantityMilli: number, unitPriceHtCents: number): number {
  return roundDiv(BigInt(quantityMilli) * BigInt(unitPriceHtCents), 1000n);
}

function vatCents(baseHtCents: number, rateBp: number): number {
  return roundDiv(BigInt(baseHtCents) * BigInt(rateBp), 10_000n);
}

/** TTC affiché sur la carte d'une ligne (maquettes) ; les totaux du devis font foi. */
export function lineTtcCents(line: QuoteLineAmounts): number {
  const ht = lineTotalHtCents(line.quantityMilli, line.unitPriceHtCents);
  return ht + vatCents(ht, line.vatRateBp);
}

export type QuoteTotals = {
  totalHtCents: number;
  totalTvaCents: number;
  totalTtcCents: number;
  vat: { rateBp: number; baseHtCents: number; tvaCents: number }[];
};

export function quoteTotals(lines: readonly QuoteLineAmounts[]): QuoteTotals {
  const bases = new Map<number, number>();
  for (const line of lines) {
    const ht = lineTotalHtCents(line.quantityMilli, line.unitPriceHtCents);
    bases.set(line.vatRateBp, (bases.get(line.vatRateBp) ?? 0) + ht);
  }
  const vat = [...bases.entries()]
    .sort(([a], [b]) => a - b)
    .map(([rateBp, baseHtCents]) => ({
      rateBp,
      baseHtCents,
      tvaCents: vatCents(baseHtCents, rateBp),
    }));
  const totalHtCents = vat.reduce((sum, v) => sum + v.baseHtCents, 0);
  const totalTvaCents = vat.reduce((sum, v) => sum + v.tvaCents, 0);
  return { totalHtCents, totalTvaCents, totalTtcCents: totalHtCents + totalTvaCents, vat };
}

// Espaces de milliers acceptés : espace, insécable, fine insécable (toutes couvertes par \s).
const SPACES = /\s/g;

/** « 22,50 » ou « 22.5 » → 2250 centimes ; null si invalide (2 décimales au plus). */
export function parseEuros(input: string): number | null {
  const value = input.replace(SPACES, "").replace(",", ".");
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(value);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

/** « 2,5 » → 2500 millièmes ; null si invalide, nulle ou à plus de 3 décimales. */
export function parseQuantity(input: string): number | null {
  const value = input.replace(SPACES, "").replace(",", ".");
  const m = /^(\d{1,9})(?:\.(\d{1,3}))?$/.exec(value);
  if (!m) return null;
  const milli = Number(m[1]) * 1000 + Number((m[2] ?? "").padEnd(3, "0"));
  return milli > 0 ? milli : null;
}

const quantityFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 });

/** 2500 → « 2,5 ». */
export function formatQuantity(quantityMilli: number): string {
  return quantityFormat.format(quantityMilli / 1000);
}
