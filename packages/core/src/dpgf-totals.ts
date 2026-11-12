/**
 * Appels d'offres (F-136, ADR 0287) : totaux du DPGF chiffré et écarts de quantités avec celui de
 * l'architecte, aux règles d'arrondi des devis.
 */
import { lineTotalHtCents, quoteTotals } from "./quote";

export type TenderLineAmounts = {
  kind: "titre" | "poste";
  /** Quantité retenue par l'artisan (celle de l'architecte au départ). */
  quantityMilli: number | null;
  architectQuantityMilli: number | null;
  unitPriceHtCents: number | null;
};

export type TenderTotals = {
  totalHtCents: number;
  totalTvaCents: number;
  totalTtcCents: number;
  posts: number;
  /** Postes avec une quantité et un prix. */
  priced: number;
  toPrice: number;
};

export function tenderTotals(lines: readonly TenderLineAmounts[], vatRateBp: number): TenderTotals {
  const posts = lines.filter((l) => l.kind === "poste");
  const priced = posts.filter((l) => l.quantityMilli !== null && l.unitPriceHtCents !== null);
  const totals = quoteTotals(
    priced.map((l) => ({
      quantityMilli: l.quantityMilli ?? 0,
      unitPriceHtCents: l.unitPriceHtCents ?? 0,
      vatRateBp,
    })),
  );
  return {
    totalHtCents: totals.totalHtCents,
    totalTvaCents: totals.totalTvaCents,
    totalTtcCents: totals.totalTtcCents,
    posts: posts.length,
    priced: priced.length,
    toPrice: posts.length - priced.length,
  };
}

/**
 * Écarts avec le DPGF de l'architecte : postes dont l'artisan a changé la quantité, et montant HT
 * des quantités en plus (travaux qu'un forfait laisserait à sa charge s'il gardait celles du DPGF).
 */
export function tenderGaps(lines: readonly TenderLineAmounts[]): {
  changed: number;
  underestimatedHtCents: number;
} {
  let changed = 0;
  let underestimatedHtCents = 0;
  for (const l of lines) {
    if (l.kind !== "poste" || l.quantityMilli === null || l.architectQuantityMilli === null)
      continue;
    if (l.quantityMilli === l.architectQuantityMilli) continue;
    changed++;
    if (l.quantityMilli > l.architectQuantityMilli && l.unitPriceHtCents !== null) {
      underestimatedHtCents += lineTotalHtCents(
        l.quantityMilli - l.architectQuantityMilli,
        l.unitPriceHtCents,
      );
    }
  }
  return { changed, underestimatedHtCents };
}
