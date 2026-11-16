"use client";

import { searchTerritories, territoryLabel } from "@menao/core";
import { useCallback } from "react";
import { Autocomplete } from "@/components/autocomplete";
import { FranceMap } from "@/components/france-map";

type Territory = { code: string; nom: string };

/** Choix de départements ou de régions (ADR 0213) : recherche dans le référentiel, puis pastilles. */
export function TerritoryField({
  mode,
  codes,
  onChange,
  errors,
  labels,
  point,
}: {
  mode: "departements" | "regions";
  codes: string[];
  onChange: (codes: string[]) => void;
  errors?: readonly string[] | undefined;
  labels: { search: string; hint: string; list: string; remove: (nom: string) => string };
  /** Adresse de départ, marquée sur la carte. */
  point?: { lon: number; lat: number } | null;
}) {
  const search = useCallback(async (query: string) => searchTerritories(mode, query), [mode]);
  // Carte et recherche côte à côte (maquette du lot 61) : toucher la carte ou chercher un nom.
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="w-full sm:w-[55%] sm:shrink-0">
        <FranceMap
          mode={mode}
          codes={codes}
          point={point}
          onToggle={(code) =>
            onChange(codes.includes(code) ? codes.filter((c) => c !== code) : [...codes, code])
          }
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Autocomplete<Territory>
          key={mode}
          label={labels.search}
          hint={labels.hint}
          clearOnSelect
          minChars={2}
          errors={errors}
          search={search}
          getKey={(t) => t.code}
          getLabel={(t) => t.nom}
          onSelect={(t) => {
            if (!codes.includes(t.code)) onChange([...codes, t.code]);
          }}
        />
        {codes.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label={labels.list}>
            {codes.map((code) => {
              const nom = territoryLabel(mode, code);
              return (
                <li
                  key={code}
                  className="inline-flex items-center gap-1 rounded-chip bg-primary-soft pl-3 text-primary"
                >
                  {nom}
                  <button
                    type="button"
                    aria-label={labels.remove(nom)}
                    onClick={() => onChange(codes.filter((c) => c !== code))}
                    className="inline-flex size-touch items-center justify-center rounded-chip"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
