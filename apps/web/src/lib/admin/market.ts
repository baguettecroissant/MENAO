import type { MarketArtisan, MarketDemand } from "@menao/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@menao/db";

/** Périodes de la demande proposées sur la page Marché (jours). */
export const MARKET_PERIODS = [30, 90, 365] as const;
export type MarketPeriod = (typeof MARKET_PERIODS)[number];

export function parseMarketPeriod(value: unknown): MarketPeriod {
  const days = Number(value);
  return MARKET_PERIODS.find((p) => p === days) ?? 90;
}

export type Market = {
  artisans: MarketArtisan[];
  demand: MarketDemand[];
  withoutCommune: number;
  trades: { code: string; label: string }[];
};

/**
 * Données de la carte du marché (ADR 0181) : artisans placés, demande par commune et par métier
 * (admin_market, réservé aux administrateurs) et noms des métiers.
 */
export async function getMarket(
  supabase: SupabaseClient<Database>,
  days: MarketPeriod,
): Promise<Market> {
  const [{ data, error }, { data: trades }] = await Promise.all([
    supabase.rpc("admin_market", { p_days: days }),
    supabase.from("trades").select("code, label").order("sort_order"),
  ]);
  if (error) throw error;
  const market = (data ?? {}) as {
    artisans?: MarketArtisan[];
    demande?: MarketDemand[];
    sans_commune?: number;
  };
  return {
    artisans: market.artisans ?? [],
    demand: market.demande ?? [],
    withoutCommune: market.sans_commune ?? 0,
    trades: trades ?? [],
  };
}
