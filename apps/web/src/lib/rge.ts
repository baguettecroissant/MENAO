import "server-only";
import { FunctionsHttpError, type SupabaseClient } from "@supabase/supabase-js";

export const RGE_REFRESH_STATUSES = ["ok", "rate_limited", "siret_missing", "unavailable"] as const;
export type RgeRefreshStatus = (typeof RGE_REFRESH_STATUSES)[number];

/**
 * Nouvelle lecture de l'annuaire RGE de l'ADEME (Edge Function rge-check, ADR 0118), avec la
 * session de l'appelant : l'artisan pour sa fiche, ou un admin pour un artisan donné.
 */
export async function invokeRgeCheck(
  supabase: SupabaseClient,
  body: { artisanId?: string } = {},
): Promise<RgeRefreshStatus> {
  const { data, error } = await supabase.functions.invoke<{ status: string }>("rge-check", {
    method: "POST",
    body,
  });
  let status = data?.status;
  if (error instanceof FunctionsHttpError) {
    const failure = (await error.context.json().catch(() => null)) as { status?: string } | null;
    status = failure?.status;
  } else if (error) {
    status = undefined;
  }
  return (RGE_REFRESH_STATUSES as readonly string[]).includes(status ?? "")
    ? (status as RgeRefreshStatus)
    : "unavailable";
}
