import {
  DICTATION_SAMPLE_RATE,
  downmixAndResample,
  encodeWav,
  isSilent,
  peakRms,
  toBase64,
} from "@menao/core";

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
