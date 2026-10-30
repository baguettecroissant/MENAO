import {
  axisLabelColumns,
  channelBreakdown,
  coverageGrid,
  curveGeometry,
  funnelSteps,
  weekBars,
  type CoverageLevel,
  type LaunchChannelRow,
  type LaunchCoverage,
  type LaunchTarget,
  type LaunchTotals,
  type LaunchWeek,
  type TargetState,
} from "@menao/core";
import type { ReactNode } from "react";
import { StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { launchDayMonth } from "./format";

/**
 * Graphiques des chiffres du lancement (F-66, lot 2, ADR 0209), maison et sans bibliothèque :
 * anneau de l'objectif, courbe hebdomadaire (réalisé plein, cible en pointillés), entonnoir et
 * canaux en barres, mini-barres des semaines d'un membre, grille de couverture, tuiles avec leur
 * cible et leur état. Aucun calcul ici : tracés, parts et niveaux viennent de @menao/core. Chaque
 * graphique a son tableau pour les lecteurs d'écran ; libellés en HTML (lisibles à 390 px), traits
 * en SVG étiré sur toute la largeur.
 */

const t = fr.admin.launch.figures;
const channelLabel = fr.admin.launch.channels;
const count = (value: number) => value.toLocaleString("fr-FR");
const percent = (value: number | null) => (value === null ? t.none : fr.review.percent(value));

/** Position d'une étiquette sur l'axe : collée au bord près des extrémités, centrée ailleurs. */
const edgeAlign = (x: number) => (x < 8 ? "" : x > 92 ? "-translate-x-full" : "-translate-x-1/2");

/**
 * Tableau des valeurs d'un graphique, pour les lecteurs d'écran seulement. Masqué par un bloc
 * englobant : un tableau ne se rétrécit pas sous son contenu et déborderait de la page.
 */
function SrTable({ children }: { children: ReactNode }) {
  return (
    <div className="sr-only">
      <table>{children}</table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Anneau de l'objectif
// ---------------------------------------------------------------------------

const RING_RADIUS = 42;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** Grand anneau de l'objectif d'équipe (plein au-delà de 100 %, le chiffre reste exact). */
export function GoalRing({ value, label }: { value: number; label: string }) {
  const filled = Math.min(100, Math.max(0, value));
  return (
    <div role="img" aria-label={label} className="relative size-28 shrink-0">
      <svg viewBox="0 0 100 100" aria-hidden="true" className="size-28 -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="9"
          className="stroke-primary-soft"
        />
        {filled > 0 && (
          <circle
            cx="50"
            cy="50"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={RING_LENGTH * (1 - filled / 100)}
            className={filled === 100 ? "stroke-success" : "stroke-primary"}
          />
        )}
      </svg>
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center text-xl font-medium tabular-nums"
      >
        {fr.review.percent(value)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Courbe hebdomadaire
// ---------------------------------------------------------------------------

/**
 * Courbe des validés en cumul, semaine par semaine, face à la cible (pointillés) : graduations à
 * gauche, semaine du jour marquée d'un trait, dernier point réalisé en pastille ; valeurs au
 * survol de chaque semaine. Étiquettes des semaines espacées sur téléphone (4 environ), plus
 * nombreuses à partir de la tablette.
 */
export function WeeklyCurve({
  weeks,
  targets,
  today,
}: {
  weeks: readonly LaunchWeek[];
  targets: readonly LaunchTarget[];
  today: string;
}) {
  if (weeks.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.curve.empty}</p>;
  }
  const c = t.curve;
  const geometry = curveGeometry(weeks, targets, { width: 100, height: 100, today });
  const actualAt = new Map(geometry.realise.map((p) => [p.semaine, p.value]));
  const targetAt = new Map(geometry.cible.map((p) => [p.semaine, p.value]));
  const last = geometry.realise.at(-1);
  const line = (points: readonly { x: number; y: number }[]) =>
    points.map((p) => `${p.x},${p.y}`).join(" ");
  const first = geometry.realise[0];
  const area =
    first && last && geometry.realise.length > 1
      ? `${line(geometry.realise)} ${last.x},100 ${first.x},100`
      : null;
  const columns = geometry.columns.length;
  // Semaines étiquetées : 4 au plus sur téléphone, 9 à partir de la tablette (@menao/core).
  const narrowLabels = new Set(axisLabelColumns(columns, 4));
  const wideLabels = new Set(axisLabelColumns(columns, 9));
  const current = geometry.columns.find((col) => col.current);
  const slot = 100 / columns;

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="sr-only">{c.caption}</figcaption>
      <div aria-hidden="true" className="relative h-52 pl-10 sm:h-60">
        {geometry.ticks.map((tick) => (
          <div
            key={tick.value}
            className="absolute right-0 left-10 border-t border-border"
            style={{ top: `${tick.y}%` }}
          >
            <span className="absolute top-0 -left-10 w-8 -translate-y-1/2 text-right text-[0.6875rem] text-muted-foreground tabular-nums">
              {count(tick.value)}
            </span>
          </div>
        ))}
        <div className="absolute inset-y-0 right-0 left-10">
          {current && (
            <div
              className="absolute inset-y-0 border-l border-dashed border-primary/40"
              style={{ left: `${current.x}%` }}
            />
          )}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
          >
            {area && <polygon points={area} className="fill-primary/10" />}
            {geometry.cible.length > 1 && (
              <polyline
                points={line(geometry.cible)}
                fill="none"
                strokeWidth="2"
                strokeDasharray="5 4"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className="stroke-muted-foreground"
              />
            )}
            {geometry.realise.length > 1 && (
              <polyline
                points={line(geometry.realise)}
                fill="none"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className="stroke-primary"
              />
            )}
          </svg>
          {/* Une seule cible : un point en anneau, la ligne n'ayant pas de sens. */}
          {geometry.cible.length === 1 &&
            geometry.cible.map((p) => (
              <span
                key={p.semaine}
                className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-muted-foreground bg-surface"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              />
            ))}
          {last && (
            <span
              className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-primary"
              style={{ left: `${last.x}%`, top: `${last.y}%` }}
            />
          )}
          {/* Zones de survol, une par semaine (valeurs en bulle). */}
          {geometry.columns.map((col) => {
            const actual = actualAt.get(col.semaine);
            const goal = targetAt.get(col.semaine);
            const label = [
              `${c.week} ${launchDayMonth(col.semaine)}`,
              actual === undefined ? null : `${c.actual} : ${count(actual)}`,
              goal === undefined ? null : `${c.target} : ${count(goal)}`,
            ]
              .filter(Boolean)
              .join(" · ");
            // Gardée dans le cadre aux extrémités : rien ne dépasse de la page sur téléphone.
            const from = Math.max(0, col.x - slot / 2);
            const to = Math.min(100, col.x + slot / 2);
            return (
              <span
                key={col.semaine}
                title={label}
                className="absolute inset-y-0 hover:bg-primary/5"
                style={{ left: `${from}%`, width: `${to - from}%` }}
              />
            );
          })}
        </div>
      </div>
      <div aria-hidden="true" className="relative ml-10 h-4">
        {geometry.columns.map((col, i) => {
          const narrow = narrowLabels.has(i);
          const wide = wideLabels.has(i);
          if (!narrow && !wide) return null;
          return (
            <span
              key={col.semaine}
              className={`absolute top-0 text-[0.6875rem] whitespace-nowrap ${edgeAlign(col.x)} ${
                col.current ? "font-medium text-foreground" : "text-muted-foreground"
              } ${narrow && wide ? "" : narrow ? "sm:hidden" : "hidden sm:block"}`}
              style={{ left: `${col.x}%` }}
            >
              {launchDayMonth(col.semaine)}
            </span>
          );
        })}
      </div>
      <ul
        aria-hidden="true"
        className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"
      >
        <li className="flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded-pill bg-primary" />
          {c.actual}
        </li>
        {geometry.cible.length > 0 && (
          <li className="flex items-center gap-1.5">
            <span className="w-5 border-t-2 border-dashed border-muted-foreground" />
            {c.target}
          </li>
        )}
      </ul>
      <SrTable>
        <caption>{c.caption}</caption>
        <thead>
          <tr>
            <th scope="col">{c.week}</th>
            <th scope="col">{c.validated}</th>
            <th scope="col">{c.cumul}</th>
            <th scope="col">{c.targetCumul}</th>
            <th scope="col">{c.signups}</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((w) => {
            const goal = targetAt.get(w.semaine);
            const shown = actualAt.has(w.semaine);
            return (
              <tr key={w.semaine}>
                <th scope="row">{launchDayMonth(w.semaine)}</th>
                <td>{shown ? count(w.valides) : t.none}</td>
                <td>{shown ? count(w.valides_cumul) : t.none}</td>
                <td>{goal === undefined ? t.none : count(goal)}</td>
                <td>{shown ? count(w.inscrits_cumul) : t.none}</td>
              </tr>
            );
          })}
        </tbody>
      </SrTable>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Barres horizontales : entonnoir et canaux
// ---------------------------------------------------------------------------

/**
 * Ligne de barre : libellé et valeur sur une ligne (libellé à la ligne s'il est long, jamais
 * tronqué : « Publicité Facebook et Instagram » sur téléphone), barre dessous, détail en petit.
 */
function BarRow({
  label,
  value,
  ratio,
  detail,
  tone = "primary",
}: {
  label: string;
  value: string;
  ratio: number;
  detail?: ReactNode;
  tone?: "primary" | "success";
}) {
  return (
    <li className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 break-words">{label}</span>
        <span className="shrink-0 font-medium tabular-nums">{value}</span>
      </span>
      <span className="h-2.5 overflow-hidden rounded-pill bg-primary-soft">
        {ratio > 0 && (
          <span
            className={`block h-full rounded-pill ${tone === "success" ? "bg-success" : "bg-primary"}`}
            style={{ width: `${Math.max(1, Math.round(ratio * 100))}%` }}
          />
        )}
      </span>
      {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
    </li>
  );
}

/** Entonnoir, de l'inscription à l'abonnement, avec le taux de passage de chaque étape. */
export function FunnelChart({ totals }: { totals: LaunchTotals }) {
  const steps = funnelSteps(totals);
  const f = t.funnel;
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="sr-only">{f.caption}</figcaption>
      <ol aria-hidden="true" className="flex flex-col gap-3">
        {steps.map((s) => (
          <BarRow
            key={s.step}
            label={f.steps[s.step]}
            value={count(s.value)}
            ratio={s.ratio}
            tone={s.step === "abonnes" ? "success" : "primary"}
            detail={s.rateFromPrevious === null ? undefined : f.rate(percent(s.rateFromPrevious))}
          />
        ))}
      </ol>
      <SrTable>
        <caption>{f.caption}</caption>
        <thead>
          <tr>
            <th scope="col">{f.step}</th>
            <th scope="col">{f.count}</th>
            <th scope="col">{f.rateColumn}</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((s) => (
            <tr key={s.step}>
              <th scope="row">{f.steps[s.step]}</th>
              <td>{count(s.value)}</td>
              <td>{percent(s.rateFromPrevious)}</td>
            </tr>
          ))}
        </tbody>
      </SrTable>
    </figure>
  );
}

/** Canaux d'arrivée, du plus fourni au moins fourni : cumul, part des inscrits, cette semaine. */
export function ChannelChart({ channels }: { channels: readonly LaunchChannelRow[] }) {
  const k = t.channels;
  const { rows } = channelBreakdown(channels);
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{k.empty}</p>;
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="sr-only">{k.caption}</figcaption>
      <ul aria-hidden="true" className="flex flex-col gap-3">
        {rows.map((row) => (
          <BarRow
            key={row.canal}
            label={channelLabel[row.canal]}
            value={k.share(percent(row.part))}
            ratio={row.ratio}
            detail={
              <>
                {k.detail(row.inscrits, row.valides)}
                {row.valides_semaine > 0 && (
                  <span className="text-success"> · {k.thisWeek(row.valides_semaine)}</span>
                )}
              </>
            }
          />
        ))}
      </ul>
      <SrTable>
        <caption>{k.caption}</caption>
        <thead>
          <tr>
            <th scope="col">{k.channel}</th>
            <th scope="col">{k.signups}</th>
            <th scope="col">{k.shareColumn}</th>
            <th scope="col">{k.validated}</th>
            <th scope="col">{k.thisWeekColumn}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.canal}>
              <th scope="row">{channelLabel[row.canal]}</th>
              <td>{count(row.inscrits)}</td>
              <td>{percent(row.part)}</td>
              <td>{count(row.valides)}</td>
              <td>{count(row.valides_semaine)}</td>
            </tr>
          ))}
        </tbody>
      </SrTable>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Mini-barres des semaines d'un membre
// ---------------------------------------------------------------------------

/** Validés par semaine d'un membre (8 dernières semaines), la semaine du jour en plein. */
export function WeekMiniBars({
  weeks,
  currentWeek,
  caption,
}: {
  weeks: readonly { semaine: string; valides: number }[];
  /** Lundi de la semaine du jour. */
  currentWeek: string;
  caption: string;
}) {
  if (weeks.length === 0) return null;
  const bars = weekBars(weeks);
  const m = t.members;
  return (
    <figure className="flex flex-col gap-1">
      <figcaption className="sr-only">{caption}</figcaption>
      <div aria-hidden="true" className="flex h-10 items-end gap-1">
        {bars.map((bar) => {
          const label = m.week(launchDayMonth(bar.semaine), bar.valides);
          return (
            <span key={bar.semaine} title={label} className="flex h-full flex-1 items-end">
              <span
                className={`block w-full rounded-t-sm ${
                  bar.semaine === currentWeek ? "bg-primary" : "bg-primary/40"
                }`}
                style={{ height: bar.valides > 0 ? `${Math.max(8, bar.ratio * 100)}%` : "2px" }}
              />
            </span>
          );
        })}
      </div>
      <SrTable>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{t.curve.week}</th>
            <th scope="col">{t.curve.validated}</th>
          </tr>
        </thead>
        <tbody>
          {bars.map((bar) => (
            <tr key={bar.semaine}>
              <th scope="row">{launchDayMonth(bar.semaine)}</th>
              <td>{count(bar.valides)}</td>
            </tr>
          ))}
        </tbody>
      </SrTable>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Grille de couverture
// ---------------------------------------------------------------------------

const LEVEL_STYLES: Record<CoverageLevel, string> = {
  vide: "bg-background text-muted-foreground",
  faible: "bg-warning-soft text-warning",
  ok: "bg-success-soft text-success",
};

/**
 * Couverture métier × commune pilote : un vrai tableau (métiers en lignes, communes en colonnes),
 * cases colorées avec leur nombre et leur niveau écrit pour les lecteurs d'écran. Colonne des
 * métiers figée ; défilement de côté dans le cadre seulement sur téléphone.
 */
export function CoverageTable({ coverage }: { coverage: LaunchCoverage }) {
  const k = t.coverage;
  const grid = coverageGrid(coverage);
  if (grid.total === 0) return <p className="text-sm text-muted-foreground">{k.empty}</p>;
  const communeName = new Map(coverage.communes.map((c) => [c.code_insee, c.nom]));
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {(["vide", "faible", "ok"] as const).map((level) => (
          <li key={level} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`size-3 rounded-sm border border-border ${LEVEL_STYLES[level]}`}
            />
            {k.legend[level]}
          </li>
        ))}
      </ul>
      <div className="relative -mx-1 overflow-x-auto px-1 pb-1">
        <table className="w-full border-separate border-spacing-1 text-sm">
          <caption className="sr-only">{k.caption}</caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-[1] bg-surface pr-2 text-left align-bottom text-xs font-normal text-muted-foreground"
              >
                {k.trade}
              </th>
              {coverage.communes.map((commune) => (
                <th
                  key={commune.code_insee}
                  scope="col"
                  className="min-w-16 px-1 align-bottom text-[0.6875rem] leading-tight font-medium text-muted-foreground"
                >
                  {commune.nom}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((row) => (
              <tr key={row.trade}>
                <th
                  scope="row"
                  className="sticky left-0 z-[1] max-w-40 bg-surface pr-2 text-left text-xs font-medium"
                >
                  {row.label}
                </th>
                {row.cells.map((cell) => (
                  <td
                    key={cell.code_insee}
                    title={k.cell(row.label, communeName.get(cell.code_insee) ?? "", cell.n)}
                    className={`h-9 rounded-input text-center font-medium tabular-nums ${LEVEL_STYLES[cell.level]}`}
                  >
                    {count(cell.n)}
                    <span className="sr-only">, {k.level[cell.level]}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tuiles avec cible et état
// ---------------------------------------------------------------------------

const STATE_TONES = { atteint: "success", proche: "warning", loin: "danger" } as const;

/** Pastille d'état d'un chiffre face à sa cible : atteint, proche ou loin. */
export function TargetStatePill({ state }: { state: TargetState | null }) {
  if (!state) return null;
  return <StatusBadge tone={STATE_TONES[state]}>{t.status[state]}</StatusBadge>;
}

/** Grille de tuiles (liste de définitions, lue d'un seul tenant). */
export function FigureTiles({ label, children }: { label: string; children: ReactNode }) {
  return (
    <dl aria-label={label} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {children}
    </dl>
  );
}

/** Tuile : libellé, chiffre, précision, puis la cible et son état s'il y a une cible. */
export function FigureTile({
  label,
  value,
  hint,
  target,
  state = null,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  /** Cible déjà mise en forme (« 90 % »), ou null sans cible. */
  target?: string | null;
  state?: TargetState | null;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4 shadow-card">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-medium tracking-tight tabular-nums">{value}</dd>
      {hint && <dd className="text-xs text-muted-foreground">{hint}</dd>}
      {target != null && (
        <dd className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{t.target(target)}</span>
          <TargetStatePill state={state} />
        </dd>
      )}
    </div>
  );
}
