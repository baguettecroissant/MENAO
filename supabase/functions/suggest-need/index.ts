// Edge Function suggest-need (F-05, ADR 0177) : pendant que le particulier écrit sa demande, la
// suite de sa phrase et des idées pour la préciser. Appelée directement par le navigateur et
// l'application, sans session (le visiteur n'a pas encore de compte) : limites par adresse IP et
// limite globale. E-mails et téléphones retirés avant l'envoi au modèle ; rien n'est conservé,
// sauf les métriques de l'appel (ai_runs).
import {
  SUGGESTION_MAX_LENGTH,
  SUGGESTION_MIN_LENGTH,
} from "../../../packages/core/src/need-suggestion.ts";
import { scrubPersonalData } from "../../../packages/core/src/project.ts";
import { llmConfig, logAiRuns, sha256, clientIp, type AiRun } from "../_shared/ai.ts";
import { adminClient, json } from "../_shared/artisan.ts";
import { withCors } from "../_shared/cors.ts";
import { env } from "../_shared/env.ts";
import { suggestNeed, type Trade } from "./suggestion.ts";

/** Une recherche demande quelques suggestions ; large marge pour un foyer ou un bureau. */
const MAX_PER_IP_PER_HOUR = 150;
/** Plafond de dépense, tous visiteurs confondus. */
const MAX_PER_HOUR = 3000;

/** Métiers actifs, relus au plus toutes les 10 minutes (une instance sert plusieurs appels). */
const TRADES_TTL_MS = 10 * 60_000;
let tradesCache: { at: number; trades: Trade[] } | null = null;
async function activeTrades(admin: ReturnType<typeof adminClient>): Promise<Trade[]> {
  if (tradesCache && Date.now() - tradesCache.at < TRADES_TTL_MS) return tradesCache.trades;
  const { data } = await admin
    .from("trades")
    .select("code, label")
    .eq("active", true)
    .order("sort_order");
  const trades = (data ?? []) as Trade[];
  if (trades.length) tradesCache = { at: Date.now(), trades };
  return trades;
}

/** Tâche terminée après la réponse (Supabase Edge Runtime) ; attendue ailleurs (tests). */
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void } | undefined;
function afterResponse(task: Promise<unknown>): Promise<unknown> | undefined {
  if (typeof EdgeRuntime === "undefined") return task;
  EdgeRuntime.waitUntil(task);
}

/** Les deux limites en même temps : une seule attente de la base avant l'appel au modèle. */
async function withinLimits(admin: ReturnType<typeof adminClient>, req: Request) {
  const ipHash = (await sha256(clientIp(req))).slice(0, 32);
  const results = await Promise.all(
    (
      [
        [`suggest-need:ip:${ipHash}`, MAX_PER_IP_PER_HOUR],
        ["suggest-need:all", MAX_PER_HOUR],
      ] as const
    ).map(([key, max]) =>
      admin.rpc("consume_rate_limit", { p_key: key, p_max: max, p_window_seconds: 3600 }),
    ),
  );
  return results.every(({ data }) => data === true);
}

Deno.serve(
  withCors(async (req) => {
    if (req.method !== "POST") return new Response(null, { status: 405 });

    const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
    const text = typeof body?.text === "string" ? body.text : "";
    if (text.trim().length < SUGGESTION_MIN_LENGTH || text.length > SUGGESTION_MAX_LENGTH) {
      return json({ status: "invalid" }, 400);
    }

    const admin = adminClient();
    const started = Date.now();
    const [allowed, trades] = await Promise.all([withinLimits(admin, req), activeTrades(admin)]);
    if (!allowed) return json({ status: "rate_limited" }, 429);
    const limitsMs = Date.now() - started;

    const llm = llmConfig();
    if (!llm) {
      console.error("suggest-need : aucune clé de modèle configurée");
      return json({ status: "unavailable" }, 503);
    }

    const run: AiRun = {
      function_name: "suggest-need",
      model: env("AI_SUGGEST_MODEL") || llm.primary,
      outcome: "erreur",
      latency_ms: 0,
    };
    const suggestion = await suggestNeed(llm, scrubPersonalData(text), run, trades);
    // Journal écrit après la réponse : la suggestion n'attend pas la base.
    await afterResponse(logAiRuns(admin, [run]));
    const response = suggestion
      ? json({ status: "ok", ...suggestion })
      : json({ status: "unavailable" }, 503);
    // Durées visibles dans les outils du navigateur (limites, modèle), sans contenu.
    response.headers.set("Server-Timing", `limites;dur=${limitsMs}, ia;dur=${run.latency_ms}`);
    return response;
  }),
);
