"use client";

import { useEffect, useState } from "react";
import { VoiceCall, type VoiceSession } from "@/components/assistant/voice-call";
import { env } from "@/env";
import { fr } from "@/i18n/fr";

const t = fr.pro.onboarding.plans.secretary;
// Aucun achat évoqué dans l'application (CLAUDE.md règle 10).
const ERRORS: Record<string, string> = {
  ...t.errors,
  non_inclus: t.appNotIncluded,
  minutes_epuisees: t.appMinutes,
};

// `window.__MENAO_APP__` et `ReactNativeWebView` : déclarés avec app-quote-call.tsx.
const post = (message: Record<string, unknown>) =>
  window.ReactNativeWebView?.postMessage(JSON.stringify(message));

/** Appel d'essai préparé par voice-session avec la session de l'application. */
async function prepare(token: string): Promise<VoiceSession> {
  try {
    const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/voice-session`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
    });
    const data = (await response.json().catch(() => null)) as {
      status?: string;
      variables?: unknown;
    } | null;
    if (
      response.ok &&
      data?.status === "ok" &&
      data.variables &&
      typeof data.variables === "object"
    ) {
      return { variables: data.variables as Record<string, string> };
    }
    return { error: ERRORS[data?.status ?? ""] ?? ERRORS.generic ?? fr.errors.generic };
  } catch {
    return { error: ERRORS.generic ?? fr.errors.generic };
  }
}

/**
 * « L'essayer » dans l'application (ADR 0362) : le kit vocal de Vapi ne tourne pas dans
 * l'application, l'appel d'essai passe par cette page intégrée, comme « Dicter avec Manon »
 * (ADR 0235). Elle lance l'appel dès l'affichage et prévient l'application quand il se termine.
 */
export function AppSecretaryCall() {
  const [token, setToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const value = window.__MENAO_APP__?.token;
    // Lu une fois au montage : la valeur est posée par l'application avant le chargement.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(typeof value === "string" && value ? value : null);
  }, []);

  if (token === undefined) return null;
  if (token === null) return <p className="text-sm text-muted-foreground">{t.outsideApp}</p>;

  return (
    <VoiceCall
      assistant="secretary"
      autoStart
      session={() => prepare(token)}
      labels={{ start: t.testStart, hint: t.testHint, live: t.live, speaking: t.speaking }}
      hintOnMobile={false}
      onCallEnded={() => post({ type: "fin" })}
    />
  );
}
