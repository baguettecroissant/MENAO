// Edge Function artisan-assistant (F-86, ADR 0236) : assistant écrit de l'espace artisan, inclus
// dans toutes les formules. Artisan connecté seulement ; le résumé de son compte est lu avec sa
// propre session (my_assistant_context), le guide de l'espace et les contenus publiés du site
// (/assistant-pro.txt) font la consigne. L'historique vient de l'interface et n'est jamais
// conservé ; e-mails et téléphones retirés avant l'envoi au modèle ; seules les métriques sont
// journalisées (ai_runs). Limite anti-abus invisible en usage normal.
import { createClient } from "@supabase/supabase-js";
import {
  ARTISAN_ASSISTANT_MAX_QUESTIONS,
  ARTISAN_ASSISTANT_QUESTION_MAX_LENGTH,
  artisanAccountText,
  artisanAssistantQuestionCount,
  normalizeArtisanAssistantHistory,
} from "../../../packages/core/src/artisan-assistant.ts";
import { scrubPersonalData } from "../../../packages/core/src/project.ts";
import { llmConfig, logAiRuns, withinHourlyLimits, type AiRun } from "../_shared/ai.ts";
import { adminClient, json } from "../_shared/artisan.ts";
import { withCors } from "../_shared/cors.ts";
import { env } from "../_shared/env.ts";
import { answerArtisanQuestion } from "./assistant.ts";

/** Par artisan et par heure : bien au-delà d'un usage normal. */
const MAX_PER_USER_PER_HOUR = 60;
const MAX_PER_IP_PER_HOUR = 120;
/** Plafond de dépense, tous artisans confondus. */
const MAX_PER_HOUR = 3000;

const KNOWLEDGE_TTL_MS = 30 * 60_000;
let siteCache: { at: number; text: string } | null = null;

/** Contenus publiés du site (offre, formules, garanties), relus au plus toutes les 30 minutes. */
async function siteContent(): Promise<string> {
  if (siteCache && Date.now() - siteCache.at < KNOWLEDGE_TTL_MS) return siteCache.text;
  const site = env("SITE_URLS").split(",")[0]?.trim().replace(/\/$/, "");
  const url = env("PRO_ASSISTANT_KNOWLEDGE_URL") || (site ? `${site}/assistant-pro.txt` : "");
  if (url) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const text = response.ok ? (await response.text()).trim() : "";
      if (text && !text.startsWith("<")) siteCache = { at: Date.now(), text };
    } catch {
      console.error("artisan-assistant : contenus du site illisibles");
    }
  }
  return siteCache?.text ?? "";
}

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void } | undefined;
function afterResponse(task: Promise<unknown>): Promise<unknown> | undefined {
  if (typeof EdgeRuntime === "undefined") return task;
  EdgeRuntime.waitUntil(task);
}

Deno.serve(
  withCors(async (req) => {
    if (req.method !== "POST") return new Response(null, { status: 405 });
    const admin = adminClient();
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    const { data: userData } = token ? await admin.auth.getUser(token) : { data: null };
    const user = userData?.user;
    if (!user) return json({ status: "forbidden" }, 401);

    const body = (await req.json().catch(() => null)) as {
      question?: unknown;
      history?: unknown;
    } | null;
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    if (question.length < 2 || question.length > ARTISAN_ASSISTANT_QUESTION_MAX_LENGTH) {
      return json({ status: "invalid" }, 400);
    }
    const history = normalizeArtisanAssistantHistory(body?.history);
    if (artisanAssistantQuestionCount(history) >= ARTISAN_ASSISTANT_MAX_QUESTIONS) {
      return json({ status: "limit" }, 429);
    }

    // Compte lu avec la session de l'artisan : la base ne renvoie que le sien.
    const asUser = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const [allowed, global, context, site] = await Promise.all([
      withinHourlyLimits(
        admin,
        "artisan-assistant",
        user.id,
        req,
        MAX_PER_USER_PER_HOUR,
        MAX_PER_IP_PER_HOUR,
      ),
      admin.rpc("consume_rate_limit", {
        p_key: "artisan-assistant:all",
        p_max: MAX_PER_HOUR,
        p_window_seconds: 3600,
      }),
      asUser.rpc("my_assistant_context"),
      siteContent(),
    ]);
    if (!allowed || global.data !== true) return json({ status: "rate_limited" }, 429);
    if (context.error || !context.data) return json({ status: "forbidden" }, 403);

    const llm = llmConfig();
    if (!llm) {
      console.error("artisan-assistant : aucune clé de modèle");
      return json({ status: "unavailable" }, 503);
    }
    const run: AiRun = {
      function_name: "artisan-assistant",
      model: env("AI_PRO_ASSISTANT_MODEL") || llm.primary,
      outcome: "erreur",
      latency_ms: 0,
    };
    const answer = await answerArtisanQuestion(
      llm,
      site,
      artisanAccountText(context.data),
      history.map((m) => ({ ...m, text: scrubPersonalData(m.text) })),
      scrubPersonalData(question),
      run,
    );
    await afterResponse(logAiRuns(admin, [run]));
    if (!answer) return json({ status: "unavailable" }, 503);
    return json({ status: "ok", ...answer });
  }),
);
