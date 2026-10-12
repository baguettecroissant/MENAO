"use client";

import { MAX_DICTATION_SECONDS } from "@menao/core";
import { AudioLines, LoaderCircle, Mic } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fr } from "@/i18n/fr";
import { ensureSession, invokeFunction } from "@/lib/project/client";
import { dictationSupported, recordingToWav } from "@/lib/project/dictation";
import { useMicLevel } from "@/lib/project/use-mic-level";
import { MicLevel } from "./mic-level";

const t = fr.search.dictation;

export type DictationState = "idle" | "listening" | "transcribing";

/** Dictée (F-05) : bouton micro rond des maquettes ; « Écoute… » puis texte inséré. */
export function DictationButton({
  onText,
  onError,
  onStateChange,
}: {
  onText: (text: string) => void;
  onError: (message: string | null) => void;
  onStateChange?: (state: DictationState) => void;
}) {
  const [state, setStateRaw] = useState<DictationState>("idle");
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  // Flux du micro pendant la dictée : niveau affiché et silence prolongé signalé.
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const mic = useMicLevel(micStream);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const setState = (next: DictationState) => {
    setStateRaw(next);
    onStateChange?.(next);
  };

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      recorder.current?.stream.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  async function start() {
    onError(null);
    if (!dictationSupported()) return onError(t.unsupported);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return onError(t.denied);
    }
    const chunks: Blob[] = [];
    const rec = new MediaRecorder(stream);
    recorder.current = rec;
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    rec.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      setMicStream(null);
      if (timer.current) clearInterval(timer.current);
      void transcribe(new Blob(chunks, { type: rec.mimeType }));
    };
    rec.start();
    setMicStream(stream);
    setSeconds(0);
    setState("listening");
    timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  // Dictée limitée à 2 minutes.
  useEffect(() => {
    if (state === "listening" && seconds >= MAX_DICTATION_SECONDS) {
      onError(t.limit);
      stop();
    }
  }, [state, seconds, onError]);

  async function transcribe(recording: Blob) {
    setState("transcribing");
    try {
      const audio = await recordingToWav(recording);
      // Rien de capté (micro coupé, mauvais micro) : ni session ni transcription.
      if (audio.silent) return onError(t.silent);
      const session = await ensureSession();
      if (!session) return onError(fr.search.errors.session);
      const result = await invokeFunction<{ status: string; text?: string }>(
        session.supabase,
        "transcribe",
        { audio: audio.base64 },
      );
      if (result.status === "ok" && "text" in result && result.text) onText(result.text);
      else onError(result.status === "rate_limited" ? t.rate_limited : t.failed);
    } catch {
      onError(t.failed);
    } finally {
      setState("idle");
    }
  }

  const listening = state === "listening";
  const label =
    state === "transcribing"
      ? t.transcribing
      : listening
        ? `${t.listening(seconds)} — ${t.stop}`
        : t.start;
  return (
    <div className="flex items-center gap-2">
      {state !== "idle" && (
        <span
          aria-live="polite"
          className={`flex items-center gap-1.5 text-xs font-medium ${
            listening && mic.quiet ? "text-warning" : "text-primary-strong"
          }`}
        >
          {listening && <MicLevel level={mic.level} />}
          {state === "transcribing" ? t.transcribing : mic.quiet ? t.quiet : t.listening(seconds)}
        </span>
      )}
      <span className="relative inline-flex">
        {/* Halo animé derrière le bouton : le bouton lui-même reste immobile (clic, lecteurs d'écran). */}
        {listening && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-primary/40 motion-reduce:hidden"
          />
        )}
        <button
          type="button"
          onClick={listening ? stop : start}
          disabled={state === "transcribing"}
          aria-pressed={listening}
          aria-label={label}
          title={label}
          className={`inline-flex size-10 items-center justify-center rounded-full text-primary-foreground transition-colors focus-visible:ring-4 focus-visible:ring-primary/25 focus-visible:outline-none disabled:opacity-70 ${
            listening ? "bg-primary-hover" : "bg-primary hover:bg-primary-hover"
          }`}
        >
          {state === "transcribing" ? (
            <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
          ) : listening ? (
            <AudioLines aria-hidden="true" className="size-5" />
          ) : (
            <Mic aria-hidden="true" className="size-5" />
          )}
        </button>
      </span>
    </div>
  );
}
