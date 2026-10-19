import { ArrowDown, ArrowRight, CornerDownRight } from "lucide-react";
import type { GuideBlock } from "@/content/guides";
import { frenchSpacing } from "@/lib/site/typography";

/**
 * Schémas des guides (ADR 0150) : frise, arbre de décision, circuit et document annoté, dessinés en
 * HTML à partir des données du guide. Le texte reste lisible par les lecteurs d'écran ; la légende
 * (caption) nomme la figure pour eux.
 */

type Block<T extends GuideBlock["type"]> = Extract<GuideBlock, { type: T }>;

const FIGURE =
  "flex flex-col gap-5 rounded-hero border border-border bg-surface p-5 shadow-card sm:p-7";

/** Frise : des barres proportionnelles aux durées, sur un même axe depuis le point de départ. */
export function PeriodsFigure({ block }: { block: Block<"periods"> }) {
  const max = Math.max(...block.ticks.map((t) => t.at), ...block.bars.map((b) => b.to));
  const pct = (value: number) => `${(value / max) * 100}%`;
  return (
    <figure className={FIGURE}>
      <figcaption className="sr-only">{block.caption}</figcaption>
      <ul className="flex flex-col gap-4">
        {block.bars.map((bar) => (
          <li key={bar.label} className="flex flex-col gap-1.5">
            <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-[0.9375rem]">
              <span className="font-medium text-foreground">{bar.label}</span>
              <span className="text-sm text-muted-foreground">{frenchSpacing(bar.detail)}</span>
            </p>
            <div aria-hidden="true" className="relative h-3 rounded-full bg-primary-softer">
              <div
                className={`absolute inset-y-0 rounded-full ${bar.tone === "strong" ? "bg-primary" : "bg-primary-soft"}`}
                style={{ left: pct(bar.from), width: pct(bar.to - bar.from) }}
              />
            </div>
          </li>
        ))}
      </ul>
      <div aria-hidden="true" className="flex flex-col gap-2 border-t border-border pt-3">
        <div className="relative h-5 text-xs font-medium text-subtle-foreground">
          {block.ticks.map((tick) => (
            <span
              key={tick.at}
              className="absolute top-0 whitespace-nowrap"
              // Repère centré sur sa graduation, sauf aux extrémités (aligné sur le bord).
              style={{
                left: pct(tick.at),
                transform: `translateX(${tick.at === 0 ? 0 : tick.at === max ? -100 : -50}%)`,
              }}
            >
              {tick.label}
            </span>
          ))}
        </div>
        <p className="flex items-center gap-1.5 text-sm font-medium text-primary-strong">
          <span className="size-2.5 rounded-full bg-primary" />
          {block.start}
        </p>
      </div>
    </figure>
  );
}

/** Arbre de décision : une question par ligne, la sortie à droite, la suite en dessous. */
export function DecisionFigure({ block }: { block: Block<"decision"> }) {
  return (
    <figure className={FIGURE}>
      <figcaption className="sr-only">{block.caption}</figcaption>
      <ol className="flex flex-col">
        {block.steps.map((step, i) => (
          <li key={step.question} className="flex flex-col">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-5">
              <p className="flex gap-3 rounded-card border border-primary-soft bg-primary-softer p-4 text-[0.9375rem] font-medium text-pretty text-foreground">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                {frenchSpacing(step.question)}
              </p>
              <p className="flex items-center gap-2 pl-9 text-sm sm:pl-0">
                <CornerDownRight
                  aria-hidden="true"
                  className="size-4 text-subtle-foreground sm:hidden"
                />
                <span className="rounded-chip bg-background px-2.5 py-1 font-medium text-muted-foreground">
                  {step.answer}
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="hidden size-4 text-subtle-foreground sm:block"
                />
                <span className="rounded-input bg-foreground px-3 py-1.5 text-base font-semibold whitespace-nowrap text-white">
                  {frenchSpacing(step.result)}
                </span>
              </p>
            </div>
            <p className="flex items-center gap-2 py-2.5 pl-[1.125rem] text-sm text-muted-foreground">
              <span aria-hidden="true" className="h-5 w-px bg-border-strong" />
              {step.next}
            </p>
          </li>
        ))}
        <li className="flex flex-wrap items-center gap-3 rounded-card bg-primary p-4 text-primary-foreground">
          <span className="text-2xl font-semibold">{frenchSpacing(block.otherwise.result)}</span>
          <span className="text-[0.9375rem] text-pretty text-white/90">
            {frenchSpacing(block.otherwise.detail)}
          </span>
        </li>
      </ol>
      {block.note && (
        <p className="text-sm text-pretty text-muted-foreground">{frenchSpacing(block.note)}</p>
      )}
    </figure>
  );
}

