import { fr } from "@/i18n/fr";
import { toast, UNDO_DELAY_MS } from "@/ui";

/**
 * Action annulable (ADR 0195), plutôt qu'une confirmation : appliquée tout de suite à l'écran,
 * envoyée au bout de 5 secondes sauf « Annuler ». Si l'envoi échoue, l'écran revient comme avant
 * avec un message. Si l'application est fermée avant les 5 secondes, rien n'est envoyé.
 */
export function runUndoable({
  message,
  apply,
  revert,
  commit,
  failed,
}: {
  message: string;
  apply: () => void;
  revert: () => void;
  commit: () => Promise<boolean>;
  failed: string;
}): void {
  apply();
  let undone = false;
  const timer = setTimeout(async () => {
    if (undone) return;
    const ok = await commit();
    if (!ok) {
      revert();
      toast.error(failed);
    }
  }, UNDO_DELAY_MS);
  toast.undo(message, fr.toastUndo, () => {
    undone = true;
    clearTimeout(timer);
    revert();
  });
}
