"use client";

import { MessageCircle } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.pro.assistant;

// Fenêtre chargée au premier clic : rien de plus à télécharger pour les autres visiteurs.
const ProAssistantPanel = lazy(() =>
  import("./pro-assistant-panel").then((m) => ({ default: m.ProAssistantPanel })),
);

/**
 * Assistant des pages Pro (F-69, ADR 0218) : bulle ronde en bas à droite, qui ouvre la
 * conversation. Les questions fréquentes de la page y ont une réponse immédiate ; les autres
 * passent par l'IA (Edge Function pro-assistant).
 */
export function ProAssistant() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && (
        <Suspense fallback={null}>
          <ProAssistantPanel onClose={() => setOpen(false)} />
        </Suspense>
      )}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t.openLabel}
          title={t.open}
          className={`animate-menao-bubble-in group fixed right-4 bottom-4 z-40 inline-flex size-14 items-center justify-center rounded-pill bg-[linear-gradient(135deg,#1a2b85_0%,#4869f6_100%)] text-white shadow-raised ring-2 ring-white transition-transform duration-200 hover:scale-105 active:scale-95 sm:right-6 sm:bottom-6 ${focusRing}`}
        >
          {/* Halo discret : trois pulsations après l'arrivée, puis plus rien. */}
          <span
            aria-hidden="true"
            className="animate-menao-halo pointer-events-none absolute inset-0 rounded-pill bg-primary"
          />
          <MessageCircle
            aria-hidden="true"
            className="relative size-6 fill-white transition-transform duration-200 group-hover:-rotate-6"
          />
        </button>
      )}
    </>
  );
}
