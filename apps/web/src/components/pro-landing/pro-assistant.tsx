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
 * Assistant des pages Pro (F-69, ADR 0218) : bouton « Une question ? » en bas à droite, qui ouvre
 * la conversation. Les questions fréquentes de la page y ont une réponse immédiate ; les autres
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
          className={`animate-menao-fade-up fixed right-4 bottom-4 z-40 inline-flex min-h-12 items-center gap-2 rounded-pill bg-primary px-5 text-[0.9375rem] font-medium text-white shadow-raised transition hover:bg-primary-strong sm:right-6 sm:bottom-6 ${focusRing}`}
        >
          <MessageCircle aria-hidden="true" className="size-5" />
          {t.open}
        </button>
      )}
    </>
  );
}
