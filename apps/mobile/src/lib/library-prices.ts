import {
  addDays,
  DEFAULT_LIBRARY_SETTINGS,
  INVOICE_WINDOW_DAYS,
  invoiceChangesFor,
  invoicePriceProposals,
  isExampleId,
  type InvoiceChangeTrend,
  type InvoiceLine,
  type InvoiceNewSupply,
  type InvoicePriceChange,
  type LibrarySettings,
  type LibrarySupply,
  type PricePick,
  parisToday,
  RAISE_UNDO_HOURS,
  type QuoteUnit,
  type RaiseRounding,
  type SupplyDependentWork,
  workPricing,
} from "@menao/core";
import { supabase } from "./supabase";

/**
 * Garder ses prix à jour dans l'application (F-149, lot 44, ADR 0313), comme sur le site : prix
 * d'achat repérés dans les factures lues dans Dépenses, hausse en un geste annulable 24 h. Calculs
 * par @menao/core ; écritures par les fonctions de la base (RLS : patron et chef d'équipe).
 */

type SupplyRow = {
  id: string;
  designation: string;
  reference: string | null;
  unit: QuoteUnit;
  purchase_price_cents: number | null;
  price_on: string | null;
  waste_bp: number;
};
type WorkRow = {
  id: string;
  designation: string;
  unit: string;
  manual_price_cents: number | null;
  price_cents: number | null;
  price_pick: string | null;
};
type ComponentRow = {
  work_id: string;
  kind: string;
  supply_id: string | null;
  quantity_milli: number;
  cost_cents: number | null;
};

export type PriceBase = {
  settings: LibrarySettings;
  supplies: SupplyRow[];
  works: WorkRow[];
  components: ComponentRow[];
};

/** Fournitures, ouvrages (prix fixé et prix enregistré), composition et réglages. */
async function loadPriceBase(): Promise<PriceBase | null> {
  const [settingsRes, suppliesRes, worksRes, componentsRes] = await Promise.all([
    supabase
      .from("artisan_pricing_settings")
      .select(
        "hour_cost_cents, hour_price_cents, supply_coef_bp, margin_alert_bp, price_max_age_months",
      )
      .maybeSingle(),
    supabase
      .from("artisan_supplies")
      .select("id, designation, reference, unit, purchase_price_cents, price_on, waste_bp")
      .order("designation")
      .limit(2000),
    supabase
      .from("artisan_works")
      .select("id, designation, unit, manual_price_cents, price_cents, price_pick")
      .order("designation")
      .limit(2000),
    supabase
      .from("artisan_work_components")
      .select("work_id, kind, supply_id, quantity_milli, cost_cents")
      .order("position")
      .limit(20000),
  ]);
  if (suppliesRes.error || worksRes.error) return null;
  const s = settingsRes.data;
  return {
    settings: s
      ? {
          hourCostCents: s.hour_cost_cents,
          hourPriceCents: s.hour_price_cents,
          supplyCoefBp: s.supply_coef_bp,
          marginAlertBp: s.margin_alert_bp,
          priceMaxAgeMonths: s.price_max_age_months,
        }
      : DEFAULT_LIBRARY_SETTINGS,
    supplies: (suppliesRes.data ?? []) as SupplyRow[],
    works: (worksRes.data ?? []) as WorkRow[],
    components: (componentsRes.data ?? []) as ComponentRow[],
  };
}

/**
 * Prix courant de chaque ouvrage enregistré pour les appels d'offres (ADR 0294), recalculé après
 * un changement de prix, comme `refreshWorkPrices` du site.
 */
