"use client";

import { MAX_DICTATION_SECONDS } from "@menao/core";
import { useEffect, useRef, useState } from "react";
import { fr } from "@/i18n/fr";
import { ensureSession, invokeFunction } from "@/lib/project/client";
import { dictationSupported, recordingToWavBase64 } from "@/lib/project/dictation";

const t = fr.search.dictation;

type State = "idle" | "listening" | "transcribing";

/** Dictée (F-05) : autorisation du micro, « Écoute… », puis texte inséré dans le champ. */
export function DictationButton({
  onText,
  onError,
}: {
  onText: (text: string) => void;
  onError: (message: string | null) => void;
}) {
  const [state, setState] = useState<State>("idle");
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

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
      if (timer.current) clearInterval(timer.current);
      void transcribe(new Blob(chunks, { type: rec.mimeType }));
    };
    rec.start();
    setSeconds(0);
    setState("listening");
    timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  // Dictée limitée à 2 minutes.
  useEffect(() => {
    if (state === "listening" && seconds >= MAX_DICTATION_SECONDS) {
      onError(t.limit);
      stop();
    }
  }, [state, seconds, onError]);

  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  async function transcribe(recording: Blob) {
    setState("transcribing");
    try {
      const session = await ensureSession();
      if (!session) return onError(fr.search.errors.session);
      const audio = await recordingToWavBase64(recording);
      const result = await invokeFunction<{ status: string; text?: string }>(
        session.supabase,
        "transcribe",
        { audio },
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
  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      disabled={state === "transcribing"}
      aria-pressed={listening}
      className={`inline-flex min-h-touch items-center gap-2 rounded-button border px-4 font-medium disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        listening
          ? "border-danger bg-danger-soft text-danger"
          : "border-border bg-surface text-foreground hover:bg-background"
      }`}
    >
      <MicIcon />
      <span aria-live="polite">
        {state === "transcribing" ? t.transcribing : listening ? t.listening(seconds) : t.start}
      </span>
      {listening && <span className="sr-only">{t.stop}</span>}
    </button>
  );
}

function MicIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" />
    </svg>
  );
}
