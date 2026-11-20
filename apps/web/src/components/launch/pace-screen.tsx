import {
  addDays,
  axisLabelColumns,
  formatZoneCodes,
  mondayOf,
  niceTicks,
  paceAverage,
  paceNeededPerWeek,
  pacePlan,
  pacePlanToday,
  paceProjection,
  paceRecentRate,
  paceState,
  paceWeek,
  sectorOfZone,
  type LaunchFigures,
  type PaceState,
} from "@menao/core";
import { CircleHelp, Settings2, TriangleAlert } from "lucide-react";
import type { Route } from "next";
import { Alert, ButtonLink, Card, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import type { AdminPace } from "@/lib/admin/pace";
import { formatDayMonth } from "@/lib/format";
import { launchDayMonth } from "./format";

const t = fr.admin.launch.pace;
const channelLabel = fr.admin.launch.channels;
const count = (n: number) => n.toLocaleString("fr-FR");

const STATE_TONES: Record<PaceState, "success" | "primary" | "warning" | "danger" | "neutral"> = {
  avance: "success",
  rythme: "primary",
  retard: "danger",
  point: "warning",
  demarrage: "neutral",
};

/** Validés de l'équipe à ce jour : cumul de la semaine en cours (première validation, tous canaux). */
function teamValidated(figures: LaunchFigures | null, today: string): number {
  if (!figures) return 0;
  const monday = mondayOf(today);
  const done = figures.weeks.filter((w) => w.semaine <= monday);
  return done.at(-1)?.valides_cumul ?? figures.totals.valides;
}

/**
 * Onglet Rythme du lancement (F-184, lot 78, ADR 0381) : retard ou avance sur le plan, rythme récent
 * face au rythme nécessaire, projection, courbe vers l'objectif, canaux des validés et conseillers de
 * la semaine avec leur état. Calculs dans @menao/core ; les semaines et canaux de l'équipe viennent
 * des chiffres du lancement (admin_launch_figures), les conseillers de admin_commercial_pace.
 */
export function PaceScreen({ pace, figures }: { pace: AdminPace; figures: LaunchFigures | null }) {
  const s = pace.settings;
  const today = pace.today;
  const goal = s.objectif_valides;
  const done = teamValidated(figures, today);
  const expected = pacePlanToday(s, today);
  const rate = figures ? paceRecentRate(figures.weeks, today) : null;
  const needed = paceNeededPerWeek(s, done, today);
  const projection = paceProjection(s, done, rate, today);
  const states = pace.conseillers.map((c) => paceState(c.weeks, today));
  const points = s.alerte_retard ? states.filter((x) => x === "point").length : 0;
  const k = t.kpis;
  const finDay = s.fin ? launchDayMonth(s.fin) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <ButtonLink
          href={"/admin/lancement/rythme/reglages" as Route}
          variant="secondary"
          size="sm"
        >
          <Settings2 aria-hidden="true" className="size-4" />
          {t.settingsLink}
        </ButtonLink>
      </div>

      {!goal || !s.debut || !s.fin ? (
        <Alert tone="info">{t.noGoal}</Alert>
      ) : (
        <>
          {expected !== null && <PaceAlert gap={expected - done} needed={needed} rate={rate} />}
          <dl className="grid gap-px overflow-hidden rounded-card border border-border bg-border shadow-card sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label={k.validated(launchDayMonth(today))}
              value={count(done)}
              hint={expected === null ? null : k.expected(expected)}
            />
            <Kpi
              label={k.rate}
              value={rate === null ? "—" : k.perWeek(rate)}
              hint={
                rate === null
                  ? k.noRate
                  : needed !== null && finDay
                    ? k.needed(needed, finDay)
                    : null
              }
            />
            <Kpi
              label={k.projection(finDay ?? "")}
              value={projection === null ? "—" : k.projectionShort(projection)}
              hint={projection === null ? null : k.missing(goal - projection)}
            />
            <Kpi label={k.active} value={count(pace.conseillers.length)} hint={k.points(points)} />
          </dl>
          <Card className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-display text-lg font-bold tracking-tight">
                {t.curve.title(goal)}
              </h2>
              <Legend />
            </div>
            <PaceCurve pace={pace} figures={figures} done={done} projection={projection} />
          </Card>
        </>
      )}

      {figures && <ChannelBars figures={figures} done={done} />}

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 className="font-display text-lg font-bold tracking-tight">{t.table.title}</h2>
          <p className="text-[0.8125rem] text-muted-foreground">
            {t.table.lead(
              launchDayMonth(mondayOf(today)),
              launchDayMonth(addDays(mondayOf(today), 6)),
            )}
          </p>
        </div>
        <CommercialTable pace={pace} states={states} />
      </section>

      {s.alerte_retard && (
        <p className="flex items-start gap-2.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
          <CircleHelp aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t.rule}
        </p>
      )}
    </div>
  );
}

