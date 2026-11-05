"use client";

import { lazy, Suspense, useState } from "react";
import { AssistantBubble } from "@/components/assistant/assistant-ui";
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
      {!open && <AssistantBubble label={t.openLabel} title={t.open} onOpen={() => setOpen(true)} />}
    </>
  );
}
