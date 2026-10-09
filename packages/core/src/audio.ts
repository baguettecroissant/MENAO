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
