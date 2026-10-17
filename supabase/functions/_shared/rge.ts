// Lecture de l'annuaire RGE de l'ADEME pour un artisan (ADR 0118), partagée par sirene-check et
// rge-check : requête par SIRET, lecture contrôlée (packages/core), enregistrement en base.
// Aucune donnée personnelle dans les journaux (CLAUDE.md règle 11).
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseRgeLines,
  RGE_DATASET_LINES_URL,
  rgeLinesUrl,
} from "../../../packages/core/src/rge.ts";
import { env } from "./env.ts";

export type RgeRefreshResult = { status: "ok"; count: number } | { status: "unavailable" };

/** Lit l'annuaire pour ce SIRET et remplace les qualifications enregistrées de l'artisan. */
export async function refreshRge(
  admin: SupabaseClient,
  artisanId: string,
  siret: string,
): Promise<RgeRefreshResult> {
  let res: Response;
  try {
    res = await fetch(rgeLinesUrl(siret, env("RGE_API_BASE_URL") || RGE_DATASET_LINES_URL), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    console.error("rge : annuaire injoignable", error instanceof Error ? error.name : "");
    return { status: "unavailable" };
  }
  if (!res.ok) {
    console.error(`rge : réponse de l'annuaire ${res.status}`);
    return { status: "unavailable" };
  }
  const rows = parseRgeLines(await res.json().catch(() => null), siret);
  if (!rows) {
    console.error("rge : réponse de l'annuaire inexploitable");
    return { status: "unavailable" };
  }
  const { data, error } = await admin.rpc("record_rge_qualifications", {
    p_artisan_id: artisanId,
    p_rows: rows,
  });
  if (error) {
    console.error(`rge : enregistrement impossible (${error.code})`);
    return { status: "unavailable" };
  }
  return { status: "ok", count: typeof data === "number" ? data : rows.length };
}
