import {
  DEFAULT_LIBRARY_SETTINGS,
  isExampleId,
  type LibraryQuoteLine,
  type LibrarySettings,
  type LibrarySupply,
  type WorkPricing,
  workPricing,
  workQuoteLines,
} from "@menao/core";
import { fr } from "@/i18n/fr";
import { supabase } from "./supabase";

/** Coût privé d'une ligne de devis (bibliothèque d'ouvrages, ADR 0294) : jamais montré au client. */
export type LineCost = { unitCostCents: number | null; workId: string | null };

export type AppWork = {
  id: string;
  designation: string;
  unit: string;
  detailed: boolean;
  composed: boolean;
  source: "devis" | "manuel";
  pricing: WorkPricing;
  lines: LibraryQuoteLine[];
};

export type AppLibrary = { settings: LibrarySettings; works: AppWork[]; seeded: number | null };

const plain = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Bibliothèque de l'entreprise (F-141, ADR 0293, 0294), comme sur le site : ouvrages, prix et
 * marges calculés par @menao/core (RLS : patron et chef d'équipe). `seed` : remplissage initial
 * avec les anciens devis, une seule fois.
 */
export async function loadLibrary({
  seed = false,
}: { seed?: boolean } = {}): Promise<AppLibrary | null> {
  const { data: seeded } = seed ? await supabase.rpc("artisan_seed_library") : { data: null };
  const [settingsRes, suppliesRes, worksRes, componentsRes] = await Promise.all([
    supabase
      .from("artisan_pricing_settings")
      .select(
        "hour_cost_cents, hour_price_cents, supply_coef_bp, margin_alert_bp, price_max_age_months",
      )
      .maybeSingle(),
    supabase.from("artisan_supplies").select("id, purchase_price_cents, waste_bp").limit(2000),
    supabase
      .from("artisan_works")
      .select(
        "id, designation, description, unit, line_type, vat_rate_bp, detailed, manual_price_cents, source",
      )
      .order("designation")
      .limit(2000),
    supabase
      .from("artisan_work_components")
      .select("work_id, kind, supply_id, quantity_milli, cost_cents")
      .order("position")
      .limit(20000),
  ]);
  if (worksRes.error) return null;
  const s = settingsRes.data;
  const settings: LibrarySettings = s
    ? {
        hourCostCents: s.hour_cost_cents,
        hourPriceCents: s.hour_price_cents,
        supplyCoefBp: s.supply_coef_bp,
        marginAlertBp: s.margin_alert_bp,
        priceMaxAgeMonths: s.price_max_age_months,
      }
    : DEFAULT_LIBRARY_SETTINGS;
  const supplies = new Map<string, LibrarySupply>(
    (suppliesRes.data ?? []).map((x) => [
      x.id,
      { id: x.id, purchasePriceCents: x.purchase_price_cents, wasteBp: x.waste_bp },
    ]),
  );
  const byWork = new Map<string, NonNullable<typeof componentsRes.data>>();
  for (const c of componentsRes.data ?? []) {
    byWork.set(c.work_id, [...(byWork.get(c.work_id) ?? []), c]);
  }
  const labels = {
    supplies: fr.proQuote.library.suppliesSuffix,
    labor: fr.proQuote.library.laborSuffix,
  };
  return {
    settings,
    seeded: typeof seeded === "number" && seeded > 0 ? seeded : null,
    works: (worksRes.data ?? []).map((w) => {
      const parts = byWork.get(w.id) ?? [];
      const pricing = workPricing(
        w.manual_price_cents,
        parts.map((c) => ({
          kind: c.kind as "fourniture" | "heures" | "frais",
          supplyId: c.supply_id,
          quantityMilli: c.quantity_milli,
          costCents: c.cost_cents,
        })),
        settings,
        supplies,
      );
      return {
        id: w.id,
        designation: w.designation,
        unit: w.unit,
        detailed: w.detailed,
        composed: parts.length > 0,
        source: w.source as "devis" | "manuel",
        pricing,
        lines: workQuoteLines(
          {
            id: w.id,
            designation: w.designation,
            description: w.description,
            unit: w.unit,
            lineType: w.line_type,
            vatRateBp: w.vat_rate_bp,
            detailed: w.detailed,
          },
          pricing,
          labels,
        ),
      };
    }),
  };
}

/** Ouvrages dont la désignation contient tous les mots cherchés. */
export function filterWorks(works: readonly AppWork[], query: string): AppWork[] {
  const words = plain(query.slice(0, 100)).split(/\s+/).filter(Boolean);
  return works.filter((w) => words.every((word) => plain(w.designation).includes(word)));
}

/** « Rechercher l'article » : ouvrages de la bibliothèque qui ont un prix (6 au plus). */
export async function searchLibrary(query: string): Promise<AppWork[]> {
  const library = await loadLibrary();
  if (!library) return [];
  return filterWorks(library.works, query)
    .filter((w) => w.lines.length > 0)
    .slice(0, 6);
}

/** Coûts privés des lignes du brouillon, dans l'ordre des positions, et seuil d'alerte. */
export async function loadQuoteCosts(
  quoteId: string | null,
  positions: readonly number[],
): Promise<{ costs: (LineCost | null)[]; alertBp: number | null }> {
  if (!quoteId || isExampleId(quoteId)) return { costs: positions.map(() => null), alertBp: null };
  const [{ data: costs }, { data: settings }] = await Promise.all([
    supabase
      .from("quote_line_costs")
      .select("position, unit_cost_cents, work_id")
      .eq("quote_id", quoteId),
    supabase.from("artisan_pricing_settings").select("margin_alert_bp").maybeSingle(),
  ]);
  const byPosition = new Map(
    (costs ?? []).map((c) => [c.position, { unitCostCents: c.unit_cost_cents, workId: c.work_id }]),
  );
  return {
    costs: positions.map((p) => byPosition.get(p) ?? null),
    alertBp: settings?.margin_alert_bp ?? null,
  };
}
