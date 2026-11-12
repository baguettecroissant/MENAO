"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { SearchInput, StepFooter, StepTitle, normalizeSearch } from "./signup-ui";

const t = fr.pro.signUp;

export type SignupTrade = { code: string; label: string };

/** Étape « métiers » : liste à cocher, avec une recherche. */
export function TradesStep({
  trades,
  selected,
  onChange,
  onNext,
  maxTrades = null,
}: {
  trades: SignupTrade[];
  selected: string[];
  onChange: (codes: string[]) => void;
  onNext: () => void;
  /** Limite de métiers de la formule de Base (ADR 0290) ; null : illimité. */
  maxTrades?: number | null;
}) {
  const full = maxTrades !== null && selected.length >= maxTrades;
  const over = maxTrades !== null && selected.length > maxTrades;
  const [query, setQuery] = useState("");
  const q = normalizeSearch(query);
  const visible = trades.filter((trade) => !q || normalizeSearch(trade.label).includes(q));

  function toggle(code: string) {
    onChange(selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code]);
  }

  return (
    <>
      <StepTitle title={t.trades.title} lead={t.trades.lead} />
      <SearchInput label={t.trades.search} value={query} onChange={setQuery} />
      <fieldset className="min-w-0">
        <legend className="sr-only">{t.trades.title}</legend>
        <ul className="flex flex-wrap gap-2">
          {visible.map((trade) => {
            const on = selected.includes(trade.code);
            const locked = full && !on;
            return (
              <li key={trade.code}>
                <label
                  className={`flex min-h-11 items-center gap-2.5 rounded-pill border px-4 text-[0.9375rem] font-semibold transition-colors focus-within:ring-4 focus-within:ring-primary/20 ${
                    on
                      ? "cursor-pointer border-foreground bg-foreground text-white"
                      : locked
                        ? "cursor-not-allowed border-border bg-surface text-subtle-foreground"
                        : "cursor-pointer border-border-strong bg-surface hover:border-foreground"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={locked}
                    onChange={() => toggle(trade.code)}
                    className="size-4 shrink-0 accent-white"
                  />
                  {trade.label}
                </label>
              </li>
            );
          })}
        </ul>
        {visible.length === 0 && (
          <p className="rounded-input border border-border bg-surface p-4 text-[0.9375rem] text-muted-foreground">
            {t.trades.none(query)}
          </p>
        )}
      </fieldset>
      {maxTrades !== null && (
        <p className={`text-sm ${over ? "text-danger" : "text-muted-foreground"}`} role="note">
          {t.trades.limit(maxTrades)}
        </p>
      )}
      <StepFooter>
        <Button size="lg" onClick={onNext} disabled={selected.length === 0 || over}>
          {selected.length ? t.trades.continue(selected.length) : t.continue}
          <ArrowRight aria-hidden="true" className="size-5" />
        </Button>
      </StepFooter>
    </>
  );
}
