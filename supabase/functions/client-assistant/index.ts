// Edge Function client-assistant (F-71, ADR 0220) : répond aux particuliers depuis la saisie du
// besoin, à partir des seuls contenus publiés du site (/assistant-particulier.txt), et prépare
// leur demande. Appelée directement par le navigateur, sans session : limites par adresse IP et
// limite globale. L'historique vient du navigateur et n'est jamais conservé ; e-mails et
// téléphones retirés avant l'envoi au modèle ; seules les métriques sont journalisées (ai_runs).
import {
  normalizeProAssistantHistory,
  proAssistantQuestionCount,
  PRO_ASSISTANT_MAX_QUESTIONS,
  PRO_ASSISTANT_QUESTION_MAX_LENGTH,
  PRO_ASSISTANT_QUESTION_MIN_LENGTH,
} from "../../../packages/core/src/pro-assistant.ts";
import { scrubPersonalData } from "../../../packages/core/src/project.ts";
import { clientIp, llmConfig, logAiRuns, sha256, type AiRun } from "../_shared/ai.ts";
import { adminClient, json } from "../_shared/artisan.ts";
import { withCors } from "../_shared/cors.ts";
import { env } from "../_shared/env.ts";
import { answerClientQuestion, type Trade } from "./assistant.ts";

/** Une conversation compte au plus 6 messages ; marge pour un foyer ou un bureau. */
const MAX_PER_IP_PER_HOUR = 40;
/** Plafond de dépense, tous visiteurs confondus. */
const MAX_PER_HOUR = 1500;

/** Contenus du site, relus au plus toutes les 30 minutes (une instance sert plusieurs appels). */
const KNOWLEDGE_TTL_MS = 30 * 60_000;
let knowledgeCache: { at: number; text: string } | null = null;

function knowledgeUrl(): string {
  const site = env("SITE_URLS").split(",")[0]?.trim().replace(/\/$/, "");
  return env("CLIENT_ASSISTANT_KNOWLEDGE_URL") || (site ? `${site}/assistant-particulier.txt` : "");
}

async function siteKnowledge(): Promise<string | null> {
  if (knowledgeCache && Date.now() - knowledgeCache.at < KNOWLEDGE_TTL_MS) {
    return knowledgeCache.text;
  }
  const url = knowledgeUrl();
  if (!url) return knowledgeCache?.text ?? null;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const text = response.ok ? (await response.text()).trim() : "";
    // Une page HTML (page d'attente du pré-lancement, erreur) n'est jamais prise pour le texte.
    if (text && !text.startsWith("<")) knowledgeCache = { at: Date.now(), text };
    else console.error("client-assistant : contenus du site invalides");
  } catch {
    console.error("client-assistant : contenus du site illisibles");
  }
  // Site momentanément injoignable : la dernière version lue reste valable.
  return knowledgeCache?.text ?? null;
}

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
        [`client-assistant:ip:${ipHash}`, MAX_PER_IP_PER_HOUR],
        ["client-assistant:all", MAX_PER_HOUR],
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

    const body = (await req.json().catch(() => null)) as {
      question?: unknown;
      history?: unknown;
    } | null;
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    if (
      question.length < PRO_ASSISTANT_QUESTION_MIN_LENGTH ||
      question.length > PRO_ASSISTANT_QUESTION_MAX_LENGTH
    ) {
      return json({ status: "invalid" }, 400);
    }
    const history = normalizeProAssistantHistory(body?.history);
    if (proAssistantQuestionCount(history) >= PRO_ASSISTANT_MAX_QUESTIONS) {
      return json({ status: "limit" }, 429);
    }

    const admin = adminClient();
    const [allowed, knowledge, trades] = await Promise.all([
      withinLimits(admin, req),
      siteKnowledge(),
      activeTrades(admin),
    ]);
    if (!allowed) return json({ status: "rate_limited" }, 429);

    const llm = llmConfig();
    if (!llm || !knowledge) {
      console.error(
        `client-assistant : ${llm ? "contenus du site indisponibles" : "aucune clé de modèle"}`,
      );
      return json({ status: "unavailable" }, 503);
    }

    const run: AiRun = {
      function_name: "client-assistant",
      model: env("AI_CLIENT_ASSISTANT_MODEL") || llm.primary,
      outcome: "erreur",
      latency_ms: 0,
    };
    const answer = await answerClientQuestion(
      llm,
      knowledge,
      trades,
      history.map((m) => ({ ...m, text: scrubPersonalData(m.text) })),
      scrubPersonalData(question),
      run,
    );
    await afterResponse(logAiRuns(admin, [run]));
    if (!answer) return json({ status: "unavailable" }, 503);
    const response = json({ status: "ok", ...answer });
    response.headers.set("Server-Timing", `ia;dur=${run.latency_ms}`);
    return response;
  }),
);