function PaceAlert({
  gap,
  needed,
  rate,
}: {
  gap: number;
  needed: number | null;
  rate: number | null;
}) {
  const a = t.alert;
  const extra = needed !== null && rate !== null ? Math.ceil(needed - rate) : 0;
  if (gap <= 0) {
    return <Alert tone="success">{gap === 0 ? a.onTrack : a.ahead(-gap)}</Alert>;
  }
  return (
    <div className="flex flex-col gap-3 rounded-card bg-warning-soft px-5 py-4 sm:flex-row sm:items-center">
      <TriangleAlert aria-hidden="true" className="size-5 shrink-0 text-warning" />
      <p className="flex-1 text-[0.9375rem] leading-relaxed">
        <b className="font-semibold">{a.behind(gap)}</b>
        {extra > 0 && a.gap(extra)}
      </p>
      <ButtonLink href={"/admin/candidats" as Route} variant="secondary" size="sm">
        {a.candidates}
      </ButtonLink>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string | null }) {
  return (
    <div className="flex flex-col gap-1.5 bg-surface px-5 py-4">
      <dt className="text-sm font-semibold text-label">{label}</dt>
      <dd className="font-display text-2xl leading-tight font-bold tracking-tight tabular-nums">
        {value}
      </dd>
      {hint && <dd className="text-[0.8125rem] text-muted-foreground">{hint}</dd>}
    </div>
  );
}

function Legend() {
  const c = t.curve;
  return (
    <ul aria-hidden="true" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <li className="flex items-center gap-1.5">
        <span className="h-0.5 w-5 rounded-pill bg-primary" />
        {c.actual}
      </li>
      <li className="flex items-center gap-1.5">
        <span className="w-5 border-t-2 border-dashed border-muted-foreground" />
        {c.plan}
      </li>
      <li className="flex items-center gap-1.5">
        <span className="w-5 border-t-2 border-dotted border-warning" />
        {c.projection}
      </li>
    </ul>
  );
}

/**
 * Courbe cumulée vers l'objectif : le plan en pointillés, le réel en trait plein (jusqu'à la
 * semaine en cours), la projection au rythme récent en petits points jusqu'à la dernière semaine.
 * Traits en SVG étiré, étiquettes en HTML (lisibles sur téléphone), tableau pour les lecteurs
 * d'écran.
 */
