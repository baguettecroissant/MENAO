/**
 * Prix d'achat repérés dans les factures (F-149, ADR 0311, maquette lot 43) : les lignes des
 * factures fournisseurs déjà lues dans « Dépenses » sont rapprochées des fournitures de la
 * bibliothèque, par la référence, sinon par la désignation et l'unité. L'artisan vérifie et met à
 * jour d'un geste ; une ligne inconnue peut devenir une fourniture. Aucun appel à l'IA.
 */
import type { QuoteUnit } from "./quote";

/** Au-delà de 30 % d'écart, la ligne est décochée par défaut (conditionnement différent ?). */
export const PRICE_JUMP_BP = 3000;
/** Factures prises en compte : celles des 90 derniers jours. */
export const INVOICE_WINDOW_DAYS = 90;

/** Ligne d'une facture fournisseur lue dans « Dépenses ». */
export type InvoiceLine = {
  id: string;
  designation: string;
  reference: string | null;
  unit: QuoteUnit | null;
  unitPriceCents: number | null;
  /** Date de la facture (AAAA-MM-JJ). */
  issuedOn: string;
  supplier: string | null;
  /** Ligne déjà passée en revue (mise à jour ou laissée) : plus proposée. */
  reviewed: boolean;
};

/** Fourniture de la bibliothèque, telle que comparée aux factures. */
export type InvoiceSupply = {
  id: string;
  designation: string;
  reference: string | null;
  unit: QuoteUnit;
  /** Null : prix d'achat encore à renseigner (fourniture MENAO). */
  purchasePriceCents: number | null;
  priceOn: string | null;
};

export type InvoicePriceChange = {
  supplyId: string;
  lineId: string;
  matchedBy: "reference" | "designation";
  oldCents: number | null;
  newCents: number;
  /** Écart en points de base (+8,8 % = 880) ; null sans prix actuel. */
  deltaBp: number | null;
  issuedOn: string;
  supplier: string | null;
  /** Cochée par défaut : écart de 30 % au plus, ou prix encore à renseigner. */
  checked: boolean;
};

export type InvoiceNewSupply = {
  lineId: string;
  designation: string;
  reference: string | null;
  unit: QuoteUnit;
  priceCents: number;
  issuedOn: string;
  supplier: string | null;
};

export type InvoiceProposals = {
  changes: InvoicePriceChange[];
  fresh: InvoiceNewSupply[];
};

/**
 * Désignation comparable : sans accents, sans ponctuation, en minuscules, chiffres et lettres
 * séparés (« 45mm » = « 45 mm »).
 */
export function designationKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Référence comparable : majuscules, sans espaces ni séparateurs (« BA13-250 » = « ba13 250 »). */
export function referenceKey(text: string | null): string | null {
  if (!text) return null;
  const key = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return key.length >= 2 ? key : null;
}

/** Écart en points de base entre l'ancien et le nouveau prix ; null sans ancien prix. */
export function priceDeltaBp(oldCents: number | null, newCents: number): number | null {
  if (oldCents === null || oldCents <= 0) return null;
  return Math.round(((newCents - oldCents) * 10000) / oldCents);
}

/** Ligne exploitable : désignation, prix unitaire positif. */
const usable = (l: InvoiceLine): l is InvoiceLine & { unitPriceCents: number } =>
  l.unitPriceCents !== null && l.unitPriceCents > 0 && designationKey(l.designation).length >= 2;

/**
 * Propositions de mise à jour : pour chaque fourniture, la ligne de facture la plus récente qui
 * lui correspond (même référence et unité compatible, sinon même désignation et même unité). Elle
 * est proposée si elle n'a pas été passée en revue, si elle n'est pas plus ancienne que le prix
 * actuel et si le prix change. Les lignes qui ne correspondent à aucune fourniture (ni par la
 * référence ni par la désignation) deviennent des ajouts possibles, une fois par article.
 */
