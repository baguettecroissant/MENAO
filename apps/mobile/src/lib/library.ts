import {
  DEFAULT_LIBRARY_SETTINGS,
  isExampleId,
  type LibraryQuoteLine,
  type LibrarySettings,
  type LibrarySupply,
  type PriceRange,
  type PricePick,
  type WorkPricing,
  workPricing,
  workQuoteLines,
} from "@menao/core";
import { fr } from "@/i18n/fr";
import { supabase } from "./supabase";
import { myArtisanKey } from "./team";

/** Coût privé d'une ligne de devis (bibliothèque d'ouvrages, ADR 0294) : jamais montré au client. */
export type LineCost = { unitCostCents: number | null; workId: string | null };

export type AppWork = {
  id: string;
  designation: string;
  unit: string;
  detailed: boolean;
  composed: boolean;
  source: "devis" | "manuel" | "menao";
  /** Métier de l'ouvrage MENAO d'origine (F-147). */
  tradeCode: string | null;
  pricing: WorkPricing;
  /** Fourchette indicative quand le prix en découle (ni prix à la main, ni prix d'achat complets). */
  range: PriceRange | null;
  lines: LibraryQuoteLine[];
};

export type AppLibrary = {
  settings: LibrarySettings;
  /** Premier passage fait : bibliothèque MENAO adoptée ou autre choix (F-147). */
  onboarded: boolean;
  works: AppWork[];
  seeded: number | null;
  /** Libellés des métiers MENAO présents dans la bibliothèque. */
  trades: { code: string; label: string }[];
  /** Date du relevé de prix publics le plus récent (fournitures MENAO). */
  publicPricesOn: string | null;
};

type MenaoSupplyJoin = {
  price_min_cents: number | null;
  price_max_cents: number | null;
  price_on: string | null;
} | null;

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
        "hour_cost_cents, hour_price_cents, supply_coef_bp, margin_alert_bp, price_max_age_months, library_onboarded_at",
      )
      .maybeSingle(),
    supabase
      .from("artisan_supplies")
      .select(
        "id, purchase_price_cents, waste_bp, menao_supplies(price_min_cents, price_max_cents, price_on)",
      )
      .limit(2000),
    supabase
      .from("artisan_works")
      .select(
        "id, designation, description, unit, line_type, vat_rate_bp, detailed, manual_price_cents, source, price_pick, menao_works(trade_code)",
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
  const publicDates: string[] = [];
  const supplies = new Map<string, LibrarySupply>(
    (suppliesRes.data ?? []).map((x) => {
      const m = x.menao_supplies as MenaoSupplyJoin;
      const ranged = m && m.price_min_cents !== null && m.price_max_cents !== null;
      if (ranged && m.price_on) publicDates.push(m.price_on);
      return [
        x.id,
        {
          id: x.id,
          purchasePriceCents: x.purchase_price_cents,
          wasteBp: x.waste_bp,
          publicRange: ranged
            ? { minCents: m.price_min_cents ?? 0, maxCents: m.price_max_cents ?? 0 }
            : null,
        },
      ];
    }),
  );
  const byWork = new Map<string, NonNullable<typeof componentsRes.data>>();
  for (const c of componentsRes.data ?? []) {
    byWork.set(c.work_id, [...(byWork.get(c.work_id) ?? []), c]);
  }
  const labels = {
    supplies: fr.proQuote.library.suppliesSuffix,
    labor: fr.proQuote.library.laborSuffix,
  };
  const works = (worksRes.data ?? []).map((w): AppWork => {
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
      (w.price_pick ?? "milieu") as PricePick,
    );
    const range =
      w.manual_price_cents === null &&
      pricing.computedPriceCents === null &&
      pricing.range !== null &&
      pricing.range.lowCents !== pricing.range.highCents
        ? pricing.range
        : null;
    return {
      id: w.id,
      designation: w.designation,
      unit: w.unit,
      detailed: w.detailed,
      composed: parts.length > 0,
      source: w.source as AppWork["source"],
      tradeCode: (w.menao_works as { trade_code: string } | null)?.trade_code ?? null,
      pricing,
      range,
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
  });
  const codes = new Set(works.map((w) => w.tradeCode).filter(Boolean));
  const trades = codes.size ? await tradeLabels() : [];
  return {
    settings,
    onboarded: Boolean(s?.library_onboarded_at),
    seeded: typeof seeded === "number" && seeded > 0 ? seeded : null,
    works,
    trades: trades.filter((tr) => codes.has(tr.code)),
    publicPricesOn: works.some((w) => w.range) ? (publicDates.sort().at(-1) ?? null) : null,
  };
}

/** Libellés des métiers actifs, dans l'ordre d'affichage. */
async function tradeLabels(): Promise<{ code: string; label: string }[]> {
  const { data } = await supabase
    .from("trades")
    .select("code, label")
    .eq("active", true)
    .order("sort_order");
  return data ?? [];
}

export type StartTrade = { code: string; label: string; count: number; mine: boolean };

/**
 * Premier passage (F-147) : métiers du catalogue MENAO, avec leur nombre d'ouvrages, ceux de la
 * fiche de l'entreprise cochés d'avance.
 */
export async function loadMenaoTrades(): Promise<StartTrade[]> {
  const artisanId = await myArtisanKey();
  const [{ data: works }, { data: mine }, labels] = await Promise.all([
    supabase.from("menao_works").select("trade_code").eq("active", true).limit(5000),
    supabase.from("artisan_trades").select("trade_code").eq("artisan_id", artisanId),
    tradeLabels(),
  ]);
  const counts = new Map<string, number>();
  for (const w of works ?? []) counts.set(w.trade_code, (counts.get(w.trade_code) ?? 0) + 1);
  const own = new Set((mine ?? []).map((m) => m.trade_code));
  return labels
    .filter((l) => counts.has(l.code))
    .map((l) => ({ ...l, count: counts.get(l.code) ?? 0, mine: own.has(l.code) }));
}

/**
 * Premier passage (F-147, ADR 0307) : prix de l'heure et coefficient, puis copie de la
 * bibliothèque MENAO des métiers choisis, ou départ depuis les devis. Rend le nombre d'ouvrages
 * copiés, ou un message d'erreur.
 */
export async function startLibrary(input: {
  choice: "menao" | "devis";
  trades: string[];
  hourPriceCents: number | null;
  coefBp: number;
}): Promise<{ ok: true; added: number } | { ok: false; error: string }> {
  const t = fr.proLibrary.start;
  const artisanId = await myArtisanKey();
  const { error: settingsError } = await supabase.from("artisan_pricing_settings").upsert({
    artisan_id: artisanId,
    supply_coef_bp: input.coefBp,
    ...(input.hourPriceCents === null ? {} : { hour_price_cents: input.hourPriceCents }),
  });
  if (settingsError) return { ok: false, error: t.error };
  if (input.choice === "devis") {
    const { error } = await supabase.rpc("artisan_dismiss_menao_library");
    return error ? { ok: false, error: t.error } : { ok: true, added: 0 };
  }
  const { data, error } = await supabase.rpc("artisan_adopt_menao_library", {
    p_trade_codes: input.trades,
  });
  if (error) return { ok: false, error: error.code === "22023" ? error.message : t.error };
  return { ok: true, added: data ?? 0 };
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
