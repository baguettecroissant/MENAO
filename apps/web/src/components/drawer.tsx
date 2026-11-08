"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * Tiroir des maquettes (« bottom sheet ») : collé en bas de l'écran sur mobile, fenêtre centrée
 * sur ordinateur. Élément <dialog> natif : focus gardé dans le tiroir, touche Échap, fond assombri.
 */
export function Drawer({
  open,
  onClose,
  title,
  backLabel,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Lien « Retour » des maquettes, en haut à droite. */
  backLabel: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        // Clic sur le fond assombri (en dehors du contenu).
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-0 mt-auto max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-[1.625rem] bg-surface p-0 text-foreground shadow-raised backdrop:bg-[#0b1230]/50 sm:m-auto sm:max-w-xl sm:rounded-[1.375rem]"
    >
      {/* Refonte « Nette » (ADR 0255) : poignée sur téléphone, grand titre, fermeture ronde. */}
      <span
        aria-hidden="true"
        className="mx-auto mt-2.5 block h-1.5 w-10 rounded-pill bg-border-strong sm:hidden"
      />
      <div className="flex flex-col gap-5 px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <h2
            id={titleId}
            className="font-display text-[1.375rem] leading-tight font-bold tracking-tight sm:text-2xl"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={backLabel}
            title={backLabel}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-foreground hover:bg-border focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
          >
            <X aria-hidden="true" className="size-[1.125rem]" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
