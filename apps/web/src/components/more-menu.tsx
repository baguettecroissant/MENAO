"use client";

import { Ellipsis } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { buttonClasses } from "@/components/ui";

export type MoreMenuItem =
  | { kind: "link"; href: string; label: string }
  /** Fichier téléchargé (route), pas une page. */
  | { kind: "download"; href: string; label: string }
  /** Élément annoncé mais pas encore actif (« Bientôt »). */
  | { kind: "soon"; label: string; soon: string; note: string };

/**
 * Menu « … » des actions secondaires d'une liste (ADR 0189) : exporter, envoi au comptable…
 * Le bouton principal reste seul à côté. Se ferme au clic dehors et avec Échap.
 */
export function MoreMenu({ label, items }: { label: string; items: readonly MoreMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === "Escape"
          : !root.current?.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const item =
    "flex min-h-11 w-full items-center justify-between gap-3 rounded-input px-3 text-left text-sm hover:bg-background focus-visible:bg-background focus-visible:outline-none";
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          setNote(null);
        }}
        className={`${buttonClasses({ variant: "secondary", block: false })} px-3`}
      >
        <Ellipsis aria-hidden="true" className="size-5" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 flex w-72 flex-col gap-0.5 rounded-card border border-border bg-surface p-1.5 shadow-raised"
        >
          {items.map((entry) =>
            entry.kind === "link" ? (
              <Link key={entry.label} role="menuitem" href={entry.href as Route} className={item}>
                {entry.label}
              </Link>
            ) : entry.kind === "download" ? (
              <a key={entry.label} role="menuitem" href={entry.href} className={item}>
                {entry.label}
              </a>
            ) : (
              <button
                key={entry.label}
                type="button"
                role="menuitem"
                onClick={() => setNote(entry.note)}
                className={`${item} text-muted-foreground`}
              >
                {entry.label}
                <span className="rounded-chip bg-background px-2 py-0.5 text-xs">{entry.soon}</span>
              </button>
            ),
          )}
          {note && (
            <p role="status" className="px-3 pt-1 pb-2 text-xs text-muted-foreground">
              {note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
