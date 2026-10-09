// Edge Function transcribe (F-05) : transcrit une dictée (WAV PCM mono, 2 minutes au plus) et
// renvoie le texte, inséré dans le champ de saisie. Ni l'audio ni le texte ne sont conservés.
import { MAX_DICTATION_SECONDS } from "../../../packages/core/src/project.ts";
import { wavDurationSeconds } from "../../../packages/core/src/audio.ts";
import { logAiRuns, withinHourlyLimits } from "../_shared/ai.ts";
import { adminClient, json } from "../_shared/artisan.ts";
import { transcriptionProvider } from "../_shared/transcription.ts";

const MAX_PER_HOUR_USER = 30;
const MAX_PER_HOUR_IP = 60;
// 2 minutes de WAV 16 kHz 16 bits ≈ 3,8 Mo, soit ≈ 5,1 Mo en base64 ; marge pour 48 kHz refusée.
const MAX_BASE64_LENGTH = 6_000_000;

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });

  const admin = adminClient();
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  const { data: userData } = token ? await admin.auth.getUser(token) : { data: null };
  const user = userData?.user;
  if (!user) return json({ status: "forbidden" }, 401);

  const body = (await req.json().catch(() => null)) as { audio?: unknown } | null;
  const base64 = typeof body?.audio === "string" ? body.audio : "";
  if (base64.length === 0 || base64.length > MAX_BASE64_LENGTH) {
    return json({ status: "invalid" }, 400);
  }
  let wav: Uint8Array;
  try {
    wav = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  } catch {
    return json({ status: "invalid" }, 400);
  }
  const seconds = wavDurationSeconds(wav);
  if (seconds === null || seconds < 0.3 || seconds > MAX_DICTATION_SECONDS + 5) {
    return json({ status: "invalid" }, 400);
  }

  if (
    !(await withinHourlyLimits(
      admin,
      "transcribe",
      user.id,
      req,
      MAX_PER_HOUR_USER,
      MAX_PER_HOUR_IP,
    ))
  ) {
    return json({ status: "rate_limited" }, 429);
  }

  const provider = transcriptionProvider();
  if (!provider) {
    console.error("transcribe : aucun fournisseur configuré");
    return json({ status: "unavailable" }, 503);
  }

  const started = Date.now();
  try {
    const text = (await provider.transcribe(wav, base64)).trim();
    await logAiRuns(admin, [
      {
        function_name: "transcribe",
        model: provider.model,
        outcome: "ok",
        latency_ms: Date.now() - started,
        audio_seconds: Math.round(seconds * 10) / 10,
      },
    ]);
    return json({ status: "ok", text });
  } catch (error) {
    await logAiRuns(admin, [
      {
        function_name: "transcribe",
        model: provider.model,
        outcome: "erreur",
        latency_ms: Date.now() - started,
        audio_seconds: Math.round(seconds * 10) / 10,
      },
    ]);
    console.error("transcribe : erreur", error instanceof Error ? error.message : "");
    return json({ status: "unavailable" }, 503);
  }
});
