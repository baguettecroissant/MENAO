import {
  addDays,
  paceNeededPerWeek,
  pacePlanToday,
  paceRanking,
  paceWeek,
  type PaceWeek,
} from "@menao/core";
import { Bell, Flag, Target } from "lucide-react";
import type { Route } from "next";
import { launchDayMonth } from "@/components/launch/format";
import { ButtonLink, Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import type { CommercialPace } from "@/lib/commercial/pace";

const t = fr.commercialResults.pace;
const count = (n: number) => n.toLocaleString("fr-FR");

/**
 * Haut de « Mes résultats » du conseiller (F-184, lot 78, ADR 0381) : ma semaine (objectif, ce qu'il
 * manque d'ici dimanche, le repère), semaine par semaine, objectif commun de l'équipe et classement.
 * Aucun calcul ici : tout vient de @menao/core. Les objectifs portent sur des artisans validés ; le
 * repère de visites n'est qu'un repère.
 */
export function PacePanel({ pace }: { pace: CommercialPace }) {
  const s = pace.settings;
  return (
    <div className="flex flex-col gap-5">
      <WeekCard pace={pace} />
      <div className="grid items-start gap-5 lg:grid-cols-[1.25fr_1fr]">
        <WeekBars weeks={pace.me.weeks} today={pace.today} settings={s} />
        <div className="flex flex-col gap-5">
          <TeamGoal pace={pace} />
          {pace.classement && pace.classement.length > 0 && <Ranking rows={pace.classement} />}
          <p className="flex items-start gap-3 rounded-card border border-border bg-surface px-4 py-3 text-sm text-label">
            <Bell aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {t.email}
          </p>
        </div>
      </div>
    </div>
  );
}

const RING = 2 * Math.PI * 42;

function Ring({ done, goal }: { done: number; goal: number }) {
  const part = goal > 0 ? Math.min(1, done / goal) : 0;
  return (
    <div
      role="img"
      aria-label={t.ringLabel(done, goal)}
      className="relative size-28 shrink-0 sm:size-36"
    >
      <svg viewBox="0 0 100 100" aria-hidden="true" className="size-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          strokeWidth="9"
          className="stroke-primary-soft"
        />
        {part > 0 && (
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={RING}
            strokeDashoffset={RING * (1 - part)}
            className={part === 1 ? "stroke-success" : "stroke-primary"}
          />
        )}
      </svg>
      <span
        aria-hidden="true"
        className="absolute inset-0 flex flex-col items-center justify-center"
      >
        <span className="font-display text-2xl leading-none font-bold tracking-tight tabular-nums sm:text-[2rem]">
          {count(done)}
          <span className="font-semibold text-muted-foreground"> / {count(goal)}</span>
        </span>
        <span className="mt-1 text-xs text-muted-foreground">{t.validated}</span>
      </span>
    </div>
  );
}

function WeekCard({ pace }: { pace: CommercialPace }) {
  const week = paceWeek(pace.me.weeks, pace.today);
  const goal = week.objectif;
  const headline =
    goal === null ? t.noGoal : week.manque === 0 ? t.reached : t.remaining(week.manque);
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-7">
        <div className="flex items-center gap-4 sm:contents">
          {goal !== null && <Ring done={week.valides} goal={goal} />}
          <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase sm:hidden">
            {t.weekLabel(launchDayMonth(week.semaine), launchDayMonth(addDays(week.semaine, 6)))}
          </p>
        </div>
        <div className="flex flex-1 flex-col gap-2.5">
          <p className="hidden text-[0.8125rem] font-bold tracking-wide text-muted-foreground uppercase sm:block">
            {t.weekLabel(launchDayMonth(week.semaine), launchDayMonth(addDays(week.semaine, 6)))}
          </p>
          <h2 className="font-display text-xl leading-tight font-bold tracking-tight sm:text-[1.75rem]">
            {headline}
          </h2>
          <p className="text-[0.9375rem] leading-relaxed text-label">
            {t.pending(pace.me.en_verification)}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <ButtonLink href={"/commercial" as Route} block className="sm:w-auto">
              {t.signups}
            </ButtonLink>
            <ButtonLink
              href={"/commercial/journee" as Route}
              variant="secondary"
              block
              className="sm:w-auto"
            >
              {t.myDay}
            </ButtonLink>
          </div>
        </div>
      </div>
      {goal !== null && (
        <p className="flex items-start gap-3 rounded-input bg-background px-4 py-3 text-sm leading-relaxed text-label">
          <Target aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            <b className="font-semibold text-foreground">{t.hintLabel}</b>{" "}
            {t.hint(pace.settings.rythme_semaine, pace.settings.repere_visites_jour)}
          </span>
        </p>
      )}
    </Card>
  );
}