export async function refreshWorkPrices(): Promise<void> {
  const base = await loadPriceBase();
  if (!base) return;
  const supplies = new Map<string, LibrarySupply>(
    base.supplies.map((x) => [
      x.id,
      {
        id: x.id,
        purchasePriceCents: x.purchase_price_cents,
        wasteBp: x.waste_bp,
        publicRange: null,
      },
    ]),
  );
  const byWork = new Map<string, ComponentRow[]>();
  for (const c of base.components) byWork.set(c.work_id, [...(byWork.get(c.work_id) ?? []), c]);
  const changed = base.works
    .map((w) => {
      const pricing = workPricing(
        w.manual_price_cents,
        (byWork.get(w.id) ?? []).map((c) => ({
          kind: c.kind as "fourniture" | "heures" | "frais",
          supplyId: c.supply_id,
          quantityMilli: c.quantity_milli,
          costCents: c.cost_cents,
        })),
        base.settings,
        supplies,
        (w.price_pick ?? "milieu") as PricePick,
      );
      return { id: w.id, before: w.price_cents, priceCents: pricing.priceCents };
    })
    .filter((w) => w.before !== w.priceCents)
    .map(({ id, priceCents }) => ({ id, priceCents }));
  if (changed.length) await supabase.rpc("artisan_set_work_prices", { p_prices: changed });
}

type LineRow = {
  id: string;
  designation: string;
  reference: string | null;
  unit: QuoteUnit | null;
  unit_price_ht_cents: number | null;
  expenses: { issued_on: string; supplier_name: string | null } | null;
  library_invoice_reviews: { reviewed_at: string } | { reviewed_at: string }[] | null;
};

export type InvoiceChangeView = InvoicePriceChange & {
  designation: string;
  reference: string | null;
};

export type InvoicePrices = {
  changes: InvoiceChangeView[];
  fresh: InvoiceNewSupply[];
  since: string | null;
  works: SupplyDependentWork[];
};

/** Lignes des factures des 90 derniers jours, rapprochées des fournitures par @menao/core. */
export async function loadInvoicePrices(): Promise<InvoicePrices | null> {
  const since = addDays(parisToday(), -INVOICE_WINDOW_DAYS);
  const [base, linesRes] = await Promise.all([
    loadPriceBase(),
    supabase
      .from("expense_lines")
      .select(
        "id, designation, reference, unit, unit_price_ht_cents, expenses!inner(issued_on, supplier_name), library_invoice_reviews(reviewed_at)",
      )
      .gte("expenses.issued_on", since)
      .not("unit_price_ht_cents", "is", null)
      .limit(3000),
  ]);
  if (!base || linesRes.error) return null;
  const lines: InvoiceLine[] = ((linesRes.data ?? []) as unknown as LineRow[])
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
  const { changes, fresh } = invoicePriceProposals(
    lines,
    base.supplies.map((s) => ({
      id: s.id,
      designation: s.designation,
      reference: s.reference,
      unit: s.unit,
      purchasePriceCents: s.purchase_price_cents,
      priceOn: s.price_on,
    })),
  );
  const bySupply = new Map(base.supplies.map((s) => [s.id, s]));
  const supplyIds = new Map<string, string[]>();
  for (const c of base.components) {
    if (c.supply_id) supplyIds.set(c.work_id, [...(supplyIds.get(c.work_id) ?? []), c.supply_id]);
  }
  return {
    changes: changes.map((c) => ({
      ...c,
      designation: bySupply.get(c.supplyId)?.designation ?? "",
      reference: bySupply.get(c.supplyId)?.reference ?? null,
    })),
    fresh,
    since: lines.map((l) => l.issuedOn).sort()[0] ?? null,
    works: base.works.map((w) => ({
      id: w.id,
      manualPriceCents: w.manual_price_cents,
      supplyIds: supplyIds.get(w.id) ?? [],
    })),
  };
}

/** Prix cochés mis à jour, articles cochés ajoutés, lignes affichées passées en revue. */
export async function applyInvoicePrices(input: {
  updates: { supplyId: string; lineId: string }[];
  add: string[];
  seen: string[];
}): Promise<{ updated: number; added: number } | null> {
  const { data, error } = await supabase.rpc("artisan_apply_invoice_prices", {
    p_updates: input.updates,
    p_add: input.add,
    p_seen: input.seen,
  });
  if (error || !data) return null;
  await refreshWorkPrices();
  return data as { updated: number; added: number };
}

