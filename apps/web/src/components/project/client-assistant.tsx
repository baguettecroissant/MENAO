"use client";

import type { ClientDraft } from "@menao/core";
import { MessageCircle } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.search.assistant;

// Fenêtre chargée au premier clic : rien de plus à télécharger pour les autres visiteurs.
const ClientAssistantPanel = lazy(() =>
  import("./client-assistant-panel").then((m) => ({ default: m.ClientAssistantPanel })),
);

/**
 * Accès à l'assistant des particuliers (F-71, ADR 0220), sous la saisie du besoin : pour qui ne
 * sait pas comment décrire son problème ou a une question avant de se lancer. La demande préparée
 * remplit le champ de saisie.
 */
export function ClientAssistant({
  trades,
  onUseDraft,
}: {
  trades: { code: string; label: string }[];
  onUseDraft: (draft: ClientDraft) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <p className="max-w-xl text-center text-sm text-muted-foreground">
        {t.open}{" "}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`inline-flex items-center gap-1 rounded-sm font-medium text-primary-strong underline-offset-2 hover:underline ${focusRing}`}
        >
          <MessageCircle aria-hidden="true" className="size-4" />
          {t.openAction}
        </button>
      </p>
      {open && (
        <Suspense fallback={null}>
          <ClientAssistantPanel
            trades={trades}
            onClose={() => setOpen(false)}
            onUseDraft={(draft) => {
              setOpen(false);
              onUseDraft(draft);
            }}
          />
        </Suspense>
      )}
    </>
  );
}