/** Circuit : une chaîne d'étapes par cas, en ligne sur grand écran, en colonne sur mobile. */
export function FlowFigure({ block }: { block: Block<"flow"> }) {
  return (
    <figure className={FIGURE}>
      <figcaption className="sr-only">{block.caption}</figcaption>
      <ul className="flex flex-col gap-6">
        {block.rows.map((row) => (
          <li key={row.label} className="flex flex-col gap-2.5">
            <p className="text-sm font-semibold text-primary-strong">{row.label}</p>
            <ol className="flex flex-col items-stretch gap-1.5 sm:flex-row sm:items-center sm:gap-2">
              {row.steps.map((step, i) => (
                <li key={step} className="flex flex-col items-center gap-1.5 sm:flex-row sm:gap-2">
                  {i > 0 && (
                    <>
                      <ArrowDown aria-hidden="true" className="size-4 text-primary sm:hidden" />
                      <ArrowRight
                        aria-hidden="true"
                        className="hidden size-4 shrink-0 text-primary sm:block"
                      />
                    </>
                  )}
                  <span
                    className={`w-full rounded-input border px-3 py-2 text-center text-sm text-pretty sm:w-auto ${
                      i === 0
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground"
                    }`}
                  >
                    {frenchSpacing(step)}
                  </span>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ul>
    </figure>
  );
}

// Lignes factices du document, de longueurs variées.
const LINE_WIDTHS = ["w-11/12", "w-3/4", "w-5/6", "w-2/3", "w-4/5"];
const LINE = "h-1.5 rounded-full bg-border-strong/60";

/** Allure d'une zone sur la feuille : en-tête sur deux colonnes, tableau, totaux ou signature. */
function ZoneSketch({ zone, index }: { zone: Block<"document">["zones"][number]; index: number }) {
  switch (zone.shape) {
    case "header":
      return (
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <span className="mb-0.5 h-3 w-8 rounded-sm bg-primary/70" />
            <span className={`${LINE} w-5/6`} />
            <span className={`${LINE} w-2/3`} />
          </div>
          <div className="flex flex-col items-end gap-1 pt-1">
            <span className={`${LINE} w-3/4`} />
            <span className={`${LINE} w-1/2`} />
          </div>
        </div>
      );
    case "table":
      return (
        <div className="flex flex-col divide-y divide-border">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex items-center justify-between gap-2 py-1">
              <span className={`${LINE} ${LINE_WIDTHS[row]} max-w-[70%]`} />
              <span className={`${LINE} w-6 bg-foreground/30`} />
            </div>
          ))}
        </div>
      );
    case "totals":
      return (
        <div className="flex flex-col items-end gap-1">
          <span className={`${LINE} w-1/3`} />
          <span className="h-2 w-1/2 rounded-full bg-foreground/50" />
        </div>
      );
    case "signature":
      return (
        <div className="flex h-7 items-end rounded-sm border border-dashed border-border-strong px-2 pb-1">
          <svg viewBox="0 0 60 14" className="h-3.5 w-14 text-primary-strong" fill="none">
            <path
              d="M1 10c5-8 8-8 9-3s3 5 6-1 5-5 6 0 4 5 8-2 6-3 7 1 4 3 8 0"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      );
    default:
      return (
        <div className="flex flex-col gap-1">
          {zone.items.map((item, j) => (
            <span
              key={item}
              className={`${LINE} ${LINE_WIDTHS[(index + j) % LINE_WIDTHS.length]}`}
            />
          ))}
        </div>
      );
  }
}

/** Document annoté : la feuille et ses zones numérotées, puis la légende. */
export function DocumentFigure({ block }: { block: Block<"document"> }) {
  return (
    <figure
      className={`${FIGURE} sm:grid sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:items-start sm:gap-8`}
    >
      <figcaption className="sr-only">{block.caption}</figcaption>
      <div
        aria-hidden="true"
        className="mx-auto flex w-full max-w-[15rem] flex-col gap-2.5 rounded-input border border-border bg-white p-4 shadow-raised"
      >
        <p className="text-xs font-semibold tracking-[0.2em] text-primary-strong uppercase">
          {block.title}
        </p>
        {block.zones.map((zone, i) => (
          <div key={zone.title} className="flex gap-2 rounded-md bg-primary-softer/70 p-2">
            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-[0.625rem] font-semibold text-primary-foreground">
              {i + 1}
            </span>
            <div className="flex-1 pt-0.5">
              <ZoneSketch zone={zone} index={i} />
            </div>
          </div>
        ))}
      </div>
      <ol className="flex flex-col gap-4">
        {block.zones.map((zone, i) => (
          <li key={zone.title} className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {i + 1}
            </span>
            <div className="flex flex-col gap-1">
              <p className="font-medium text-foreground">{zone.title}</p>
              <ul className="flex flex-col gap-0.5 text-sm text-pretty text-muted-foreground">
                {zone.items.map((item) => (
                  <li key={item}>{frenchSpacing(item)}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </figure>
  );
}
