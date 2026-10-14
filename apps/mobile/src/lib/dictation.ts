import { captureToWav, toBase64 } from "@menao/core";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { ensureSession } from "./project";
import { supabase } from "./supabase";

export type DictationOutcome =
  { text: string } | { error: "silent" | "session" | "rate_limited" | "failed" };

/**
 * Dictée (F-05), comme sur le site : morceaux PCM 16 bits capturés par le micro, convertis en WAV
 * PCM 16 bits mono 16 kHz (`@menao/core`), puis transcrits par la fonction transcribe (session
 * anonyme de recherche au besoin, ADR 0012). Rien n'est envoyé si aucun son n'a été capté.
 */
export async function transcribeCapture(
  chunks: readonly Uint8Array[],
  sampleRate: number,
  channels: number,
): Promise<DictationOutcome> {
  const { wav, silent } = captureToWav(chunks, sampleRate, channels);
  if (silent) return { error: "silent" };
  if (!(await ensureSession())) return { error: "session" };
  const { data, error } = await supabase.functions.invoke<{ status: string; text?: string }>(
    "transcribe",
    { body: { audio: toBase64(wav) } },
  );
  const payload =
    error instanceof FunctionsHttpError
      ? ((await error.context.json().catch(() => null)) as typeof data)
      : error
        ? null
        : data;
  if (payload?.status === "ok" && payload.text) return { text: payload.text };
  return { error: payload?.status === "rate_limited" ? "rate_limited" : "failed" };
}
