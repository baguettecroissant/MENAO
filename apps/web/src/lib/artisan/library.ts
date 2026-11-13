import "server-only";
import {
  DEFAULT_LIBRARY_SETTINGS,
  lineCostCents,
  quoteMargin,
  type ComponentKind,
  type LibrarySettings,
  type LibrarySupply,
  type PricePick,
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
  /** Fourniture copiée de la bibliothèque MENAO (F-147). */
  menao_supply_id?: string | null;
  /** Prix publics HT de la fourniture MENAO liée, quand une source est branchée (F-147). */
  public_range?: PublicRange | null;
};

/** Fourchette de prix publics d'une fourniture MENAO : HT, source et date du relevé. */
export type PublicRange = {
  minCents: number;
  maxCents: number;
  source: string | null;
  on: string | null;
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
  source: "devis" | "manuel" | "menao";
  /** Prix courant enregistré (appels d'offres, ADR 0294). */
  price_cents?: number | null;
  /** Prix retenu dans la fourchette indicative (F-147). */
  price_pick?: PricePick;
  /** Métier de l'ouvrage MENAO d'origine (F-147). */
  trade_code?: string | null;
};

export type LibraryWork = WorkRow & { components: ComponentRow[]; pricing: WorkPricing };

export type Library = {
  settings: LibrarySettings;
  /** Premier passage fait : bibliothèque MENAO adoptée ou autre choix (F-147). */
  onboarded: boolean;
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
      {
        id: s.id,
        purchasePriceCents: s.purchase_price_cents,
        wasteBp: s.waste_bp,
        publicRange: s.public_range
          ? { minCents: s.public_range.minCents, maxCents: s.public_range.maxCents }
          : null,
      },
    ]),
  );
}

type MenaoSupplyJoin = {
  price_min_cents: number | null;
  price_max_cents: number | null;
  price_source: string | null;
  price_on: string | null;
} | null;

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
          "hour_cost_cents, hour_price_cents, supply_coef_bp, margin_alert_bp, price_max_age_months, library_onboarded_at",
        )
        .maybeSingle(),
      supabase
        .from("artisan_supplies")
        .select(
          "id, designation, reference, supplier, unit, purchase_price_cents, price_on, waste_bp, menao_supply_id, menao_supplies(price_min_cents, price_max_cents, price_source, price_on)",
        )
        .order("designation")
        .limit(2000),
      supabase
        .from("artisan_works")
        .select(
          "id, designation, description, unit, line_type, vat_rate_bp, detailed, manual_price_cents, source, price_cents, price_pick, menao_works(trade_code)",
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
  const supplyRows: SupplyRow[] = (supplies ?? []).map(({ menao_supplies, ...s }) => {
    const m = menao_supplies as MenaoSupplyJoin;
    return {
      ...s,
      unit: s.unit as QuoteUnit,
      public_range:
        m && m.price_min_cents !== null && m.price_max_cents !== null
          ? {
              minCents: m.price_min_cents,
              maxCents: m.price_max_cents,
              source: m.price_source,
              on: m.price_on,
            }
          : null,
    };
  });
  const bySupply = supplyMap(supplyRows);
  const byWork = new Map<string, ComponentRow[]>();
  for (const c of (components ?? []) as ComponentRow[]) {
    byWork.set(c.work_id, [...(byWork.get(c.work_id) ?? []), c]);
  }
  return {
    settings: libSettings,
    onboarded: Boolean(settings?.library_onboarded_at),
    seededCount: typeof seeded === "number" && seeded > 0 ? seeded : null,
    supplies: supplyRows,
    works: (works ?? []).map(({ menao_works, ...row }) => {
      const w = {
        ...row,
        trade_code: (menao_works as { trade_code: string } | null)?.trade_code ?? null,
      } as WorkRow;
      const parts = byWork.get(w.id) ?? [];
      return {
        ...w,
        components: parts,
        pricing: workPricing(
          w.manual_price_cents,
          parts.map(toComponent),
          libSettings,
          bySupply,
          w.price_pick ?? "milieu",
        ),
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

/** Libellés des métiers (table publique des métiers actifs), dans l'ordre d'affichage. */
export async function tradeLabels(supabase: Client): Promise<{ code: string; label: string }[]> {
  const { data } = await supabase
    .from("trades")
    .select("code, label")
    .eq("active", true)
    .order("sort_order");
  return data ?? [];
}

/**
 * Métiers du catalogue MENAO pour le premier passage (F-147) : nombre d'ouvrages par métier, et
 * ceux de la fiche de l'entreprise cochés d'avance.
 */
export async function loadMenaoTrades(
  supabase: Client,
  artisanId: string,
): Promise<{ code: string; label: string; count: number; mine: boolean }[]> {
  const [{ data: works }, { data: mine }, labels] = await Promise.all([
    supabase.from("menao_works").select("trade_code").eq("active", true).limit(5000),
    supabase.from("artisan_trades").select("trade_code").eq("artisan_id", artisanId),
    tradeLabels(supabase),
  ]);
  const counts = new Map<string, number>();
  for (const w of works ?? []) counts.set(w.trade_code, (counts.get(w.trade_code) ?? 0) + 1);
  const own = new Set((mine ?? []).map((m) => m.trade_code));
  return labels
    .filter((l) => counts.has(l.code))
    .map((l) => ({ ...l, count: counts.get(l.code) ?? 0, mine: own.has(l.code) }));
}
