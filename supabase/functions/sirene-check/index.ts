// Edge Function sirene-check (F-14) : vérifie le SIRET de l'artisan connecté auprès de
// l'API Sirene (INSEE) et enregistre le résultat sur sa fiche, puis lit ses qualifications RGE
// dans l'annuaire de l'ADEME (ADR 0118).
// Aucune donnée personnelle dans les journaux (CLAUDE.md règle 11).
import { createClient } from "@supabase/supabase-js";
import { isValidSiret } from "../../../packages/core/src/siret.ts";
import { parseSireneEtablissement } from "../../../packages/core/src/sirene.ts";
import { refreshRge } from "../_shared/rge.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const INSEE_API_BASE_URL =
  Deno.env.get("INSEE_API_BASE_URL") || "https://api.insee.fr/api-sirene/3.11";
const INSEE_API_KEY = Deno.env.get("INSEE_API_KEY") ?? "";

/** Quota INSEE : 30 requêtes/minute pour toute l'application ; limite par compte. */
const MAX_CHECKS_PER_HOUR = 10;
const ARTISAN_ROLES = new Set(["artisan_en_attente", "artisan"]);

export type SireneCheckResponse =
  | { status: "ok" | "inactive" }
  | { status: "not_found" | "siret_missing" | "rate_limited" | "unavailable" | "forbidden" };

function respond(body: SireneCheckResponse, httpStatus = 200): Response {
  return new Response(JSON.stringify(body), {
    status: httpStatus,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });

  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return respond({ status: "forbidden" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user || !ARTISAN_ROLES.has(String(user.app_metadata?.role))) {
    return respond({ status: "forbidden" }, 403);
  }

  const { data: allowed } = await admin.rpc("consume_rate_limit", {
    p_key: `sirene-check:${user.id}`,
    p_max: MAX_CHECKS_PER_HOUR,
    p_window_seconds: 3600,
  });
  if (allowed !== true) return respond({ status: "rate_limited" }, 429);

  const { data: artisan } = await admin
    .from("artisans")
    .select("id, siret")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!artisan?.siret || !isValidSiret(artisan.siret))
    return respond({ status: "siret_missing" }, 400);

  if (!INSEE_API_KEY) {
    console.error("sirene-check : INSEE_API_KEY absente");
    return respond({ status: "unavailable" }, 503);
  }

  let res: Response;
  try {
    res = await fetch(`${INSEE_API_BASE_URL}/siret/${artisan.siret}`, {
      headers: { "X-INSEE-Api-Key-Integration": INSEE_API_KEY, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    console.error(
      "sirene-check : API Sirene injoignable",
      error instanceof Error ? error.name : "",
    );
    return respond({ status: "unavailable" }, 503);
  }

  if (res.status === 404) return respond({ status: "not_found" });
  if (!res.ok) {
    console.error(`sirene-check : réponse Sirene ${res.status}`);
    return respond({ status: "unavailable" }, 503);
  }

  const result = parseSireneEtablissement(await res.json());
  if (!result || result.siret !== artisan.siret) {
    console.error("sirene-check : réponse Sirene inexploitable");
    return respond({ status: "unavailable" }, 503);
  }

  const { error: recordError } = await admin.rpc("record_sirene_result", {
    p_artisan_id: artisan.id,
    p_siret: artisan.siret,
    p_result: result,
  });
  if (recordError) {
    console.error(`sirene-check : enregistrement impossible (${recordError.code})`);
    return respond({ status: "unavailable" }, 503);
  }

  // Qualifications RGE du même SIRET (ADR 0118) : sans effet sur la réponse si l'annuaire ne
  // répond pas ; la lecture quotidienne ou « Actualiser » prendront le relais.
  if (result.active) await refreshRge(admin, artisan.id, artisan.siret);

  return respond({ status: result.active ? "ok" : "inactive" });
});
