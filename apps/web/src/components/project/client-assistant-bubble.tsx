"use client";

import type { ClientDraft } from "@menao/core";
import { useRouter } from "next/navigation";
import { lazy, Suspense, useState } from "react";
import { AssistantBubble } from "@/components/assistant/assistant-ui";
import { fr } from "@/i18n/fr";
import { handOffDraft } from "@/lib/project/assistant-draft";

const t = fr.search.assistant;

// Fenêtre chargée au premier clic : rien de plus à télécharger pour les autres visiteurs.
const ClientAssistantPanel = lazy(() =>
  import("./client-assistant-panel").then((m) => ({ default: m.ClientAssistantPanel })),
);

/**
 * Bulle de l'assistant des particuliers (ADR 0220) sur les pages d'information du site (accueil,
 * fonctionnement, garanties, FAQ, guides, pages métier et ville). La demande préparée est passée
 * à la page de recherche, qui la reprend dans le champ de saisie.
 */
export function ClientAssistantBubble({ trades }: { trades: { code: string; label: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && (
        <Suspense fallback={null}>
          <ClientAssistantPanel
            trades={trades}
            onClose={() => setOpen(false)}
            onUseDraft={(draft: ClientDraft) => {
              handOffDraft(draft);
              setOpen(false);
              router.push("/recherche");
            }}
          />
        </Suspense>
      )}
      {!open && (
        <AssistantBubble label={t.bubbleLabel} title={t.bubbleTitle} onOpen={() => setOpen(true)} />
      )}
    </>
  );
}
