import "server-only";
import {
  DEFAULT_LIBRARY_SETTINGS,
  lineCostCents,
  quoteMargin,
  type ComponentKind,
  type LibrarySettings,
  type LibrarySupply,
  type QuoteUnit,
  type WorkComponent,
  type WorkPricing,
  workPricing,
} from "@menao/core";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type SupplyRow = {
  id: string;
  designation: string;
  reference: string | null;
  supplier: string | null;
  unit: QuoteUnit;
  /** Null : fourniture copiée de la bibliothèque MENAO, prix d'achat à renseigner (F-147). */
  purchase_price_cents: number | null;
  price_on: string | null;
  waste_bp: number;
};

export type ComponentRow = {
  work_id: string;
  position: number;
  kind: ComponentKind;
  supply_id: string | null;
  label: string | null;
  quantity_milli: number;
  cost_cents: number | null;
};

export type WorkRow = {
  id: string;
  designation: string;
  description: string | null;
  unit: QuoteUnit;
  line_type: "materiel" | "main_oeuvre" | "autre";
  vat_rate_bp: number;
  detailed: boolean;
  manual_price_cents: number | null;
  source: "devis" | "manuel";
  /** Prix courant enregistré (appels d'offres, ADR 0294). */
  price_cents?: number | null;
};

export type LibraryWork = WorkRow & { components: ComponentRow[]; pricing: WorkPricing };

export type Library = {
  settings: LibrarySettings;
  seededCount: number | null;
  supplies: SupplyRow[];
  works: LibraryWork[];
};

const toComponent = (c: ComponentRow): WorkComponent => ({
  kind: c.kind,
  supplyId: c.supply_id,
  quantityMilli: c.quantity_milli,
  costCents: c.cost_cents,
});

export function supplyMap(supplies: readonly SupplyRow[]): Map<string, LibrarySupply> {
  return new Map(
    supplies.map((s) => [
      s.id,
      { id: s.id, purchasePriceCents: s.purchase_price_cents, wasteBp: s.waste_bp },
    ]),
  );
}

/**
 * Bibliothèque de l'entreprise (lecture : RLS, patron et chef d'équipe). Remplie une seule fois
 * avec les anciens devis à la première ouverture ; prix et marges calculés par packages/core.
 */
export async function loadLibrary(
  supabase: Client,
  { seed = true }: { seed?: boolean } = {},
): Promise<Library> {
  // Remplissage initial (sans effet après la première fois).
  const { data: seeded } = seed ? await supabase.rpc("artisan_seed_library") : { data: null };
  const [{ data: settings }, { data: supplies }, { data: works }, { data: components }] =
    await Promise.all([
      supabase
        .from("artisan_pricing_settings")
        .select(
          "hour_cost_cents, hour_price_cents, supply_coef_bp, margin_alert_bp, price_max_age_months",
        )
        .maybeSingle(),
      supabase
        .from("artisan_supplies")
        .select(
          "id, designation, reference, supplier, unit, purchase_price_cents, price_on, waste_bp",
        )
        .order("designation")
        .limit(2000),
      supabase
        .from("artisan_works")
        .select(
          "id, designation, description, unit, line_type, vat_rate_bp, detailed, manual_price_cents, source, price_cents",
        )
        .order("designation")
        .limit(2000),
      supabase
        .from("artisan_work_components")
        .select("work_id, position, kind, supply_id, label, quantity_milli, cost_cents")
        .order("position")
        .limit(20000),
    ]);
  const libSettings: LibrarySettings = settings
    ? {
        hourCostCents: settings.hour_cost_cents,
        hourPriceCents: settings.hour_price_cents,
        supplyCoefBp: settings.supply_coef_bp,
        marginAlertBp: settings.margin_alert_bp,
        priceMaxAgeMonths: settings.price_max_age_months,
      }
    : DEFAULT_LIBRARY_SETTINGS;
  const supplyRows = (supplies ?? []) as SupplyRow[];
  const bySupply = supplyMap(supplyRows);
  const byWork = new Map<string, ComponentRow[]>();
  for (const c of (components ?? []) as ComponentRow[]) {
    byWork.set(c.work_id, [...(byWork.get(c.work_id) ?? []), c]);
  }
  return {
    settings: libSettings,
    seededCount: typeof seeded === "number" && seeded > 0 ? seeded : null,
    supplies: supplyRows,
    works: ((works ?? []) as WorkRow[]).map((w) => {
      const parts = byWork.get(w.id) ?? [];
      return {
        ...w,
        components: parts,
        pricing: workPricing(w.manual_price_cents, parts.map(toComponent), libSettings, bySupply),
      };
    }),
  };
}

/**
 * Prix courant de chaque ouvrage (fixé à la main ou calculé), enregistré pour les appels d'offres
 * (ADR 0294) : après un changement d'ouvrage, de réglage ou de fourniture.
 */
export async function refreshWorkPrices(supabase: Client): Promise<void> {
  const library = await loadLibrary(supabase, { seed: false });
  const changed = library.works
    .filter((w) => (w.price_cents ?? null) !== w.pricing.priceCents)
    .map((w) => ({ id: w.id, priceCents: w.pricing.priceCents }));
  if (changed.length) await supabase.rpc("artisan_set_work_prices", { p_prices: changed });
}

/** Seuil d'alerte de marge réglé par l'entreprise (null : pas d'alerte). */
export async function marginAlertBp(supabase: Client): Promise<number | null> {
  const { data } = await supabase
    .from("artisan_pricing_settings")
    .select("margin_alert_bp")
    .maybeSingle();
  return data?.margin_alert_bp ?? null;
}

/** Coût privé des lignes d'un devis, par position (ADR 0294). */
export async function quoteLineCosts(
  supabase: Client,
  quoteId: string,
): Promise<Map<number, { unitCostCents: number; workId: string | null }>> {
  const { data } = await supabase
    .from("quote_line_costs")
    .select("position, unit_cost_cents, work_id")
    .eq("quote_id", quoteId);
  return new Map(
    (data ?? []).map((c) => [c.position, { unitCostCents: c.unit_cost_cents, workId: c.work_id }]),
  );
}

/** Marge d'un devis enregistré, sur les lignes dont le coût est connu. */
export async function savedQuoteMargin(supabase: Client, quoteId: string) {
  const [{ data: lines }, costs] = await Promise.all([
    supabase
      .from("quote_lines")
      .select("position, quantity_milli, total_ht_cents")
      .eq("quote_id", quoteId),
    quoteLineCosts(supabase, quoteId),
  ]);
  return quoteMargin(
    (lines ?? []).map((l) => ({
      totalHtCents: l.total_ht_cents,
      costCents: lineCostCents(costs.get(l.position)?.unitCostCents ?? null, l.quantity_milli),
    })),
  );
}
