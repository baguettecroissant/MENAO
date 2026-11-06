"use client";

import { parseVoiceToolCalls } from "@menao/core";
import { useEffect, useState } from "react";
import { VoiceCall, type VoiceSession } from "@/components/assistant/voice-call";
import { env } from "@/env";
import { fr } from "@/i18n/fr";

const t = fr.pro.quote.conversation;
// Aucun achat évoqué dans l'application (CLAUDE.md règle 10).
const ERRORS: Record<string, string> = { ...t.errors, minutes_epuisees: t.appMinutes };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Posé par l'application avant le chargement de la page : session et chantier. */
type Bridge = { token: string; chantierId: string };

declare global {
  interface Window {
    __MENAO_APP__?: Partial<Bridge>;
    ReactNativeWebView?: { postMessage: (message: string) => void };
  }
}

const post = (message: Record<string, unknown>) =>
  window.ReactNativeWebView?.postMessage(JSON.stringify(message));

/** Appel « devis » préparé par voice-session avec la session de l'application. */
async function prepare(bridge: Bridge): Promise<VoiceSession> {
  try {
    const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/voice-session`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bridge.token}`,
        apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ usage: "devis", chantierId: bridge.chantierId }),
    });
    const data = (await response.json().catch(() => null)) as {
      status?: string;
      assistantId?: unknown;
      variables?: unknown;
    } | null;
    if (
      response.ok &&
      data?.status === "ok" &&
      typeof data.assistantId === "string" &&
      data.variables &&
      typeof data.variables === "object"
    ) {
      return {
        variables: data.variables as Record<string, string>,
        assistantId: data.assistantId,
      };
    }
    return { error: ERRORS[data?.status ?? ""] ?? ERRORS.generic ?? fr.errors.generic };
  } catch {
    return { error: ERRORS.generic ?? fr.errors.generic };
  }
}

/**
 * « Dicter avec Camille » dans l'application (ADR 0235) : le kit vocal de Vapi ne tourne pas dans
 * l'application, la conversation passe par cette page intégrée. Elle lance l'appel dès
 * l'affichage et renvoie à l'application le début de l'appel, chaque liste de lignes proposée par
 * Camille (outil devis_proposer, relue par l'application avec @menao/core) et la fin de l'appel.
 */
export function AppQuoteCall() {
  const [bridge, setBridge] = useState<Bridge | null | undefined>(undefined);

  useEffect(() => {
    const b = window.__MENAO_APP__;
    // Lu une fois au montage : la valeur est posée par l'application avant le chargement.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBridge(
      typeof b?.token === "string" &&
        b.token &&
        typeof b.chantierId === "string" &&
        UUID.test(b.chantierId)
        ? { token: b.token, chantierId: b.chantierId }
        : null,
    );
  }, []);

  if (bridge === undefined) return null;
  if (bridge === null) return <p className="text-sm text-muted-foreground">{t.outsideApp}</p>;

  return (
    <VoiceCall
      assistant="quote"
      autoStart
      session={() => prepare(bridge)}
      labels={{ start: t.start, hint: t.hint, live: t.live, speaking: t.speaking }}
      hintOnMobile={false}
      onMessage={(message) => {
        if ((message as { type?: unknown } | null)?.type !== "tool-calls") return;
        for (const call of parseVoiceToolCalls(message)) {
          if (call.name === "devis_proposer") post({ type: "lignes", lignes: call.args.lignes });
        }
      }}
      onCallStarted={(callId) => post({ type: "debut", callId })}
      onCallEnded={() => post({ type: "fin" })}
    />
  );
}
