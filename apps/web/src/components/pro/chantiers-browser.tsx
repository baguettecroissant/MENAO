"use client";

import { CHANTIER_PHASES, chantierPhase, type ChantierPhase } from "@menao/core";
import { Search } from "lucide-react";
import { useState } from "react";
import { fr } from "@/i18n/fr";
import { ChantierList, type ChantierListItem } from "./chantier-list";
import { ListGroupTitle } from "./list-group-title";

const l = fr.pro.worklists;

type Filter = "tous" | ChantierPhase;

const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Filtres et recherche de la liste des chantiers (refonte « Nette », ADR 0248) : par phase
 * (avant devis, devis et paiement, travaux, terminés) et par client, ville ou titre. « Tous »
 * montre d'abord les chantiers en cours, puis les terminés à part. Filtres soulignés en grand
 * écran, pastilles qui défilent sur téléphone.
 */
export function ChantiersBrowser({
  rows,
  base,
  example = false,
}: {
  rows: readonly ChantierListItem[];
  base?: string;
  example?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("tous");
  const [query, setQuery] = useState("");
  const needle = normalize(query.trim());
  const matching = needle
    ? rows.filter((r) =>
        normalize(
          [r.title, r.client_first_name, r.client_last_name, r.code_postal, r.ville_nom]
            .filter(Boolean)
            .join(" "),
        ).includes(needle),
      )
    : rows;
  const count = (f: Filter) =>
    f === "tous" ? rows.length : rows.filter((r) => chantierPhase(r.status) === f).length;
  const filters = (["tous", ...CHANTIER_PHASES] as const).filter(
    (f) => f === "tous" || count(f) > 0,
  );
  const shown =
    filter === "tous" ? matching : matching.filter((r) => chantierPhase(r.status) === filter);
  const active =
    filter === "tous" ? shown.filter((r) => chantierPhase(r.status) !== "termines") : shown;
  const finished =
    filter === "tous" ? shown.filter((r) => chantierPhase(r.status) === "termines") : [];

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div
          role="group"
          aria-label={l.filtersLabel}
          className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-1 sm:gap-1 sm:border-b sm:border-border sm:px-0"
        >
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-pill border border-border bg-surface px-3.5 text-sm font-semibold whitespace-nowrap aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-surface focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none sm:-mb-px sm:min-h-11 sm:rounded-none sm:border-0 sm:border-b-2 sm:border-transparent sm:bg-transparent sm:px-2 sm:text-[0.9375rem] sm:font-medium sm:text-muted-foreground sm:aria-pressed:border-foreground sm:aria-pressed:bg-transparent sm:aria-pressed:font-semibold sm:aria-pressed:text-foreground"
            >
              {l.phases[f]}
              <span className="font-medium tabular-nums opacity-70">
                <span className="max-sm:hidden">· </span>
                {count(f)}
              </span>
            </button>
          ))}
        </div>
        <label className="flex h-11 items-center gap-2 rounded-input border border-border bg-surface px-3.5 text-muted-foreground focus-within:ring-4 focus-within:ring-primary/20 sm:h-10 sm:w-64">
          <Search aria-hidden="true" className="size-4 shrink-0" />
          <span className="sr-only">{l.searchLabel}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={l.search}
            className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground sm:text-sm"
          />
        </label>
      </div>
      {shown.length === 0 ? (
        <p className="rounded-card border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
          {l.noMatch}
        </p>
      ) : (
        <>
          {active.length > 0 && <ChantierList rows={active} base={base} example={example} />}
          {finished.length > 0 && (
            <section aria-labelledby="chantiers-termines" className="flex flex-col gap-3">
              <ListGroupTitle
                id="chantiers-termines"
                title={l.finishedGroup}
                count={finished.length}
              />
              <ChantierList rows={finished} base={base} example={example} />
            </section>
          )}
        </>
      )}
    </>
  );
}
