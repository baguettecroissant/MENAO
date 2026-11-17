"use client";

import { franceMapPoint, type FranceMapData } from "@menao/core";
import { useEffect, useState } from "react";
import { fr } from "@/i18n/fr";

const t = fr.franceMap;

/**
 * Carte de France de la zone d'intervention (maquette du lot 61, ADR 0349) : départements ou
 * régions choisis en couleur, à toucher pour les ajouter ou les retirer ; toute la métropole pour
 * « Toute la France ». Contours IGN (Licence Ouverte), chargés seulement quand la carte s'affiche.
 * L'outre-mer n'est pas dessiné : il se choisit par la recherche.
 */
export function FranceMap({
  mode,
  codes = [],
  onToggle,
  point,
}: {
  mode: "departements" | "regions" | "france";
  codes?: readonly string[];
  onToggle?: (code: string) => void;
  /** Adresse de départ de l'artisan. */
  point?: { lon: number; lat: number } | null;
}) {
  const level = mode === "departements" ? "departements" : "regions";
  const [loaded, setLoaded] = useState<{ level: string; data: FranceMapData } | null>(null);
  useEffect(() => {
    let alive = true;
    (level === "departements"
      ? import("@menao/core/data/france-departements.json")
      : import("@menao/core/data/france-regions.json")
    ).then((module) => {
      if (alive) setLoaded({ level, data: module.default as FranceMapData });
    });
    return () => {
      alive = false;
    };
  }, [level]);
  const data = loaded?.level === level ? loaded.data : null;
  const dot = data && point ? franceMapPoint(data.projection, point.lon, point.lat, data) : null;

  return (
    <figure className="flex w-full flex-col gap-1.5 rounded-card border border-border bg-surface p-3">
      <div className="aspect-[600/581] w-full">
        {data && (
          <svg
            viewBox={`0 0 ${data.largeur} ${data.hauteur}`}
            role="group"
            aria-label={t.label[mode]}
            className="block size-full"
          >
            {Object.entries(data.zones).map(([code, zone]) => {
              const on = mode === "france" || codes.includes(code);
              const shape = `stroke-surface [stroke-width:1.2] ${on ? "fill-primary" : "fill-border"}`;
              return onToggle && mode !== "france" ? (
                <path
                  key={code}
                  d={zone.d}
                  role="button"
                  tabIndex={0}
                  aria-pressed={on}
                  aria-label={zone.nom}
                  onClick={() => onToggle(code)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onToggle(code);
                    }
                  }}
                  className={`${shape} cursor-pointer outline-none hover:opacity-80 focus-visible:stroke-foreground focus-visible:[stroke-width:3]`}
                >
                  <title>{zone.nom}</title>
                </path>
              ) : (
                <path key={code} d={zone.d} className={shape} />
              );
            })}
            {dot && (
              <circle
                cx={dot.x}
                cy={dot.y}
                r={7}
                className="fill-surface stroke-foreground [stroke-width:3]"
              />
            )}
          </svg>
        )}
      </div>
      <figcaption className="text-center text-xs text-muted-foreground">
        {onToggle && mode !== "france" ? t.hint[mode] : t.caption}
      </figcaption>
    </figure>
  );
}
