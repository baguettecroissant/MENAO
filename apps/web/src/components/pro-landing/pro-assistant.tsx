"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import { AssistantBubble } from "@/components/assistant/assistant-ui";
import { fr } from "@/i18n/fr";
import { CALLBACK_HASH } from "./callback-hash";

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
  const [open, setOpen] = useState<false | "chat" | "callback">(false);

  // Boutons « Être rappelé » de la page (lien #etre-rappele, ADR 0265) : ouvre le formulaire de
  // rappel. Sans JavaScript, le lien ne fait rien de gênant.
  useEffect(() => {
    const openCallback = () => {
      if (window.location.hash !== `#${CALLBACK_HASH}`) return;
      setOpen("callback");
      history.replaceState(null, "", window.location.pathname + window.location.search);
    };
    openCallback();
    window.addEventListener("hashchange", openCallback);
    return () => window.removeEventListener("hashchange", openCallback);
  }, []);

  return (
    <>
      {open && (
        <Suspense fallback={null}>
          <ProAssistantPanel initialView={open} onClose={() => setOpen(false)} />
        </Suspense>
      )}
      {!open && (
        <AssistantBubble label={t.openLabel} title={t.open} onOpen={() => setOpen("chat")} />
      )}
    </>
  );
}
