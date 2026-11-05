"use client";

import type Vapi from "@vapi-ai/web";
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, focusRing } from "@/components/ui";
import { env } from "@/env";
import { fr } from "@/i18n/fr";

const t = fr.pro.assistant.voice;
const PUBLIC_KEY = env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
const ASSISTANT_ID = env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

type CallState = "idle" | "connecting" | "live" | "ended" | "failed";

/** La secrétaire vocale est-elle configurée (clé publique et assistant Vapi) ? */
export const voiceCallsEnabled = Boolean(PUBLIC_KEY && ASSISTANT_ID);

/**
 * Appel web avec la secrétaire vocale « Camille » (F-75, ADR 0225) : la bibliothèque de Vapi
 * (et son transport audio) n'est téléchargée qu'au premier appel. Le micro est demandé par le
 * navigateur au démarrage ; Camille annonce qu'elle est une IA dans sa première phrase.
 */
export function VoiceCall() {
  const [state, setState] = useState<CallState>("idle");
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const vapi = useRef<Vapi | null>(null);

  // Appel raccroché si la fenêtre se ferme ou si l'on quitte la page.
  useEffect(() => () => void vapi.current?.stop(), []);

  if (!voiceCallsEnabled || !PUBLIC_KEY || !ASSISTANT_ID) return null;

  async function start() {
    if (!PUBLIC_KEY || !ASSISTANT_ID) return;
    setState("connecting");
    setMuted(false);
    try {
      const { default: VapiClient } = await import("@vapi-ai/web");
      // avoidEval : pas d'eval dans le transport audio (politique de sécurité du site).
      const client = vapi.current ?? new VapiClient(PUBLIC_KEY, undefined, { avoidEval: true });
      if (!vapi.current) {
        client.on("call-start", () => setState("live"));
        client.on("call-end", () => {
          setState((current) => (current === "failed" ? current : "ended"));
          setSpeaking(false);
        });
        client.on("speech-start", () => setSpeaking(true));
        client.on("speech-end", () => setSpeaking(false));
        client.on("error", () => {
          setState("failed");
          setSpeaking(false);
        });
        vapi.current = client;
      }
      const call = await client.start(ASSISTANT_ID);
      if (!call) setState("failed");
    } catch {
      setState("failed");
    }
  }

  function toggleMute() {
    const next = !muted;
    vapi.current?.setMuted(next);
    setMuted(next);
  }

  if (state === "connecting" || state === "live") {
    return (
      <div
        role="status"
        className="flex items-center gap-3 rounded-input border border-primary/30 bg-primary-softer px-3 py-2"
      >
        <span className="relative flex size-3 shrink-0" aria-hidden="true">
          {state === "live" && (
            <span className="absolute inset-0 animate-ping rounded-full bg-primary/50 motion-reduce:hidden" />
          )}
          <span className="relative size-3 rounded-full bg-primary" />
        </span>
        <span className="min-w-0 flex-1 text-sm font-medium text-primary-strong">
          {state === "connecting" ? t.connecting : speaking ? t.speaking : t.live}
        </span>
        <button
          type="button"
          onClick={toggleMute}
          disabled={state !== "live"}
          aria-pressed={muted}
          aria-label={muted ? t.unmute : t.mute}
          title={muted ? t.unmute : t.mute}
          className={`inline-flex size-9 items-center justify-center rounded-full border border-border bg-surface text-foreground disabled:opacity-50 ${focusRing}`}
        >
          {muted ? (
            <MicOff aria-hidden="true" className="size-4" />
          ) : (
            <Mic aria-hidden="true" className="size-4" />
          )}
        </button>
        <button
          type="button"
          onClick={() => void vapi.current?.stop()}
          aria-label={t.hangUp}
          title={t.hangUp}
          className={`inline-flex size-9 items-center justify-center rounded-full bg-danger text-primary-foreground hover:opacity-90 ${focusRing}`}
        >
          <PhoneOff aria-hidden="true" className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button type="button" variant="outline" size="sm" onClick={start}>
        <Phone aria-hidden="true" className="size-4" />
        {t.start}
        <span className="font-normal text-muted-foreground">· {t.hint}</span>
      </Button>
      {state === "ended" && <p className="text-xs text-muted-foreground">{t.ended}</p>}
      {state === "failed" && (
        <p role="alert" className="text-xs text-danger">
          {t.failed}
        </p>
      )}
    </div>
  );
}