export function invoicePriceProposals(
  lines: readonly InvoiceLine[],
  supplies: readonly InvoiceSupply[],
): InvoiceProposals {
  const recent = lines
    .filter(usable)
    .map((l, i) => ({ l, i }))
    .sort((a, b) =>
      a.l.issuedOn === b.l.issuedOn ? a.i - b.i : a.l.issuedOn < b.l.issuedOn ? 1 : -1,
    )
    .map(({ l }) => l);

  const byReference = new Map<string, InvoiceSupply[]>();
  const byDesignation = new Map<string, InvoiceSupply[]>();
  for (const s of supplies) {
    const ref = referenceKey(s.reference);
    if (ref) byReference.set(ref, [...(byReference.get(ref) ?? []), s]);
    const key = designationKey(s.designation);
    byDesignation.set(key, [...(byDesignation.get(key) ?? []), s]);
  }

  const latest = new Map<
    string,
    { line: (typeof recent)[number]; by: "reference" | "designation" }
  >();
  const freshByKey = new Map<string, InvoiceNewSupply>();
  for (const line of recent) {
    const ref = referenceKey(line.reference);
    const sameRef = (ref ? byReference.get(ref) : undefined) ?? [];
    const sameName = byDesignation.get(designationKey(line.designation)) ?? [];
    const viaRef = sameRef.find((s) => line.unit === null || line.unit === s.unit);
    const viaName = viaRef ? undefined : sameName.find((s) => line.unit === s.unit);
    const supply = viaRef ?? viaName;
    if (supply) {
      if (!latest.has(supply.id)) {
        latest.set(supply.id, { line, by: viaRef ? "reference" : "designation" });
      }
      continue;
    }
    // Connue sous une autre unité (conditionnement différent) : ni rapprochée, ni ajoutée.
    if (sameRef.length || sameName.length || line.reviewed || line.unit === null) continue;
    const key = `${designationKey(line.designation)}|${line.unit}`;
    if (!freshByKey.has(key)) {
      freshByKey.set(key, {
        lineId: line.id,
        designation: line.designation.trim(),
        reference: line.reference,
        unit: line.unit,
        priceCents: line.unitPriceCents,
        issuedOn: line.issuedOn,
        supplier: line.supplier,
      });
    }
  }

  const changes: InvoicePriceChange[] = [];
  for (const s of supplies) {
    const match = latest.get(s.id);
    if (!match) continue;
    const { line, by } = match;
    if (line.reviewed) continue;
    if (s.priceOn !== null && line.issuedOn < s.priceOn) continue;
    if (line.unitPriceCents === s.purchasePriceCents) continue;
    const deltaBp = priceDeltaBp(s.purchasePriceCents, line.unitPriceCents);
    changes.push({
      supplyId: s.id,
      lineId: line.id,
      matchedBy: by,
      oldCents: s.purchasePriceCents,
      newCents: line.unitPriceCents,
      deltaBp,
      issuedOn: line.issuedOn,
      supplier: line.supplier,
      checked: deltaBp === null || Math.abs(deltaBp) <= PRICE_JUMP_BP,
    });
  }
  changes.sort((a, b) => (a.issuedOn === b.issuedOn ? 0 : a.issuedOn < b.issuedOn ? 1 : -1));
  return { changes, fresh: [...freshByKey.values()] };
}

/** Ouvrage de la bibliothèque, pour compter ceux dont le prix suit les fournitures. */
export type SupplyDependentWork = {
  id: string;
  manualPriceCents: number | null;
  supplyIds: readonly string[];
};

/** Nombre d'ouvrages recalculés quand ces fournitures changent (prix non fixé à la main). */
export function worksRecalculated(
  works: readonly SupplyDependentWork[],
  supplyIds: ReadonlySet<string>,
): number {
  return works.filter(
    (w) => w.manualPriceCents === null && w.supplyIds.some((id) => supplyIds.has(id)),
  ).length;
}
