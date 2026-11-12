import "server-only";
import {
  DEFAULT_LIBRARY_SETTINGS,
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
  purchase_price_cents: number;
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
export async function loadLibrary(supabase: Client): Promise<Library> {
  // Remplissage initial (sans effet après la première fois).
  const { data: seeded } = await supabase.rpc("artisan_seed_library");
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
          "id, designation, description, unit, line_type, vat_rate_bp, detailed, manual_price_cents, source",
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
