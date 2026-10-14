import {
  DICTATION_SAMPLE_RATE,
  MAX_DICTATION_SECONDS,
  SILENCE_RMS,
  SILENCE_WARNING_MS,
  levelFromRms,
  pcm16ToChannels,
  rms,
} from "@menao/core";
import { requestRecordingPermissionsAsync, useAudioStream } from "expo-audio";
import { useRef, useState } from "react";
import { transcribeCapture } from "./dictation";

export type DictationState = "idle" | "listening" | "transcribing";
export type DictationError = "denied" | "limit" | "failed" | "silent" | "session" | "rate_limited";

/**
 * Capture du micro pour la dictée (F-05, F-19), comme sur le site : PCM (expo-audio, iPhone et
 * Android), niveau affiché, silence prolongé signalé, durée limitée (`maxSeconds`, 2 minutes par
 * défaut), puis transcription par l'IA. `onText` reçoit le texte de chaque prise.
 */
export function useDictation({
  onText,
  onError,
  maxSeconds = MAX_DICTATION_SECONDS,
}: {
  onText: (text: string) => void;
  onError: (error: DictationError | null) => void;
  maxSeconds?: number;
}) {
  const [state, setState] = useState<DictationState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [quiet, setQuiet] = useState(false);
  const chunks = useRef<Uint8Array[]>([]);
  const format = useRef({ sampleRate: DICTATION_SAMPLE_RATE, channels: 1 });
  // Instants en secondes depuis le début de la capture (horodatage des morceaux reçus).
  const heardAt = useRef(0);
  const shownAt = useRef(-1);
  const stopping = useRef(false);
  // Prise effacée : rien n'est transcrit à l'arrêt.
  const discarding = useRef(false);

  const { stream } = useAudioStream({
    sampleRate: DICTATION_SAMPLE_RATE,
    channels: 1,
    encoding: "int16",
    onBuffer: (buffer) => {
      if (stopping.current) return;
      const bytes = new Uint8Array(buffer.data);
      chunks.current.push(bytes);
      format.current = { sampleRate: buffer.sampleRate, channels: buffer.channels };
      const now = buffer.timestamp;
      const value = rms(pcm16ToChannels(bytes, buffer.channels)[0] ?? new Float32Array(0));
      if (value >= SILENCE_RMS) heardAt.current = now;
      // Affichage rafraîchi dix fois par seconde au plus.
      if (now - shownAt.current >= 0.1) {
        shownAt.current = now;
        setLevel(levelFromRms(value));
        setQuiet((now - heardAt.current) * 1000 >= SILENCE_WARNING_MS);
        setSeconds(Math.floor(now));
      }
      if (buffer.timestamp >= maxSeconds) {
        onError("limit");
        void stop();
      }
    },
  });

  async function start() {
    onError(null);
    if (maxSeconds <= 0) return onError("limit");
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) return onError("denied");
    chunks.current = [];
    stopping.current = false;
    discarding.current = false;
    heardAt.current = 0;
    shownAt.current = -1;
    setSeconds(0);
    setLevel(0);
    setQuiet(false);
    try {
      await stream.start();
      setState("listening");
    } catch {
      onError("failed");
    }
  }

  async function stop() {
    if (stopping.current) return;
    stopping.current = true;
    stream.stop();
    const captured = chunks.current;
    chunks.current = [];
    if (discarding.current) return setState("idle");
    setState("transcribing");
    const outcome = await transcribeCapture(
      captured,
      format.current.sampleRate,
      format.current.channels,
    );
    setState("idle");
    if ("text" in outcome) onText(outcome.text);
    else onError(outcome.error);
  }

  /** Arrête la prise en cours sans la transcrire. */
  function discard() {
    discarding.current = true;
    if (state === "listening") void stop();
    setSeconds(0);
  }

  return { state, seconds, level, quiet, start, stop, discard };
}
