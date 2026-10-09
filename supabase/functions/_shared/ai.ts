// Accès aux modèles d'IA (ADR 0012). Clés directes en priorité (production), sinon OpenRouter
// (tests et staging). Les noms de modèles diffèrent selon la passerelle.
import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env.ts";

const OPENROUTER_DEFAULT = "https://openrouter.ai/api";

export function openRouterBaseUrl(): string {
  return (env("OPENROUTER_BASE_URL") || OPENROUTER_DEFAULT).replace(/\/$/, "");
}

export type LlmConfig = { client: Anthropic; primary: string; fallback: string };

export function llmConfig(): LlmConfig | null {
  const anthropicKey = env("ANTHROPIC_API_KEY");
  const openRouterKey = env("OPENROUTER_API_KEY");
  const options = { timeout: 25_000, maxRetries: 1 };
  if (anthropicKey) {
    return {
      client: new Anthropic({ apiKey: anthropicKey, ...options }),
      primary: env("AI_ANALYZE_MODEL") || "claude-haiku-5-5",
      fallback: env("AI_ANALYZE_FALLBACK_MODEL") || "claude-sonnet-5-5",
    };
  }
  if (openRouterKey) {
    return {
      // Point d'accès compatible Anthropic d'OpenRouter (jeton Bearer).
      client: new Anthropic({
        baseURL: openRouterBaseUrl(),
        apiKey: null,
        authToken: openRouterKey,
        ...options,
      }),
      primary: env("AI_ANALYZE_MODEL") || "anthropic/claude-haiku-5.5",
      fallback: env("AI_ANALYZE_FALLBACK_MODEL") || "anthropic/claude-sonnet-5.5",
    };
  }
  return null;
}

/** Première adresse de X-Forwarded-For (posée par la passerelle Supabase). */
export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "inconnue";
}

/** Empreinte SHA-256 (hexadécimal) : les adresses IP ne sont jamais stockées en clair. */
export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Limite par utilisateur et par adresse IP (fenêtre d'une heure). */
export async function withinHourlyLimits(
  admin: SupabaseClient,
  scope: string,
  userId: string,
  req: Request,
  perUser: number,
  perIp: number,
): Promise<boolean> {
  const ipHash = (await sha256(clientIp(req))).slice(0, 32);
  for (const [key, max] of [
    [`${scope}:user:${userId}`, perUser],
    [`${scope}:ip:${ipHash}`, perIp],
  ] as const) {
    const { data } = await admin.rpc("consume_rate_limit", {
      p_key: key,
      p_max: max,
      p_window_seconds: 3600,
    });
    if (data !== true) return false;
  }
  return true;
}

export type AiRun = {
  function_name: "analyze-need" | "transcribe";
  model: string;
  outcome: "ok" | "invalide" | "peu_sur" | "refus" | "erreur";
  latency_ms: number;
  input_tokens?: number | null;
  output_tokens?: number | null;
  audio_seconds?: number | null;
  confidence?: number | null;
  project_id?: string | null;
};

/** Journal sans données personnelles (F-06) : métriques uniquement, jamais de texte. */
export async function logAiRuns(admin: SupabaseClient, runs: AiRun[]): Promise<void> {
  if (runs.length === 0) return;
  const { error } = await admin.from("ai_runs").insert(runs);
  if (error) console.error("ai_runs : insertion impossible", error.code);
}
