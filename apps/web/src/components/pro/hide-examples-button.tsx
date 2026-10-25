"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { hideSpaceExamples } from "@/lib/artisan/example-actions";

const t = fr.pro.examples.inSpace;

/** « Masquer les exemples » de l'espace (ADR 0184). */
export function HideExamplesButton() {
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        block={false}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const { ok } = await hideSpaceExamples();
            setFailed(!ok);
          })
        }
      >
        {t.hide}
      </Button>
      {failed && (
        <p role="alert" className="text-xs text-danger">
          {t.hideError}
        </p>
      )}
    </div>
  );
}
