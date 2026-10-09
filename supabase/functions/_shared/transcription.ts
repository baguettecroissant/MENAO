// Transcription vocale (F-05, F-19) derrière une interface commune (ADR 0012) : Mistral en direct
// si MISTRAL_API_KEY est posée (production), sinon Voxtral via OpenRouter (tests et staging).
import { env } from "./env.ts";
import { openRouterBaseUrl } from "./ai.ts";

export interface TranscriptionProvider {
  readonly model: string;
  /** wav : WAV PCM 16 bits mono ; base64 : le même contenu encodé. */
  transcribe(wav: Uint8Array, base64: string): Promise<string>;
}

class OpenRouterTranscription implements TranscriptionProvider {
  constructor(
    private readonly apiKey: string,
    readonly model: string,
  ) {}

  async transcribe(_wav: Uint8Array, base64: string): Promise<string> {
    const res = await fetch(`${openRouterBaseUrl()}/v1/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        input_audio: { data: base64, format: "wav" },
        language: "fr",
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
    const body = (await res.json()) as { text?: unknown };
    if (typeof body.text !== "string") throw new Error("Réponse sans texte");
    return body.text;
  }
}

class MistralTranscription implements TranscriptionProvider {
  constructor(
    private readonly apiKey: string,
    readonly model: string,
  ) {}

  async transcribe(wav: Uint8Array): Promise<string> {
    const form = new FormData();
    form.append("model", this.model);
    form.append("language", "fr");
    form.append("file", new Blob([wav.slice()], { type: "audio/wav" }), "dictee.wav");
    const res = await fetch("https://api.mistral.ai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`Mistral ${res.status}`);
    const body = (await res.json()) as { text?: unknown };
    if (typeof body.text !== "string") throw new Error("Réponse sans texte");
    return body.text;
  }
}

export function transcriptionProvider(): TranscriptionProvider | null {
  const mistralKey = env("MISTRAL_API_KEY");
  if (mistralKey) {
    return new MistralTranscription(
      mistralKey,
      env("AI_TRANSCRIBE_MODEL") || "voxtral-mini-latest",
    );
  }
  const openRouterKey = env("OPENROUTER_API_KEY");
  if (openRouterKey) {
    return new OpenRouterTranscription(
      openRouterKey,
      env("AI_TRANSCRIBE_MODEL") || "mistralai/voxtral-mini-transcribe",
    );
  }
  return null;
}
