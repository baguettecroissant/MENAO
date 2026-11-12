import { Eye } from "lucide-react";
import { fr } from "@/i18n/fr";

/**
 * Bandeau des fiches consultées par le support (ADR 0286) : les boutons d'action n'y sont pas, et
 * la base refuse de toute façon ce que cet accès ne permet pas.
 */
export function ReadOnlyBanner() {
  return (
    <p
      role="note"
      className="flex items-center gap-2.5 rounded-card border border-primary/20 bg-primary-soft px-4 py-3 text-sm font-medium text-primary-strong"
    >
      <Eye aria-hidden="true" className="size-4 shrink-0" />
      {fr.admin.readOnly}
    </p>
  );
}
