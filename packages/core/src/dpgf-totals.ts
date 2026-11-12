/**
 * Appels d'offres (F-136, ADR 0287) : totaux du DPGF chiffré et écarts de quantités avec celui de
 * l'architecte, aux règles d'arrondi des devis.
 */
import type { DpgfUnit } from "./dpgf";
import { QUOTE_LIMITS, lineTotalHtCents, quoteTotals } from "./quote";

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

// ---------------------------------------------------------------------------------------------
// DPGF repris dans un devis MENAO (F-138, ADR 0289)
// ---------------------------------------------------------------------------------------------

export type TenderPostForQuote = {
  kind: "titre" | "poste";
  lot: string | null;
  code: string | null;
  designation: string;
  unit: DpgfUnit | null;
  quantityMilli: number | null;
  unitPriceHtCents: number | null;
};

export type TenderQuoteLine = {
  type: "autre";
  designation: string;
  description: string | null;
  quantityMilli: number;
  unit: DpgfUnit;
  unitPriceHtCents: number;
  vatRateBp: number;
};

/**
 * Lignes de devis tirées d'un DPGF chiffré : les postes avec une quantité et un prix, désignation
 * précédée du n° du poste, lot en description, unité inconnue comptée au forfait, TVA de l'offre.
 * Les postes incomplets sont comptés à part ; au-delà de la limite de lignes d'un devis (en tenant
 * compte des lignes déjà présentes), le reste est compté comme coupé.
 */
export function tenderQuoteLines(
  posts: readonly TenderPostForQuote[],
  vatRateBp: number,
  existingLines: number,
): { lines: TenderQuoteLine[]; skipped: number; truncated: number } {
  const room = Math.max(0, QUOTE_LIMITS.maxLines - existingLines);
  const lines: TenderQuoteLine[] = [];
  let skipped = 0;
  let truncated = 0;
  for (const p of posts) {
    if (p.kind !== "poste") continue;
    if (
      p.quantityMilli === null ||
      p.quantityMilli <= 0 ||
      p.quantityMilli > QUOTE_LIMITS.maxQuantityMilli ||
      p.unitPriceHtCents === null
    ) {
      skipped++;
      continue;
    }
    if (lines.length >= room) {
      truncated++;
      continue;
    }
    lines.push({
      type: "autre",
      designation: [p.code, p.designation]
        .filter(Boolean)
        .join(" ")
        .slice(0, QUOTE_LIMITS.designationMaxLength),
      description: p.lot ? p.lot.slice(0, QUOTE_LIMITS.descriptionMaxLength) : null,
      quantityMilli: p.quantityMilli,
      unit: p.unit ?? "forfait",
      unitPriceHtCents: p.unitPriceHtCents,
      vatRateBp,
    });
  }
  return { lines, skipped, truncated };
}
