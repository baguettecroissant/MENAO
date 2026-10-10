"use client";

import { useState } from "react";
import { fr } from "@/i18n/fr";

const VISIBLE = 5;
// Ordre des maquettes : Électricité, Plomberie, Maçonnerie, Peinture, Terrassement, puis le reste.
const FEATURED = ["electricien", "plombier", "macon", "peintre", "terrassier"];

/**
 * Raccourcis métiers avec emoji (maquettes) : 5 visibles puis « … » pour afficher la suite.
 * Sélection unique (pré-remplit le métier recherché).
 */
export function TradeChips({
  trades,
  selected,
  onToggle,
}: {
  trades: { code: string; label: string }[];
  selected: string | null;
  onToggle: (code: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const ordered = [
    ...FEATURED.map((code) => trades.find((t) => t.code === code)).filter((t) => t !== undefined),
    ...trades.filter((t) => !FEATURED.includes(t.code)),
  ];
  // Le métier choisi reste visible même replié.
  const visible = ordered.slice(0, VISIBLE);
  const chosen = ordered.find((t) => t.code === selected);
  if (!expanded && chosen && !visible.includes(chosen)) visible.push(chosen);
  const list = expanded ? ordered : visible;
  return (
    <div
      role="group"
      aria-label={fr.search.tradesLegend}
      className="flex flex-wrap justify-center gap-2"
    >
      {list.map((trade) => {
        const domain = fr.tradeDomains[trade.code];
        const on = selected === trade.code;
        return (
          <button
            key={trade.code}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(trade.code)}
            className={`inline-flex min-h-8 items-center gap-1.5 rounded-pill border px-3 text-xs transition-colors focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none ${
              on
                ? "border-primary bg-primary-soft text-primary-strong"
                : "border-border bg-surface text-foreground hover:border-border-strong"
            }`}
          >
            <span aria-hidden="true">{domain?.emoji}</span>
            {domain?.label ?? trade.label}
          </button>
        );
      })}
      {ordered.length > VISIBLE && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? fr.search.lessTrades : fr.search.moreTrades}
          className="inline-flex min-h-8 items-center rounded-pill border border-border bg-surface px-3 text-xs text-muted-foreground hover:border-border-strong focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
        >
          {expanded ? "−" : "…"}
        </button>
      )}
    </div>
  );
}
