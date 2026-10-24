// Edge Function describe-photo (F-05, ADR 0180) : le particulier joint une photo de son problème
// ou de la pièce à refaire ; l'IA rédige le début de sa demande. Appelée directement par le
// navigateur et l'application, sans session (le visiteur n'a pas encore de compte) : limites par
// adresse IP et limite globale. La photo n'est ni enregistrée ni conservée ; seules les métriques
// de l'appel le sont (ai_runs). Les photos du projet suivent leur propre chemin (process-upload).
import { detectFileType } from "../../../packages/core/src/files.ts";
import { PHOTO_DESCRIPTION_MAX_BASE64 } from "../../../packages/core/src/need-photo.ts";
import { clientIp, llmConfig, logAiRuns, sha256, type AiRun } from "../_shared/ai.ts";
import { adminClient, json } from "../_shared/artisan.ts";
import { withCors } from "../_shared/cors.ts";
import { env } from "../_shared/env.ts";
import { describePhoto } from "./description.ts";

/** Une recherche joint une ou deux photos ; marge pour un foyer ou un bureau. */
const MAX_PER_IP_PER_HOUR = 20;
/** Plafond de dépense, tous visiteurs confondus. */
const MAX_PER_HOUR = 500;

/** Tâche terminée après la réponse (Supabase Edge Runtime) ; attendue ailleurs (tests). */
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void } | undefined;
function afterResponse(task: Promise<unknown>): Promise<unknown> | undefined {
  if (typeof EdgeRuntime === "undefined") return task;
  EdgeRuntime.waitUntil(task);
}

async function withinLimits(admin: ReturnType<typeof adminClient>, req: Request) {
  const ipHash = (await sha256(clientIp(req))).slice(0, 32);
  const results = await Promise.all(
    (
      [
        [`describe-photo:ip:${ipHash}`, MAX_PER_IP_PER_HOUR],
        ["describe-photo:all", MAX_PER_HOUR],
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

    const body = (await req.json().catch(() => null)) as { image?: unknown } | null;
    const data = typeof body?.image === "string" ? body.image : "";
    if (!data || data.length > PHOTO_DESCRIPTION_MAX_BASE64) {
      return json({ status: "invalid" }, 400);
    }
    let bytes: Uint8Array;
    try {
      bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    } catch {
      return json({ status: "invalid" }, 400);
    }
    const type = detectFileType(bytes);
    if (type !== "jpeg" && type !== "png") return json({ status: "invalid_type" }, 415);

    const admin = adminClient();
    if (!(await withinLimits(admin, req))) return json({ status: "rate_limited" }, 429);

    const llm = llmConfig();
    if (!llm) {
      console.error("describe-photo : aucune clé de modèle configurée");
      return json({ status: "unavailable" }, 503);
    }

    const run: AiRun = {
      function_name: "describe-photo",
      model: env("AI_PHOTO_MODEL") || llm.primary,
      outcome: "erreur",
      latency_ms: 0,
    };
    const description = await describePhoto(
      llm,
      { data, mediaType: type === "png" ? "image/png" : "image/jpeg" },
      run,
    );
    await afterResponse(logAiRuns(admin, [run]));
    return description ? json({ status: "ok", description }) : json({ status: "empty" });
  }),
);
