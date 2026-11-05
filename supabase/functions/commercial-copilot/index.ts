// Edge Function commercial-copilot (F-74, ADR 0223) : copilote des commerciaux de terrain, pour un
// prospect qu'ils suivent. Trois tâches :
// - « brief » : fiche de préparation de la visite, gardée en base (relue sans nouvel appel) ;
// - « message » : premier message ou relance (SMS, WhatsApp, e-mail, script d'appel), jamais
//   envoyé par MENAO : le commercial le relit et l'envoie depuis son téléphone ;
// - « report » : compte rendu d'une dictée (déjà transcrite par la fonction transcribe), à valider
//   par le commercial avant d'entrer dans son suivi.
// Le suivi est vérifié par la base (fonctions appelées avec le jeton du commercial). Envoyés au
// modèle : données publiques de l'entreprise, notes et comptes rendus du commercial (e-mails et
// téléphones retirés) ; jamais le téléphone, l'adresse ni le SIRET du prospect. Journal : métriques
// seules (ai_runs).
import { createClient } from "@supabase/supabase-js";
import {
  COPILOT_ACTIONS,
  COPILOT_CHANNELS,
  COPILOT_REPORT_MAX_LENGTH,
  COPILOT_REPORT_MIN_LENGTH,
  PROSPECT_DEMAND_DAYS,
  PROSPECT_DEMAND_RADIUS_KM,
  prospectTradeCodes,
  type ProspectDemand,
  type StoredCopilotBrief,
} from "../../../packages/core/src/commercial-copilot.ts";
import { scrubPersonalData } from "../../../packages/core/src/project.ts";
import { llmConfig, logAiRuns, type AiRun } from "../_shared/ai.ts";
import { adminClient, json } from "../_shared/artisan.ts";
import { withCors } from "../_shared/cors.ts";
import { env } from "../_shared/env.ts";
import { generateBrief, generateMessage, generateReport, type CopilotContext } from "./copilot.ts";
import { commercialGuideText } from "./knowledge.ts";

/** Une journée chargée : une quinzaine de prospects, chacun avec fiche, message et compte rendu. */
const MAX_PER_DAY_USER = 80;
/** Plafond de dépense, tous commerciaux confondus. */
const MAX_PER_HOUR = 600;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/** Le guide ne change qu'au déploiement : mis en texte une fois par instance. */
const GUIDE = commercialGuideText();

/** Date, heure et jour de la semaine à Paris. */
function parisNow(at = new Date()): { date: string; time: string; weekday: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const weekday = WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()] ?? "";
  return { date, time: `${parts.hour}:${parts.minute}`, weekday };
}

/** Tâche terminée après la réponse (Supabase Edge Runtime) ; attendue ailleurs. */
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void } | undefined;
function afterResponse(task: Promise<unknown>): Promise<unknown> | undefined {
  if (typeof EdgeRuntime === "undefined") return task;
  EdgeRuntime.waitUntil(task);
}

async function withinLimits(admin: ReturnType<typeof adminClient>, userId: string) {
  const results = await Promise.all(
    (
      [
        [`commercial-copilot:user:${userId}`, MAX_PER_DAY_USER, 86_400],
        ["commercial-copilot:all", MAX_PER_HOUR, 3600],
      ] as const
    ).map(([key, max, seconds]) =>
      admin.rpc("consume_rate_limit", { p_key: key, p_max: max, p_window_seconds: seconds }),
    ),
  );
  return results.every(({ data }) => data === true);
}

