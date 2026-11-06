"use client";

import {
  VAT_EXEMPT_BP,
  VAT_RATES_BP,
  normalizeVoiceLines,
  parseVoiceToolCalls,
  rawVoiceLinesFrom,
} from "@menao/core";
import type { QuoteLineInput } from "@menao/validation";
import { useRef } from "react";
import { VoiceCall } from "@/components/assistant/voice-call";
import { fr } from "@/i18n/fr";
import { prepareQuoteCall, voiceQuoteDraftForCall } from "@/lib/artisan/quote-actions";

const t = fr.pro.quote.conversation;

/**
 * « Dicter avec Camille » (F-85, ADR 0234) : appel web avec Camille depuis l'éditeur de devis.
 * Chaque liste proposée par Camille (outil devis_proposer) remplace celle d'avant dans l'éditeur,
 * lue avec les mêmes règles que le serveur ; à la fin de l'appel, les lignes enregistrées par le
 * serveur font foi. Rien n'est enregistré dans le devis sans l'artisan.
 */
export function QuoteConversation({
  chantierId,
  assujettiTva,
  onStart,
  onLines,
}: {
  chantierId: string;
  assujettiTva: boolean;
  /** Nouvel appel : ses lignes s'ajoutent à celles déjà dans l'éditeur. */
  onStart: () => void;
  /** Liste complète des lignes de l'appel en cours. */
  onLines: (lines: QuoteLineInput[]) => void;
}) {
  const callId = useRef<string | null>(null);
  const options = {
    assujettiTva,
    defaultVatBp: assujettiTva ? (VAT_RATES_BP.at(-1) ?? 2000) : VAT_EXEMPT_BP,
  };

  function onMessage(message: unknown) {
    if ((message as { type?: unknown } | null)?.type !== "tool-calls") return;
    for (const call of parseVoiceToolCalls(message)) {
      if (call.name !== "devis_proposer") continue;
      const lines = normalizeVoiceLines(rawVoiceLinesFrom(call.args.lignes), options);
      if (lines.length > 0) onLines(lines);
    }
  }

  async function onCallEnded() {
    const id = callId.current;
    callId.current = null;
    if (!id) return;
    const lines = await voiceQuoteDraftForCall(chantierId, id);
    if (lines.length > 0) onLines(lines);
  }

  return (
    <VoiceCall
      assistant="quote"
      session={() => prepareQuoteCall(chantierId)}
      labels={{ start: t.start, hint: t.hint, live: t.live, speaking: t.speaking }}
      hintOnMobile={false}
      onMessage={onMessage}
      onCallStarted={(id) => {
        callId.current = id;
        onStart();
      }}
      onCallEnded={() => void onCallEnded()}
    />
  );
}