function PaceCurve({
  pace,
  figures,
  done,
  projection,
}: {
  pace: AdminPace;
  figures: LaunchFigures | null;
  done: number;
  projection: number | null;
}) {
  const c = t.curve;
  const plan = pacePlan(pace.settings);
  if (plan.length === 0) return null;
  const goal = pace.settings.objectif_valides!;
  const monday = mondayOf(pace.today);
  const actualBy = new Map((figures?.weeks ?? []).map((w) => [w.semaine, w.valides_cumul]));
  const ticks = niceTicks(Math.max(goal, projection ?? 0, done));
  const max = ticks.at(-1) ?? goal;
  const x = (i: number) => (plan.length === 1 ? 50 : (i * 100) / (plan.length - 1));
  const y = (v: number) => 100 - (v / max) * 100;
  const real = plan.flatMap((p, i) =>
    p.semaine <= monday
      ? [{ x: x(i), y: y(p.semaine === monday ? done : (actualBy.get(p.semaine) ?? 0)) }]
      : [],
  );
  const line = (pts: readonly { x: number; y: number }[]) =>
    pts.map((p) => `${p.x},${p.y}`).join(" ");
  const last = real.at(-1);
  const end = { x: 100, y: y(projection ?? 0) };
  const narrow = new Set(axisLabelColumns(plan.length, 4));
  const wide = new Set(axisLabelColumns(plan.length, 12));
  const edge = (px: number) => (px < 8 ? "" : px > 92 ? "-translate-x-full" : "-translate-x-1/2");

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="sr-only">{c.caption}</figcaption>
      <div aria-hidden="true" className="relative mt-2 h-60 pl-10 sm:h-80">
        {ticks.map((tick) => (
          <div
            key={tick}
            className="absolute right-0 left-10 border-t border-border"
            style={{ top: `${y(tick)}%` }}
          >
            <span className="absolute top-0 -left-10 w-8 -translate-y-1/2 text-right text-[0.6875rem] text-muted-foreground tabular-nums">
              {count(tick)}
            </span>
          </div>
        ))}
        <div className="absolute inset-y-0 right-0 left-10">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
          >
            {last && real.length > 1 && (
              <polygon
                points={`${line(real)} ${last.x},100 ${real[0]!.x},100`}
                className="fill-primary/10"
              />
            )}
            <polyline
              points={line(plan.map((p, i) => ({ x: x(i), y: y(p.cumul) })))}
              fill="none"
              strokeWidth="2"
              strokeDasharray="6 5"
              vectorEffect="non-scaling-stroke"
              className="stroke-muted-foreground"
            />
            {last && projection !== null && last.x < 100 && (
              <polyline
                points={line([last, end])}
                fill="none"
                strokeWidth="2"
                strokeDasharray="2 4"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                className="stroke-warning"
              />
            )}
            {real.length > 1 && (
              <polyline
                points={line(real)}
                fill="none"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className="stroke-primary"
              />
            )}
          </svg>
          <span
            className="absolute -translate-x-full -translate-y-1/2 rounded-sm bg-surface pr-3 text-xs font-bold whitespace-nowrap"
            style={{ left: "100%", top: `${y(goal)}%` }}
          >
            {c.goal(goal, launchDayMonth(pace.settings.fin!))}
          </span>
          <span
            className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
            style={{ left: "100%", top: `${y(goal)}%` }}
          />
          {projection !== null && last && last.x < 100 && (
            <>
              <span
                className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-warning bg-surface"
                style={{ left: "100%", top: `${end.y}%` }}
              />
              <span
                className="absolute -translate-x-full translate-y-2 rounded-sm bg-surface pr-1 text-xs font-bold whitespace-nowrap text-warning"
                style={{ left: "100%", top: `${end.y}%` }}
              >
                {c.projected(projection)}
              </span>
            </>
          )}
          {last && (
            <>
              <span
                className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-primary"
                style={{ left: `${last.x}%`, top: `${last.y}%` }}
              />
              <span
                className={`absolute translate-y-3 rounded-sm bg-surface px-1 text-xs font-bold whitespace-nowrap text-primary-strong ${last.x > 70 ? "-translate-x-full" : ""}`}
                style={{ left: `${last.x}%`, top: `${last.y}%` }}
              >
                {c.today(done)}
              </span>
            </>
          )}
        </div>
      </div>
      <div aria-hidden="true" className="relative ml-10 h-4">
        {plan.map((p, i) => {
          const n = narrow.has(i);
          const w = wide.has(i);
          if (!n && !w) return null;
          return (
            <span
              key={p.semaine}
              className={`absolute top-0 text-[0.6875rem] whitespace-nowrap text-muted-foreground ${edge(x(i))} ${n && w ? "" : n ? "sm:hidden" : "hidden sm:block"}`}
              style={{ left: `${x(i)}%` }}
            >
              {launchDayMonth(p.semaine)}
            </span>
          );
        })}
      </div>
      <div className="sr-only">
        <table>
          <caption>{c.caption}</caption>
          <thead>
            <tr>
              <th scope="col">{c.week}</th>
              <th scope="col">{c.cumul}</th>
              <th scope="col">{c.planned}</th>
            </tr>
          </thead>
          <tbody>
            {plan.map((p) => (
              <tr key={p.semaine}>
                <th scope="row">{launchDayMonth(p.semaine)}</th>
                <td>
                  {p.semaine > monday
                    ? ""
                    : count(p.semaine === monday ? done : (actualBy.get(p.semaine) ?? 0))}
                </td>
                <td>{count(p.cumul)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

/** Validés par canal d'arrivée (première validation), du plus grand au plus petit. */
function ChannelBars({ figures, done }: { figures: LaunchFigures; done: number }) {
  const rows = figures.channels.filter((c) => c.valides > 0).sort((a, b) => b.valides - a.valides);
  if (rows.length === 0) return null;
  const top = rows[0]!.valides;
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-bold tracking-tight">{t.channels(done)}</h2>
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li
            key={row.canal}
            className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4"
          >
            <span className="flex justify-between text-sm sm:w-56 sm:shrink-0">
              {channelLabel[row.canal]}
              <b className="tabular-nums sm:hidden">{count(row.valides)}</b>
            </span>
            <span className="h-2 flex-1 rounded-pill bg-background">
              <span
                className="block h-full rounded-pill bg-primary"
                style={{ width: `${(row.valides / top) * 100}%` }}
              />
            </span>
            <b className="hidden w-10 text-right text-sm tabular-nums sm:block">
              {count(row.valides)}
            </b>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function CommercialTable({ pace, states }: { pace: AdminPace; states: PaceState[] }) {
  const tt = t.table;
  if (pace.conseillers.length === 0) {
    return <p className="text-sm text-muted-foreground">{tt.none}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-card">
      <table className="w-full min-w-[46rem] text-left text-sm">
        <thead className="bg-background text-xs tracking-wide text-muted-foreground uppercase">
          <tr>
            <th scope="col" className="px-5 py-3 font-semibold">
              {tt.name}
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              {tt.done}
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              {tt.progress}
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              {tt.average}
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              {tt.last}
            </th>
            <th scope="col" className="px-5 py-3 font-semibold">
              {tt.state}
            </th>
          </tr>
        </thead>
        <tbody>
          {pace.conseillers.map((c, i) => {
            const week = paceWeek(c.weeks, pace.today);
            const average = paceAverage(c.weeks, pace.today);
            const state = states[i]!;
            const shown = state === "point" && !pace.settings.alerte_retard ? "retard" : state;
            const pct = week.objectif ? Math.round((week.valides / week.objectif) * 100) : null;
            const sector = sectorOfZone(c.zone);
            const zone = sector ? sector.name : c.zone.length > 0 ? formatZoneCodes(c.zone) : null;
            return (
              <tr key={c.id} className="border-t border-border">
                <td className="px-5 py-3">
                  <span className="flex flex-col">
                    <span className="font-semibold">{c.nom}</span>
                    <span className="text-[0.8125rem] text-muted-foreground">
                      {[
                        zone,
                        c.rythme_semaine ? tt.ownGoal(c.rythme_semaine, c.rythme_raison) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </td>
                <td className="px-3 py-3 font-display font-bold tabular-nums">
                  {week.objectif === null
                    ? tt.noGoal
                    : `${count(week.valides)} / ${count(week.objectif)}`}
                </td>
                <td className="px-3 py-3">
                  {pct !== null && (
                    <span className="flex items-center gap-2.5">
                      <span className="h-2 w-24 rounded-pill bg-background">
                        <span
                          className={`block h-full rounded-pill ${shown === "point" ? "bg-warning" : "bg-primary"}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </span>
                      <span className="text-[0.8125rem] text-muted-foreground tabular-nums">
                        {pct} %
                      </span>
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 tabular-nums">
                  {average === null
                    ? tt.noGoal
                    : (Math.round(average * 10) / 10).toLocaleString("fr-FR")}
                </td>
                <td className="px-3 py-3 text-label">
                  {c.dernier_valide ? formatDayMonth(c.dernier_valide) : tt.never}
                </td>
                <td className="px-5 py-3">
                  <StatusBadge tone={STATE_TONES[shown]}>{t.states[shown]}</StatusBadge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
