// Edge Function rge-check (ADR 0118) : relit l'annuaire RGE de l'ADEME pour le SIRET d'un artisan.
// - L'artisan connecté, pour sa fiche (« Actualiser ») ;
// - un admin avec double authentification, pour un artisan donné (« Revérifier le RGE ») ;
// - la base, chaque jour (pg_cron + pg_net, secret partagé de notify) : les fiches lues il y a
//   plus d'une semaine, par lots.
// Aucune donnée personnelle dans les journaux (CLAUDE.md règle 11).
import { isValidSiret } from "../../../packages/core/src/siret.ts";
import { adminClient } from "../_shared/artisan.ts";
import { env } from "../_shared/env.ts";
import { refreshRge } from "../_shared/rge.ts";

const MAX_CHECKS_PER_HOUR = 10;
const BATCH_SIZE = 100;
const BATCH_CONCURRENCY = 4;
const ARTISAN_ROLES = new Set(["artisan_en_attente", "artisan"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RgeCheckResponse =
  | { status: "ok"; count: number }
  | { status: "batch"; refreshed: number; failed: number }
  | { status: "siret_missing" | "rate_limited" | "unavailable" | "forbidden" };

function respond(body: RgeCheckResponse, httpStatus = 200): Response {
  return new Response(JSON.stringify(body), {
    status: httpStatus,
    headers: { "Content-Type": "application/json" },
  });
}

/** Comparaison à temps constant du secret partagé. */
function sameSecret(received: string, expected: string): boolean {
  const a = new TextEncoder().encode(received);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

/** Niveau d'authentification du jeton (déjà vérifié par Supabase Auth). */
function tokenAal(token: string): string | null {
  try {
    const part = (token.split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, "=")));
    return typeof payload?.aal === "string" ? payload.aal : null;
  } catch {
    return null;
  }
}

async function batch(admin: ReturnType<typeof adminClient>): Promise<Response> {
  const { data, error } = await admin.rpc("rge_refresh_candidates", { p_limit: BATCH_SIZE });
  if (error) {
    console.error(`rge-check : liste des fiches impossible (${error.code})`);
    return respond({ status: "unavailable" }, 503);
  }
  const queue = [...((data ?? []) as { artisan_id: string; siret: string }[])];
  let refreshed = 0;
  let failed = 0;
  await Promise.all(
    Array.from({ length: BATCH_CONCURRENCY }, async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        const result = await refreshRge(admin, next.artisan_id, next.siret);
        if (result.status === "ok") refreshed++;
        else failed++;
      }
    }),
  );
  return respond({ status: "batch", refreshed, failed });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const admin = adminClient();

  const secret = env("NOTIFY_SECRET");
  const received = req.headers.get("x-menao-secret");
  if (received !== null) {
    if (!secret || !sameSecret(received, secret)) return respond({ status: "forbidden" }, 401);
    return batch(admin);
  }

  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return respond({ status: "forbidden" }, 401);
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return respond({ status: "forbidden" }, 401);

  const role = String(user.app_metadata?.role);
  const body = (await req.json().catch(() => ({}))) as { artisanId?: unknown };
  let query = admin.from("artisans").select("id, siret");
  if (ARTISAN_ROLES.has(role)) {
    query = query.eq("user_id", user.id);
  } else if (
    role === "admin" &&
    tokenAal(token) === "aal2" &&
    typeof body.artisanId === "string" &&
    UUID.test(body.artisanId)
  ) {
    query = query.eq("id", body.artisanId);
  } else {
    return respond({ status: "forbidden" }, 403);
  }

  const { data: allowed } = await admin.rpc("consume_rate_limit", {
    p_key: `rge-check:${user.id}`,
    p_max: MAX_CHECKS_PER_HOUR,
    p_window_seconds: 3600,
  });
  if (allowed !== true) return respond({ status: "rate_limited" }, 429);

  const { data: artisan } = await query.maybeSingle();
  if (!artisan?.siret || !isValidSiret(artisan.siret)) {
    return respond({ status: "siret_missing" }, 400);
  }
  const result = await refreshRge(admin, artisan.id, artisan.siret);
  return result.status === "ok"
    ? respond({ status: "ok", count: result.count })
    : respond({ status: "unavailable" }, 503);
});
