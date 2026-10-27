"use client";

import { ChevronDown } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";

/**
 * Bloc replié (comparatif des formules, ADR 0200) : le début reste visible, fondu vers le bas,
 * et un bouton déplie le reste. `overflow-clip` plutôt que `hidden` : l'en-tête collé du
 * tableau continue de suivre la page. Replier ramène en haut du bloc.
 */
export function Collapsible({
  children,
  moreLabel,
  lessLabel,
}: {
  children: ReactNode;
  moreLabel: string;
  lessLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const top = useRef<HTMLDivElement>(null);

  return (
    <div ref={top} className="flex scroll-mt-40 flex-col items-center gap-4">
      <div id={id} className={`relative w-full ${open ? "" : "max-h-[30rem] overflow-clip"}`}>
        {children}
        {!open && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-surface/0 to-surface"
          />
        )}
      </div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          if (open) top.current?.scrollIntoView({ block: "start" });
          setOpen(!open);
        }}
        className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-border bg-surface px-5 text-sm font-medium text-foreground shadow-card transition-colors hover:bg-background"
      >
        {open ? lessLabel : moreLabel}
        <ChevronDown
          aria-hidden="true"
          className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
    </div>
  );
}
