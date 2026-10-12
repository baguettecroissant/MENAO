import {
  DICTATION_SAMPLE_RATE,
  downmixAndResample,
  encodeWav,
  isSilent,
  peakRms,
} from "@menao/core";

/** Encode en base64 par blocs (évite de dépasser la pile avec String.fromCharCode). */
export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/**
 * Convertit l'enregistrement du navigateur (WebM/Opus, MP4/AAC selon le navigateur) en WAV PCM
 * 16 bits mono 16 kHz, encodé en base64 pour l'Edge Function transcribe. « silent » : rien n'a
 * été capté (micro coupé, mauvais micro) ; inutile alors de demander une transcription.
 */
export async function recordingToWav(
  recording: Blob,
): Promise<{ base64: string; silent: boolean }> {
  const context = new AudioContext();
  try {
    const buffer = await context.decodeAudioData(await recording.arrayBuffer());
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) =>
      buffer.getChannelData(i),
    );
    const samples = downmixAndResample(channels, buffer.sampleRate, DICTATION_SAMPLE_RATE);
    return {
      base64: toBase64(encodeWav(samples, DICTATION_SAMPLE_RATE)),
      silent: isSilent(peakRms(samples, DICTATION_SAMPLE_RATE)),
    };
  } finally {
    void context.close();
  }
}

export function dictationSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}
