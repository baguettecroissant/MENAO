import "server-only";
import {
  INVOICE_WINDOW_DAYS,
  type InvoiceLine,
  type InvoiceProposals,
  type QuoteUnit,
  type SupplyDependentWork,
  addDays,
  invoiceChangesFor,
  invoicePriceProposals,
  parisToday,
} from "@menao/core";
import type { createClient } from "@/lib/supabase/server";
import { type Library, loadLibrary } from "./library";

type Client = Awaited<ReturnType<typeof createClient>>;

type LineRow = {
  id: string;
  designation: string;
  reference: string | null;
  unit: QuoteUnit | null;
  unit_price_ht_cents: number | null;
  expenses: { issued_on: string; supplier_name: string | null } | null;
  library_invoice_reviews: { reviewed_at: string } | { reviewed_at: string }[] | null;
};

export type InvoicePrices = InvoiceProposals & {
  /** Date de la plus ancienne facture lue (fenêtre de 90 jours). */
  since: string | null;
  /** Ouvrages et fournitures qu'ils utilisent, pour « Ouvrages recalculés ». */
  works: SupplyDependentWork[];
};

/**
 * Prix d'achat repérés dans les factures des 90 derniers jours (F-149, ADR 0311) : lignes lues
 * dans « Dépenses » (RLS : patron et chef d'équipe), rapprochées par packages/core.
 */
export async function loadInvoicePrices(
  supabase: Client,
  library: Library,
): Promise<InvoicePrices> {
  const since = addDays(parisToday(), -INVOICE_WINDOW_DAYS);
  const { data } = await supabase
    .from("expense_lines")
    .select(
      "id, designation, reference, unit, unit_price_ht_cents, expenses!inner(issued_on, supplier_name), library_invoice_reviews(reviewed_at)",
    )
    .gte("expenses.issued_on", since)
    .not("unit_price_ht_cents", "is", null)
    .limit(3000);
  const lines: InvoiceLine[] = ((data ?? []) as unknown as LineRow[])
    .filter((r) => r.expenses)
    .map((r) => {
      const review = r.library_invoice_reviews;
      return {
        id: r.id,
        designation: r.designation,
        reference: r.reference,
        unit: r.unit,
        unitPriceCents: r.unit_price_ht_cents,
        issuedOn: r.expenses!.issued_on,
        supplier: r.expenses!.supplier_name,
        reviewed: Array.isArray(review) ? review.length > 0 : review !== null,
      };
    });
  const proposals = invoicePriceProposals(
    lines,
    library.supplies.map((s) => ({
      id: s.id,
      designation: s.designation,
      reference: s.reference,
      unit: s.unit,
      purchasePriceCents: s.purchase_price_cents,
      priceOn: s.price_on,
    })),
  );
  const dates = lines.map((l) => l.issuedOn).sort();
  return {
    ...proposals,
    since: dates[0] ?? null,
    works: library.works.map((w) => ({
      id: w.id,
      manualPriceCents: w.manual_price_cents,
      supplyIds: w.components.flatMap((c) => (c.supply_id ? [c.supply_id] : [])),
    })),
  };
}

export type ExpensePriceChanges = {
  count: number;
  names: string[];
  trend: "hausse" | "baisse" | "mixte";
};

/**
 * Prix d'achat qu'une facture lue dans Dépenses permet de mettre à jour (lot 44) : carte de la
 * fiche de la dépense. Rien hors de la fenêtre de 90 jours ou sans ligne.
 */
export async function loadExpensePriceChanges(
  supabase: Client,
  expenseId: string,
  issuedOn: string,
): Promise<ExpensePriceChanges | null> {
  if (issuedOn < addDays(parisToday(), -INVOICE_WINDOW_DAYS)) return null;
  const { data: lines } = await supabase
    .from("expense_lines")
    .select("id")
    .eq("expense_id", expenseId)
    .not("unit_price_ht_cents", "is", null);
  if (!lines?.length) return null;
  const library = await loadLibrary(supabase, { seed: false });
  if (library.supplies.length === 0) return null;
  const prices = await loadInvoicePrices(supabase, library);
  const { changes, trend } = invoiceChangesFor(prices.changes, new Set(lines.map((l) => l.id)));
  if (!trend) return null;
  const supplies = new Map(library.supplies.map((s) => [s.id, s.designation]));
  return {
    count: changes.length,
    names: changes.map((c) => supplies.get(c.supplyId) ?? "").filter(Boolean),
    trend,
  };
}
