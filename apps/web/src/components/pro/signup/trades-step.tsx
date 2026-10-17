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
}: {
  trades: SignupTrade[];
  selected: string[];
  onChange: (codes: string[]) => void;
  onNext: () => void;
}) {
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
        <ul className="flex flex-col gap-2">
          {visible.map((trade) => {
            const on = selected.includes(trade.code);
            return (
              <li key={trade.code}>
                <label
                  className={`flex min-h-[3.25rem] cursor-pointer items-center gap-3 rounded-input border-[1.5px] px-4 text-base transition-colors focus-within:ring-4 focus-within:ring-primary/20 hover:border-primary ${
                    on ? "border-primary bg-primary-softer" : "border-border bg-surface"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(trade.code)}
                    className="size-5 shrink-0 accent-primary"
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
      <StepFooter>
        <Button size="lg" onClick={onNext} disabled={selected.length === 0}>
          {selected.length ? t.trades.continue(selected.length) : t.continue}
          <ArrowRight aria-hidden="true" className="size-5" />
        </Button>
      </StepFooter>
    </>
  );
}