Deno.serve(
  withCors(async (req) => {
    if (req.method !== "POST") return new Response(null, { status: 405 });

    const admin = adminClient();
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    const { data: userData } = token ? await admin.auth.getUser(token) : { data: null };
    const user = userData?.user;
    if (!user || user.is_anonymous) return json({ status: "forbidden" }, 401);

    const body = (await req.json().catch(() => null)) as {
      action?: unknown;
      prospectId?: unknown;
      channel?: unknown;
      transcript?: unknown;
    } | null;
    const action = COPILOT_ACTIONS.find((a) => a === body?.action);
    const prospectId = typeof body?.prospectId === "string" ? body.prospectId : "";
    const channel = COPILOT_CHANNELS.find((c) => c === body?.channel);
    const transcript = typeof body?.transcript === "string" ? body.transcript.trim() : "";
    if (
      !action ||
      !UUID.test(prospectId) ||
      (action === "message" && !channel) ||
      (action === "report" &&
        (transcript.length < COPILOT_REPORT_MIN_LENGTH ||
          transcript.length > COPILOT_REPORT_MAX_LENGTH))
    ) {
      return json({ status: "invalid" }, 400);
    }

    // Appels à la base avec le jeton du commercial : le suivi est vérifié par les fonctions.
    const asUser = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const { data: context, error: contextError } = await asUser.rpc("commercial_copilot_context", {
      p_id: prospectId,
    });
    if (contextError) {
      if (contextError.code === "42501") return json({ status: "forbidden" }, 403);
      if (contextError.code === "22023") return json({ status: "not_followed" }, 409);
      console.error("commercial-copilot : contexte illisible", contextError.code);
      return json({ status: "unavailable" }, 503);
    }
    if (!context) return json({ status: "not_followed" }, 409);

    if (!(await withinLimits(admin, user.id))) return json({ status: "rate_limited" }, 429);
    const llm = llmConfig();
    if (!llm) {
      console.error("commercial-copilot : aucune clé de modèle");
      return json({ status: "unavailable" }, 503);
    }

    const raw = context as CopilotContext;
    // Coordonnées retirées des textes libres du commercial avant l'envoi au modèle.
    const ctx: CopilotContext = {
      ...raw,
      notes: raw.notes ? scrubPersonalData(raw.notes) : null,
      comptes_rendus: (raw.comptes_rendus ?? []).map((r) => ({
        ...r,
        resume: scrubPersonalData(r.resume),
      })),
    };
    const now = parisNow();

    let demand: ProspectDemand | null = null;
    if (action !== "report") {
      const trades = prospectTradeCodes(ctx.ape_code);
      if (trades.length) {
        const { data: count } = await asUser.rpc("commercial_prospect_demand", {
          p_id: prospectId,
          p_trade_codes: trades,
          p_radius_km: PROSPECT_DEMAND_RADIUS_KM,
          p_days: PROSPECT_DEMAND_DAYS,
        });
        demand = {
          recherches: typeof count === "number" ? count : 0,
          jours: PROSPECT_DEMAND_DAYS,
          rayonKm: PROSPECT_DEMAND_RADIUS_KM,
          metiers: trades,
        };
      }
    }

    const run: AiRun = {
      function_name: "commercial-copilot",
      model: env("AI_COMMERCIAL_COPILOT_MODEL") || llm.primary,
      outcome: "erreur",
      latency_ms: 0,
    };

    let response: Response;
    if (action === "brief") {
      const { value, violations } = await generateBrief(llm, GUIDE, ctx, demand, now.date, run);
      if (!value) {
        response = json({ status: violations.length ? "rejected" : "unavailable" }, 503);
      } else {
        const stored: StoredCopilotBrief = { v: 1, ...value, demand };
        const { data: savedAt, error } = await asUser.rpc("commercial_save_brief", {
          p_id: prospectId,
          p_content: stored,
        });
        if (error) console.error("commercial-copilot : fiche non enregistrée", error.code);
        response = json({
          status: "ok",
          brief: stored,
          createdAt: savedAt ?? new Date().toISOString(),
        });
      }
    } else if (action === "message" && channel) {
      const { value, violations } = await generateMessage(
        llm,
        GUIDE,
        ctx,
        demand,
        channel,
        now.date,
        run,
      );
      response = value
        ? json({ status: "ok", message: value })
        : json({ status: violations.length ? "rejected" : "unavailable" }, 503);
    } else {
      const { value, violations } = await generateReport(
        llm,
        GUIDE,
        ctx,
        scrubPersonalData(transcript),
        now,
        run,
      );
      response = value
        ? json({ status: "ok", report: value })
        : json({ status: violations.length ? "rejected" : "unavailable" }, 503);
    }
    await afterResponse(logAiRuns(admin, [run]));
    response.headers.set("Server-Timing", `ia;dur=${run.latency_ms}`);
    return response;
  }),
);
