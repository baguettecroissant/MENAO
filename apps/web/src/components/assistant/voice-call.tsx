"use client";

import type Vapi from "@vapi-ai/web";
import { voiceSquad, type VoiceSide } from "@menao/core";
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, focusRing } from "@/components/ui";
import { env } from "@/env";
import { fr } from "@/i18n/fr";

const t = fr.pro.assistant.voice;
const PUBLIC_KEY = env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
/** Camille côté artisans (pages Pro, ADR 0225) ou côté particuliers (demande de travaux, ADR 0227). */
const ASSISTANTS: Record<VoiceSide, string | undefined> = {
  pro: env.NEXT_PUBLIC_VAPI_ASSISTANT_ID,
  client: env.NEXT_PUBLIC_VAPI_CLIENT_ASSISTANT_ID,
};
export type VoiceAssistant = VoiceSide;
/** Secrétaire dédiée de l'artisan (ADR 0232), essayée depuis son espace. */
const SECRETARY_ID = env.NEXT_PUBLIC_VAPI_SECRETARY_ASSISTANT_ID;

/** Appel préparé par le serveur : variables de l'appel (dont le jeton signé), ou raison du refus. */
export type VoiceSession = { variables: Record<string, string> } | { error: string };

type CallState = "idle" | "connecting" | "live" | "ended" | "failed";

/**
 * Appel web avec la secrétaire vocale « Camille » (F-75, ADR 0225) : la bibliothèque de Vapi
 * (et son transport audio) n'est téléchargée qu'au premier appel. Le micro est demandé par le
 * navigateur au démarrage ; Camille annonce qu'elle est une IA dans sa première phrase.
 */
export function VoiceCall({
  assistant = "pro",
  session,
  labels,
}: {
  assistant?: VoiceAssistant | "secretary";
  /** Secrétaire : prépare l'appel (jeton et contexte de l'artisan) juste avant de le lancer. */
  session?: () => Promise<VoiceSession>;
  labels?: Partial<Record<"start" | "hint" | "live" | "speaking", string>>;
}) {
  const ASSISTANT_ID = assistant === "secretary" ? SECRETARY_ID : ASSISTANTS[assistant];
  const text = { ...t, ...labels };
  const [refusal, setRefusal] = useState<string | null>(null);
  const [state, setState] = useState<CallState>("idle");
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const vapi = useRef<Vapi | null>(null);

  // Appel raccroché si la fenêtre se ferme ou si l'on quitte la page.
  useEffect(() => () => void vapi.current?.stop(), []);

  if (!PUBLIC_KEY || !ASSISTANT_ID) return null;

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
      // Une seule Camille (ADR 0228) : les deux assistantes en groupe, celle de la page d'abord,
      // pour passer la main si l'appelant est de l'autre côté. Une seule configurée : elle seule.
      if (session) {
        setRefusal(null);
        const prepared = await session();
        if ("error" in prepared) {
          setRefusal(prepared.error);
          setState("idle");
          return;
        }
        const call = await client.start(ASSISTANT_ID, { variableValues: prepared.variables });
        if (!call) setState("failed");
        return;
      }
      const { pro, client: particuliers } = ASSISTANTS;
      const call =
        assistant !== "secretary" && pro && particuliers
          ? await client.start(
              undefined,
              undefined,
              voiceSquad(assistant as VoiceSide, { pro, client: particuliers }),
            )
          : await client.start(ASSISTANT_ID);
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
          {state === "connecting" ? t.connecting : speaking ? text.speaking : text.live}
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
        {text.start}
        <span className="font-normal text-muted-foreground">· {text.hint}</span>
      </Button>
      {state === "ended" && <p className="text-xs text-muted-foreground">{t.ended}</p>}
      {refusal && (
        <p role="alert" className="text-xs text-danger">
          {refusal}
        </p>
      )}
      {state === "failed" && (
        <p role="alert" className="text-xs text-danger">
          {t.failed}
        </p>
      )}
    </div>
  );
}
