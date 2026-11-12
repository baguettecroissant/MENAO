import { parsePlanUsage } from "@menao/core";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/** Limite de métiers lue dans `plans.limites` (ADR 0290) ; null : illimité ou illisible. */
export function baseTradesLimit(limites: unknown): number | null {
  const value =
    limites && typeof limites === "object" ? (limites as Record<string, unknown>).metiers : null;
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

/** Usage de sa formule par l'entreprise connectée (my_plan_usage, ADR 0290). */
export async function planUsage(supabase: Client) {
  const { data } = await supabase.rpc("my_plan_usage");
  return parsePlanUsage(data);
}