export type ExpensePriceChanges = { count: number; names: string[]; trend: InvoiceChangeTrend };

/** Carte de la fiche d'une dépense : prix d'achat que cette facture permet de mettre à jour. */
export async function loadExpensePriceChanges(
  expenseId: string,
): Promise<ExpensePriceChanges | null> {
  if (isExampleId(expenseId)) return null;
  const { data: lines } = await supabase
    .from("expense_lines")
    .select("id")
    .eq("expense_id", expenseId)
    .not("unit_price_ht_cents", "is", null);
  if (!lines?.length) return null;
  const prices = await loadInvoicePrices();
  if (!prices) return null;
  const { changes, trend } = invoiceChangesFor(prices.changes, new Set(lines.map((l) => l.id)));
  if (!trend) return null;
  const names = new Map(prices.changes.map((c) => [c.lineId, c.designation]));
  return {
    count: changes.length,
    names: changes.map((c) => names.get(c.lineId) ?? "").filter(Boolean),
    trend,
  };
}

/** Résumé des propositions pour le bandeau de la bibliothèque. */
export async function loadInvoiceCounts(): Promise<{ changed: number; fresh: number }> {
  const prices = await loadInvoicePrices();
  return { changed: prices?.changes.length ?? 0, fresh: prices?.fresh.length ?? 0 };
}

export type RaiseBase = {
  works: { id: string; designation: string; unit: string; manualPriceCents: number | null }[];
  supplies: { id: string; designation: string; unit: string; purchasePriceCents: number | null }[];
};

/** Ouvrages et fournitures, pour l'aperçu de la hausse. */
export async function loadRaiseBase(): Promise<RaiseBase | null> {
  const base = await loadPriceBase();
  if (!base) return null;
  return {
    works: base.works.map((w) => ({
      id: w.id,
      designation: w.designation,
      unit: w.unit,
      manualPriceCents: w.manual_price_cents,
    })),
    supplies: base.supplies.map((s) => ({
      id: s.id,
      designation: s.designation,
      unit: s.unit,
      purchasePriceCents: s.purchase_price_cents,
    })),
  };
}

/** Hausse d'un bloc, calculée et gardée par la base ; puis prix enregistrés recalculés. */
export async function raisePrices(input: {
  rateBp: number;
  rounding: RaiseRounding;
  works: boolean;
  supplies: boolean;
}): Promise<boolean> {
  const { error } = await supabase.rpc("artisan_raise_prices", {
    p_rate_bp: input.rateBp,
    p_rounding: input.rounding,
    p_works: input.works,
    p_supplies: input.supplies,
  });
  if (error) return false;
  await refreshWorkPrices();
  return true;
}

export type UndoableRaise = {
  id: string;
  rateBp: number;
  works: number;
  supplies: number;
  until: string;
};

/** Dernière hausse encore annulable (ni annulée, ni vieille de plus de 24 h). */
export async function loadUndoableRaise(): Promise<UndoableRaise | null> {
  const { data } = await supabase
    .from("library_price_raises")
    .select("id, rate_bp, works_count, supplies_count, created_at, undone_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data || data.undone_at) return null;
  const until = new Date(new Date(data.created_at).getTime() + RAISE_UNDO_HOURS * 3_600_000);
  if (until.getTime() <= Date.now()) return null;
  return {
    id: data.id,
    rateBp: data.rate_bp,
    works: data.works_count,
    supplies: data.supplies_count,
    until: until.toISOString(),
  };
}

/** Annulation de la dernière hausse ; rend le nombre de prix rétablis, ou null. */
export async function undoRaise(raiseId: string): Promise<number | null> {
  const { data, error } = await supabase.rpc("artisan_undo_price_raise", { p_raise_id: raiseId });
  if (error || data === null) return null;
  await refreshWorkPrices();
  return data;
}
