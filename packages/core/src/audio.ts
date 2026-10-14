/**
 * Dictée vocale (F-05, F-19) : le navigateur enregistre, convertit en WAV PCM 16 bits mono 16 kHz
 * (format accepté par tous les fournisseurs de transcription), et l'Edge Function vérifie la durée.
 * Autonome (aucun import) : importable par les Edge Functions Deno.
 */
export const DICTATION_SAMPLE_RATE = 16000;
const HEADER_BYTES = 44;

/** Moyenne des canaux puis rééchantillonnage linéaire. */
export function downmixAndResample(
  channels: Float32Array[],
  fromRate: number,
  toRate: number,
): Float32Array {
  const length = channels[0]?.length ?? 0;
  const mono = new Float32Array(length);
  for (const channel of channels) {
    for (let i = 0; i < length; i++) mono[i] = (mono[i] ?? 0) + (channel[i] ?? 0) / channels.length;
  }
  if (fromRate === toRate) return mono;
  const outLength = Math.floor((length * toRate) / fromRate);
  const out = new Float32Array(outLength);
  const ratio = fromRate / toRate;
  for (let i = 0; i < outLength; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, length - 1);
    const a = mono[i0] ?? 0;
    out[i] = a + ((mono[i1] ?? 0) - a) * (pos - i0);
  }
  return out;
}

export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const bytes = new Uint8Array(HEADER_BYTES + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) bytes[offset + i] = text.charCodeAt(i);
  };
  ascii(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true); // taille du bloc fmt
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // octets par seconde
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(HEADER_BYTES + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return bytes;
}

/** Durée d'un WAV PCM produit par encodeWav, ou null si l'en-tête n'est pas reconnu. */
export function wavDurationSeconds(bytes: Uint8Array): number | null {
  if (bytes.length < HEADER_BYTES) return null;
  const tag = (offset: number) => String.fromCharCode(...bytes.slice(offset, offset + 4));
  if (tag(0) !== "RIFF" || tag(8) !== "WAVE" || tag(12) !== "fmt " || tag(36) !== "data") {
    return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const format = view.getUint16(20, true);
  const byteRate = view.getUint32(28, true);
  if (format !== 1 || byteRate < 8000 || byteRate > 384000) return null;
  return (bytes.length - HEADER_BYTES) / byteRate;
}

/** Niveau efficace (RMS) d'un bloc d'échantillons, de 0 à 1. */
export function rms(samples: ArrayLike<number>): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const value = samples[i] ?? 0;
    sum += value * value;
  }
  return Math.sqrt(sum / samples.length);
}

/** Niveau affiché de 0 à 1 sur une échelle de 60 dB (−60 dB et moins : 0 ; 0 dB : 1). */
export function levelFromRms(value: number): number {
  if (value <= 0) return 0;
  return Math.min(1, Math.max(0, (20 * Math.log10(value) + 60) / 60));
}

/** Sous ce niveau (−40 dB), rien n'est entendu : micro coupé ou mauvais micro sélectionné. */
export const SILENCE_RMS = 0.01;
/** Silence continu pendant l'enregistrement : avertissement au bout de 3 secondes. */
export const SILENCE_WARNING_MS = 3000;

/** Niveau du bloc de 50 ms le plus fort de l'enregistrement : une syllabe audible suffit. */
export function peakRms(samples: Float32Array, sampleRate: number): number {
  const block = Math.max(1, Math.round(sampleRate / 20));
  let peak = 0;
  for (let i = 0; i < samples.length; i += block) {
    peak = Math.max(peak, rms(samples.subarray(i, i + block)));
  }
  return peak;
}

/** Enregistrement silencieux : inutile de l'envoyer à la transcription. */
export const isSilent = (peak: number) => peak < SILENCE_RMS;

/**
 * Échantillons PCM 16 bits petit-boutistes entrelacés (capture du micro de l'application) → un
 * tableau de −1 à 1 par canal, prêt pour downmixAndResample.
 */
export function pcm16ToChannels(bytes: Uint8Array, channelCount: number): Float32Array[] {
  const count = Math.max(1, Math.floor(channelCount));
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const frames = Math.floor(bytes.byteLength / (2 * count));
  const channels = Array.from({ length: count }, () => new Float32Array(frames));
  for (let f = 0; f < frames; f++) {
    for (let c = 0; c < count; c++) {
      const channel = channels[c];
      if (channel) channel[f] = view.getInt16((f * count + c) * 2, true) / 0x8000;
    }
  }
  return channels;
}

const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Encodage base64 de l'audio envoyé à transcribe, identique partout (navigateur, téléphone). Par
 * blocs assemblés à la fin : plusieurs millions de caractères pour 2 minutes de dictée.
 */
export function toBase64(bytes: Uint8Array): string {
  const parts: string[] = [];
  // Blocs de 3 × 4 096 octets : le complément « = » n'apparaît qu'à la toute fin.
  for (let start = 0; start < bytes.length; start += 12_288) {
    const end = Math.min(start + 12_288, bytes.length);
    const chars: string[] = [];
    for (let i = start; i < end; i += 3) {
      const triple = ((bytes[i] ?? 0) << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
      chars.push(
        BASE64.charAt((triple >> 18) & 63),
        BASE64.charAt((triple >> 12) & 63),
        i + 1 < bytes.length ? BASE64.charAt((triple >> 6) & 63) : "=",
        i + 2 < bytes.length ? BASE64.charAt(triple & 63) : "=",
      );
    }
    parts.push(chars.join(""));
  }
  return parts.join("");
}

/**
 * Capture du micro de l'application (morceaux PCM 16 bits, fréquence et canaux réels) → WAV PCM
 * 16 bits mono 16 kHz pour transcribe, comme la dictée du site ; « silent » si rien n'a été capté.
 */
export function captureToWav(
  chunks: readonly Uint8Array[],
  sampleRate: number,
  channelCount: number,
): { wav: Uint8Array; silent: boolean } {
  const bytes = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const samples = downmixAndResample(
    pcm16ToChannels(bytes, channelCount),
    sampleRate,
    DICTATION_SAMPLE_RATE,
  );
  return {
    wav: encodeWav(samples, DICTATION_SAMPLE_RATE),
    silent: isSilent(peakRms(samples, DICTATION_SAMPLE_RATE)),
  };
}
