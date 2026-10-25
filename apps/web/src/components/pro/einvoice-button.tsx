"use client";

import { Zap } from "lucide-react";
import { useState } from "react";
import { buttonClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.pro.expenses.einvoice;

/**
 * « Factures électroniques » (F-62) : réception par la plateforme agréée, pas encore choisie
 * (décision D13). Le bouton est déjà en place ; il dit seulement que c'est pour bientôt.
 */
export function EinvoiceButton() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={buttonClasses({ variant: "secondary", block: false })}
      >
        <Zap aria-hidden="true" className="size-4" />
        {t.button}
        <span className="rounded-chip bg-background px-2 py-0.5 text-xs text-muted-foreground">
          {t.soon}
        </span>
      </button>
      {open && (
        <p role="status" className="text-sm text-muted-foreground">
          {t.text}
        </p>
      )}
    </div>
  );
}
