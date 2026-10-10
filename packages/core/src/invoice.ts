/**
 * Factures des chantiers (F-35), au nom de l'artisan. Calculs en centimes exacts (BigInt), mêmes
 * règles en base (app.deposit_invoice_vat). Logique pure, aussi chargée par Deno.
 * TODO(legal) : répartition et arrondis à faire valider par l'expert-comptable.
 */

export type VatPart = { rateBp: number; baseHtCents: number; tvaCents: number };

/** Division entière arrondie au plus proche (moitié vers le haut), pour des valeurs positives. */
function roundDiv(numerator: bigint, denominator: bigint): bigint {
  return (numerator * 2n + denominator) / (denominator * 2n);
}

/**
 * Facture d'acompte : le montant payé (TTC) est réparti entre les taux de TVA du devis, au prorata
 * du TTC de chaque taux (le reste d'arrondi va au dernier taux, le plus élevé). Dans chaque part,
 * HT = TTC ÷ (1 + taux), arrondi au plus proche, et TVA = TTC − HT : la somme vaut le montant payé.
 */
export function depositInvoiceVat(
  vat: readonly VatPart[],
  quoteTotalTtcCents: number,
  paidCents: number,
): VatPart[] {
  if (quoteTotalTtcCents <= 0 || paidCents <= 0 || vat.length === 0) return [];
  const total = BigInt(quoteTotalTtcCents);
  const paid = BigInt(paidCents);
  let allocated = 0n;
  return vat.map((part, i) => {
    const ttc =
      i === vat.length - 1
        ? paid - allocated
        : (paid * BigInt(part.baseHtCents + part.tvaCents)) / total;
    allocated += ttc;
    const ht = roundDiv(ttc * 10_000n, BigInt(10_000 + part.rateBp));
    return { rateBp: part.rateBp, baseHtCents: Number(ht), tvaCents: Number(ttc - ht) };
  });
}

/** Totaux d'une facture à partir de sa ventilation par taux. */
export function invoiceTotals(vat: readonly VatPart[]) {
  const totalHtCents = vat.reduce((sum, v) => sum + v.baseHtCents, 0);
  const totalTvaCents = vat.reduce((sum, v) => sum + v.tvaCents, 0);
  return { totalHtCents, totalTvaCents, totalTtcCents: totalHtCents + totalTvaCents };
}

/**
 * Facture de solde : ventilation du devis moins celle des factures d'acompte, taux par taux. Le
 * TTC obtenu vaut le solde payé (total du devis − acomptes, toujours calculé ; CLAUDE.md règle 5).
 */
export function balanceInvoiceVat(
  quoteVat: readonly VatPart[],
  depositVat: readonly VatPart[],
): VatPart[] {
  return quoteVat.map((part) => {
    const paid = depositVat.filter((d) => d.rateBp === part.rateBp);
    return {
      rateBp: part.rateBp,
      baseHtCents: part.baseHtCents - paid.reduce((sum, d) => sum + d.baseHtCents, 0),
      tvaCents: part.tvaCents - paid.reduce((sum, d) => sum + d.tvaCents, 0),
    };
  });
}
