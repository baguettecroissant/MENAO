"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";

/** Extrait de code à copier (kit partenaire, ADR 0138) ; reste sélectionnable si la copie échoue. */
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
