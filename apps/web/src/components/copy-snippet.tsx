"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";

/** Extrait à copier (kit et espace partenaire, ADR 0138, 0139) ; reste sélectionnable si la copie échoue. */
export function CopySnippet({
  id,
  label,
  value,
  copyLabel,
  copiedLabel,
}: {
  id: string;
  label: string;
  value: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copie refusée par le navigateur : l'extrait reste sélectionnable.
    }
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <Button type="button" variant="ghost" size="sm" block={false} onClick={copy}>
          {copied ? (
            <Check aria-hidden="true" className="size-4" />
          ) : (
            <Copy aria-hidden="true" className="size-4" />
          )}
          {copied ? copiedLabel : copyLabel}
        </Button>
      </div>
      <textarea
        id={id}
        readOnly
        value={value}
        rows={Math.min(4, value.split("\n").length + 1)}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 font-mono text-[0.75rem] break-all"
      />
    </div>
  );
}

/** Copie dans le presse-papiers, avec « Copié » pendant 2 s ; rien si le navigateur refuse. */
function useCopy(value: string) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copie refusée par le navigateur : la valeur reste sélectionnable.
    }
  }
  return { copied, copy };
}

/** Bouton « Copier » en pilule (maquette du lot 38). */
export function CopyButton({
  value,
  copyLabel,
  copiedLabel,
  describedBy,
}: {
  value: string;
  copyLabel: string;
  copiedLabel: string;
  /** Champ ou intitulé que le bouton copie, pour les lecteurs d'écran. */
  describedBy?: string;
}) {
  const { copied, copy } = useCopy(value);
  return (
    <button
      type="button"
      onClick={copy}
      aria-describedby={describedBy}
      className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-pill border border-border-strong bg-surface px-3.5 text-[0.8125rem] font-semibold hover:bg-background focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
    >
      {copied ? (
        <Check aria-hidden="true" className="size-4 text-success" />
      ) : (
        <Copy aria-hidden="true" className="size-4" />
      )}
      {copied ? copiedLabel : copyLabel}
    </button>
  );
}

/** Lien à copier sur une ligne, avec son intitulé et le bouton « Copier » dans le champ. */
export function CopyField({
  id,
  label,
  value,
  copyLabel,
  copiedLabel,
}: {
  id: string;
  label: string;
  value: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-input border border-border bg-background py-1 pr-1 pl-3.5">
        <input
          id={id}
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 truncate bg-transparent py-1.5 text-[0.8125rem] text-label outline-none"
        />
        <CopyButton
          value={value}
          copyLabel={copyLabel}
          copiedLabel={copiedLabel}
          describedBy={id}
        />
      </div>
    </div>
  );
}
