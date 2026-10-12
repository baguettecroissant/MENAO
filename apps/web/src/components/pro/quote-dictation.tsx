"use client";

import { MAX_DICTATION_SECONDS, type VoiceLine } from "@menao/core";
import { LoaderCircle, Mic, Pause, Save, Sparkles, X } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { MicLevel } from "@/components/project/mic-level";
import { Alert, Button, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { saveDictation } from "@/lib/artisan/quote-actions";
import { ensureSession, invokeFunction } from "@/lib/project/client";
import { dictationSupported, recordingToWav } from "@/lib/project/dictation";
import { useMicLevel } from "@/lib/project/use-mic-level";

const t = fr.pro.quote.dictation;

type Phase = "idle" | "recording" | "transcribing";

/**
 * Dictée intelligente (F-19), maquettes « Dictez votre devis » : enregistrement par étapes
 * (2 minutes au total), chaque étape transcrite et ajoutée au texte (modifiable), puis lignes
 * proposées par quote-from-voice, à vérifier dans l'éditeur.
 */
export function QuoteDictation({
  chantierId,
  savedTranscript,
  defaultVatBp,
  onLines,
}: {
  chantierId: string;
  savedTranscript: string | null;
  defaultVatBp: number;
  onLines: (lines: VoiceLine[]) => void;
}) {
  const id = useId();
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState(savedTranscript ?? "");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, startSaving] = useTransition();
  const recorder = useRef<MediaRecorder | null>(null);
  // Flux du micro pendant l'enregistrement : niveau affiché et silence prolongé signalé.
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const mic = useMicLevel(micStream);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  // Effacement pendant l'enregistrement : l'étape en cours n'est pas transcrite.
  const discarding = useRef(false);
  // Durée totale enregistrée (toutes étapes), limitée à 2 minutes.
  const elapsed = useRef(0);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      discarding.current = true;
      recorder.current?.stream.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  async function record() {
    setError(null);
    setInfo(null);
    if (!dictationSupported()) return setError(t.unsupported);
    if (elapsed.current >= MAX_DICTATION_SECONDS) return setError(t.limit);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return setError(t.denied);
    }
    const chunks: Blob[] = [];
    const rec = new MediaRecorder(stream);
    recorder.current = rec;
    discarding.current = false;
    rec.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    rec.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      setMicStream(null);
      if (timer.current) clearInterval(timer.current);
      if (discarding.current) return setPhase("idle");
      void transcribe(new Blob(chunks, { type: rec.mimeType }));
    };
    rec.start();
    setMicStream(stream);
    setPhase("recording");
    timer.current = setInterval(tick, 1000);
  }

  function tick() {
    elapsed.current += 1;
    setSeconds(elapsed.current);
    if (elapsed.current >= MAX_DICTATION_SECONDS) {
      setError(t.limit);
      pause();
    }
  }

  function pause() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  async function transcribe(recording: Blob) {
    setPhase("transcribing");
    try {
      const audio = await recordingToWav(recording);
      // Rien de capté (micro coupé, mauvais micro) : ni session ni transcription.
      if (audio.silent) return setError(t.silent);
      const session = await ensureSession();
      if (!session) return setError(t.failed);
      const result = await invokeFunction<{ status: string; text?: string }>(
        session.supabase,
        "transcribe",
        { audio: audio.base64 },
      );
      const text = result.status === "ok" && "text" in result ? result.text?.trim() : null;
      if (text) setTranscript((current) => [current.trim(), text].filter(Boolean).join(" "));
      else setError(result.status === "rate_limited" ? t.rateLimited : t.failed);
    } catch {
      setError(t.failed);
    } finally {
      setPhase("idle");
    }
  }

  function discard() {
    discarding.current = true;
    pause();
    setTranscript("");
    elapsed.current = 0;
    setSeconds(0);
    setError(null);
    setInfo(null);
  }

  function save() {
    setError(null);
    startSaving(async () => {
      const result = await saveDictation(chantierId, transcript);
      if (result.ok) setInfo(t.saved);
      else setError(result.error);
    });
  }

  async function generate() {
    setError(null);
    setInfo(null);
    setGenerating(true);
    try {
      const session = await ensureSession();
      if (!session) return setError(t.unavailable);
      const result = await invokeFunction<{ status: string; lines?: VoiceLine[] }>(
        session.supabase,
        "quote-from-voice",
        { chantierId, transcript, defaultVatBp },
      );
      const lines = result.status === "ok" && "lines" in result ? (result.lines ?? []) : [];
      if (lines.length) onLines(lines);
      else
        setError(
          result.status === "empty"
            ? t.empty
            : result.status === "rate_limited"
              ? t.rateLimited
              : t.unavailable,
        );
    } catch {
      setError(t.unavailable);
    } finally {
      setGenerating(false);
    }
  }

  const recording = phase === "recording";
  const busy = phase !== "idle" || generating;
  const hasText = transcript.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-start gap-2 text-xs text-primary-strong">
        <Sparkles aria-hidden="true" className="mt-px size-3.5 shrink-0" />
        {t.example}
      </p>

      <div className="flex items-center gap-3">
        <div
          role="progressbar"
          aria-label={recording ? t.recording : t.timer(seconds, MAX_DICTATION_SECONDS)}
          aria-valuemin={0}
          aria-valuemax={MAX_DICTATION_SECONDS}
          aria-valuenow={seconds}
          className="h-1.5 flex-1 overflow-hidden rounded-pill bg-border"
        >
          <div
            className="h-full rounded-pill bg-primary transition-[width]"
            style={{ width: `${Math.min(100, (seconds / MAX_DICTATION_SECONDS) * 100)}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {t.timer(seconds, MAX_DICTATION_SECONDS)}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-texte`} className="sr-only">
          {t.transcriptLabel}
        </label>
        <textarea
          id={`${id}-texte`}
          value={transcript}
          onChange={(event) => setTranscript(event.target.value)}
          maxLength={5000}
          rows={6}
          placeholder={t.placeholder}
          className={`${inputClasses} min-h-36 py-3 leading-relaxed`}
        />
      </div>

      <div className="flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={discard}
          disabled={!hasText && !recording && seconds === 0}
          aria-label={t.discard}
          className="inline-flex size-10 items-center justify-center rounded-full bg-danger text-primary-foreground hover:opacity-90 focus-visible:ring-4 focus-visible:ring-danger/25 focus-visible:outline-none disabled:bg-border-strong"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
        <span className="relative inline-flex">
          {recording && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-primary/40 motion-reduce:hidden"
            />
          )}
          <button
            type="button"
            onClick={recording ? pause : record}
            disabled={phase === "transcribing" || generating}
            aria-pressed={recording}
            aria-label={recording ? t.pause : seconds > 0 ? t.resume : t.record}
            className="inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-4 focus-visible:ring-primary/25 focus-visible:outline-none disabled:opacity-70"
          >
            {phase === "transcribing" ? (
              <LoaderCircle aria-hidden="true" className="size-6 animate-spin" />
            ) : recording ? (
              <Pause aria-hidden="true" className="size-6" />
            ) : (
              <Mic aria-hidden="true" className="size-6" />
            )}
          </button>
        </span>
      </div>
      <p
        aria-live="polite"
        className={`flex min-h-4 items-center justify-center gap-2 text-center text-xs ${
          recording && mic.quiet ? "font-medium text-warning" : "text-muted-foreground"
        }`}
      >
        {recording && <MicLevel level={mic.level} />}
        {phase === "transcribing"
          ? t.transcribing
          : recording
            ? mic.quiet
              ? t.quiet
              : t.recording
            : ""}
      </p>

      {error && <Alert tone="error">{error}</Alert>}
      {info && <Alert tone="success">{info}</Alert>}

      <div className="flex flex-col items-center gap-1 text-center">
        <button
          type="button"
          onClick={save}
          disabled={!hasText || busy || saving}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-pill px-3 text-sm font-medium text-primary-strong hover:bg-primary-softer focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none disabled:text-subtle-foreground disabled:hover:bg-transparent"
        >
          {t.save}
          <Save aria-hidden="true" className="size-4" />
        </button>
        <p className="text-xs text-muted-foreground">{t.saveHint}</p>
      </div>

      <Button type="button" size="lg" onClick={generate} disabled={!hasText || busy}>
        {generating ? t.generating : t.generate}
      </Button>
    </div>
  );
}
