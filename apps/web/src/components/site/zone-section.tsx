import { ArrowRight, MapPin } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { COAST, COMMUNE_COORDS } from "@/lib/site/commune-coords";

const t = fr.home.zone;
const about = fr.pages.about;

type Commune = { code_insee: string; slug: string; nom: string };

// Cadre de la carte (degrés) et taille du dessin.
const LON = [6.8, 7.62] as const;
const LAT = [43.47, 43.84] as const;
const W = 600;
const H = 380;
const x = (lon: number) => Math.round(((lon - LON[0]) / (LON[1] - LON[0])) * W * 10) / 10;
const y = (lat: number) => Math.round(((LAT[1] - lat) / (LAT[1] - LAT[0])) * H * 10) / 10;
// Noms écrits sur la carte (les autres communes : un point seulement), placés pour ne pas se chevaucher.
const LABELS: Record<string, "start" | "end" | "below"> = {
  "06088": "start",
  "06004": "start",
  "06029": "start",
  "06069": "end",
  "06083": "end",
  "06157": "start",
  "06033": "start",
  "06027": "start",
  "06079": "below",
};

/**
 * Carte statique du 06 (SVG, sans bibliothèque ni requête) : côte, mer et communes couvertes. La
 * commune mise en avant (Nice sur l'accueil, la ville de la page ailleurs) est nommée et grossie.
 */
export function ZoneMap({
  communes,
  highlight = "nice",
}: {
  communes: readonly Commune[];
  highlight?: string;
}) {
  const sea = `M${COAST.map(([lon, lat]) => `${x(lon)},${y(lat)}`).join(" L")} L${W},${H} L0,${H} Z`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={t.mapLabel}
      className="block h-auto w-full bg-background"
    >
      <path d={sea} className="fill-primary-soft" />
      <text
        x={W - 24}
        y={H - 22}
        textAnchor="end"
        className="fill-primary-strong text-[12px] font-semibold tracking-[0.12em] uppercase"
      >
        {t.sea}
      </text>
      {communes.map((commune) => {
        const coords = COMMUNE_COORDS[commune.code_insee];
        if (!coords) return null;
        const cx = x(coords[0]);
        const cy = y(coords[1]);
        const main = commune.slug === highlight;
        const label = LABELS[commune.code_insee] ?? (main ? "start" : undefined);
        return (
          <g key={commune.code_insee}>
            <circle
              cx={cx}
              cy={cy}
              r={main ? 9 : 6}
              className="fill-primary stroke-white"
              strokeWidth={2.5}
            />
            {label && (
              <text
                x={label === "end" ? cx - 12 : label === "below" ? cx - 6 : cx + 12}
                y={label === "below" ? cy + 20 : cy + 4}
                textAnchor={label === "end" ? "end" : "start"}
                className={`fill-foreground ${main ? "text-[14px] font-bold" : "text-[12px] font-semibold"}`}
              >
                {commune.nom}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/**
 * « Où intervient MENAO ? » (ADR 0264) : texte de « À propos », carte du 06 et communes couvertes,
 * avec le lien vers la page carrefour /villes.
 */
export function ZoneSection({ id, communes }: { id: string; communes: readonly Commune[] }) {
  return (
    <section aria-labelledby={id} className="border-y border-border bg-surface py-14 sm:py-20">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:px-6 lg:flex-row lg:items-center lg:gap-14">
        <div className="reveal flex flex-col gap-4 lg:w-[28rem] lg:shrink-0">
          <p className="text-[0.8125rem] font-bold tracking-[0.08em] text-primary-strong uppercase">
            {t.eyebrow}
          </p>
          <h2
            id={id}
            className="text-[2rem] leading-[1.06] font-bold tracking-tight text-balance sm:text-[2.75rem]"
          >
            {about.areaTitle}
          </h2>
          <p className="text-pretty text-label sm:text-lg">{about.area}</p>
          <div className="hidden self-start lg:block">
            <ButtonLink href="/villes" variant="secondary">
              {t.all}
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="overflow-hidden rounded-[1.25rem] border border-border">
            <ZoneMap communes={communes} />
          </div>
          <ul aria-label={t.communesLabel} className="flex flex-wrap gap-2">
            {communes.map((commune) => (
              <li key={commune.slug}>
                <Link
                  href={`/villes#${commune.slug}` as Route}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-pill border border-border bg-background px-3.5 text-sm font-semibold transition-colors hover:border-border-strong focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
                >
                  <MapPin aria-hidden="true" className="size-3.5 text-muted-foreground" />
                  {commune.nom}
                </Link>
              </li>
            ))}
          </ul>
          <ButtonLink href="/villes" variant="secondary" className="lg:hidden">
            {t.all}
            <ArrowRight aria-hidden="true" className="size-4" />
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