function WeekBars({
  weeks,
  today,
  settings,
}: {
  weeks: readonly PaceWeek[];
  today: string;
  settings: CommercialPace["settings"];
}) {
  const shown = weeks.filter((w) => w.objectif !== null);
  if (shown.length === 0) return <div />;
  const current = paceWeek(weeks, today).semaine;
  const max = Math.max(1, ...shown.map((w) => Math.max(w.valides, w.objectif ?? 0))) * 1.2;
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-bold tracking-tight">{t.weeksTitle}</h2>
        <span aria-hidden="true" className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-5 border-t-2 border-dashed border-border-strong" />
          {t.goal}
        </span>
      </div>
      <div aria-hidden="true" className="flex items-end gap-2 sm:gap-3.5">
        {shown.map((w) => {
          const live = w.semaine === current;
          return (
            <div key={w.semaine} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-xs font-bold tabular-nums">{count(w.valides)}</span>
              <div className="relative flex h-32 w-full items-end justify-center sm:h-44">
                {w.objectif !== null && (
                  <span
                    className="absolute inset-x-0 border-t-2 border-dashed border-border-strong"
                    style={{ bottom: `${(w.objectif / max) * 100}%` }}
                  />
                )}
                <span
                  className={`w-3/5 rounded-t-lg rounded-b-sm ${
                    live ? "border-2 border-dashed border-primary bg-primary-soft" : "bg-primary"
                  }`}
                  style={{ height: `${Math.max(2, (w.valides / max) * 100)}%` }}
                />
              </div>
              <span className="text-[0.6875rem] whitespace-nowrap text-muted-foreground">
                {launchDayMonth(w.semaine)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="sr-only">
        <table>
          <caption>{t.weeksCaption}</caption>
          <thead>
            <tr>
              <th scope="col">{t.week}</th>
              <th scope="col">{t.validated}</th>
              <th scope="col">{t.goal}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((w) => (
              <tr key={w.semaine}>
                <th scope="row">{launchDayMonth(w.semaine)}</th>
                <td>{count(w.valides)}</td>
                <td>{w.objectif === null ? "" : count(w.objectif)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[0.8125rem] text-muted-foreground">
        {t.weeksNote(
          settings.semaines_demarrage,
          settings.rythme_demarrage,
          settings.rythme_semaine,
        )}
      </p>
    </Card>
  );
}

function TeamGoal({ pace }: { pace: CommercialPace }) {
  const s = pace.settings;
  const goal = s.objectif_valides;
  if (!goal) return null;
  const done = pace.equipe.valides;
  const expected = pacePlanToday(s, pace.today);
  const needed = paceNeededPerWeek(s, done, pace.today);
  const tt = t.team;
  return (
    <section className="flex flex-col gap-3 rounded-card bg-foreground p-5 text-white sm:p-6">
      <p className="flex items-center gap-2 text-[0.8125rem] font-bold tracking-wide uppercase opacity-75">
        <Flag aria-hidden="true" className="size-4" />
        {tt.label}
      </p>
      <p className="flex flex-wrap items-baseline gap-2">
        <span className="font-display text-[2rem] leading-none font-bold tracking-tight tabular-nums sm:text-4xl">
          {count(done)}
        </span>
        <span className="text-[0.9375rem] opacity-80">
          {tt.count(goal, s.fin ? launchDayMonth(s.fin) : null)}
        </span>
      </p>
      <div aria-hidden="true" className="relative h-2.5 rounded-pill bg-white/20">
        <span
          className="absolute inset-y-0 left-0 rounded-pill bg-[#7ee2b0]"
          style={{ width: `${Math.min(100, (done / goal) * 100)}%` }}
        />
        {expected !== null && expected > 0 && expected < goal && (
          <span
            className="absolute -inset-y-1 border-l-2 border-white"
            style={{ left: `${(expected / goal) * 100}%` }}
          />
        )}
      </div>
      <p className="text-sm leading-relaxed opacity-85">
        {done >= goal
          ? tt.done
          : [
              expected !== null && expected > 0 ? tt.expected(expected) : null,
              needed ? tt.needed(needed) : null,
            ]
              .filter(Boolean)
              .join(" ")}
      </p>
    </section>
  );
}

function Ranking({ rows }: { rows: NonNullable<CommercialPace["classement"]> }) {
  const r = t.ranking;
  const ranking = paceRanking(rows);
  return (
    <Card className="flex flex-col gap-1.5 !p-4 sm:!p-5">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 className="font-display text-lg font-bold tracking-tight">{r.title}</h2>
        <span className="text-right text-xs text-muted-foreground">{r.lead}</span>
      </div>
      <ol className="flex flex-col">
        {ranking.map((row) => (
          <li
            key={`${row.rang}-${row.nom}`}
            className={`flex items-center gap-3 rounded-input px-3 py-2.5 ${row.moi ? "bg-primary-soft" : ""}`}
          >
            <span
              className={`w-5 text-center font-bold tabular-nums ${
                row.rang === 1 ? "text-warning" : "text-muted-foreground"
              }`}
            >
              {row.rang}
            </span>
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-[0.6875rem] font-bold text-white"
            >
              {row.nom
                .split(" ")
                .map((p) => p[0])
                .join("")
                .replace(".", "")}
            </span>
            <span className={`flex-1 text-[0.9375rem] ${row.moi ? "font-bold" : ""}`}>
              {row.nom}
              {row.moi && ` ${r.you}`}
            </span>
            <span className="font-display font-bold tabular-nums">
              {row.moyenne.toLocaleString("fr-FR")}
            </span>
            <span className="w-14 text-xs text-muted-foreground sm:w-20">
              <span className="sm:hidden">{r.perWeekShort}</span>
              <span className="hidden sm:inline">{r.perWeek}</span>
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
