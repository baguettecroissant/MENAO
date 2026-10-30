import { addDays, initials } from "@menao/core";
import { Check, CircleAlert } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { fr } from "@/i18n/fr";
import { launchDate, launchDayMonth, launchRange } from "./format";

/**
 * Pièces visuelles des tableaux de lancement (F-66, ADR 0208), en CSS et SVG maison : pastille
 * d'initiales, anneau et barre d'avancement, comptes à rebours des jalons, bande des semaines.
 * Aucun calcul ici : les chiffres viennent de @menao/core.
 */

const t = fr.commercialLaunch.board;

/** Pastille ronde aux initiales du membre (décorative : le nom est écrit à côté). */
export function MemberAvatar({ nom, size = "md" }: { nom: string; size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-primary-soft font-medium text-primary-strong ${
        size === "lg" ? "size-14 text-lg" : "size-10 text-sm"
      }`}
    >
      {initials(nom)}
    </span>
  );
}

const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Anneau d'avancement, lu comme une barre de progression (« 3 tâches faites sur 8 »). */
export function ProgressRing({
  percent,
  label,
  valueText,
}: {
  percent: number;
  label: string;
  valueText: string;
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={valueText}
      className="relative size-16 shrink-0"
    >
      <svg viewBox="0 0 64 64" aria-hidden="true" className="size-16 -rotate-90">
        <circle
          cx="32"
          cy="32"
          r={RADIUS}
          fill="none"
          strokeWidth="6"
          className="stroke-primary-soft"
        />
        {percent > 0 && (
          <circle
            cx="32"
            cy="32"
            r={RADIUS}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - percent / 100)}
            className={percent === 100 ? "stroke-success" : "stroke-primary"}
          />
        )}
      </svg>
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center text-sm font-medium tabular-nums"
      >
        {percent} %
      </span>
    </div>
  );
}

/** Barre d'avancement fine (cartes des membres, étapes du lancement). */
export function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-1.5 overflow-hidden rounded-pill bg-primary-soft"
    >
      <div
        className={`h-full rounded-pill ${percent === 100 ? "bg-success" : "bg-primary"}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/**
 * Comptes à rebours des prochains jalons : « J-47 · Tout est prêt, mar. 15 déc. ». Sans jalon à
 * venir : rien, ou le texte `empty` sous le titre (vue d'équipe du back-office).
 */
export function MilestoneCountdowns({
  milestones,
  label,
  headingLevel = "h3",
  empty,
}: {
  milestones: readonly { id: string; titre: string; echeance: string; daysLeft: number }[];
  label: string;
  headingLevel?: "h2" | "h3";
  empty?: string;
}) {
  if (milestones.length === 0 && !empty) return null;
  const Heading = headingLevel;
  const id = `jalons-${headingLevel}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <Heading id={id} className="text-base font-medium">
        {label}
      </Heading>
      {milestones.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ol className="grid gap-2 sm:grid-cols-3">
          {milestones.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-card border border-border bg-surface p-3 shadow-card"
            >
              <span className="shrink-0 rounded-input bg-primary-soft px-2.5 py-1.5 text-lg font-medium text-primary-strong tabular-nums">
                {t.countdown(m.daysLeft)}
              </span>
              <span className="sr-only"> · </span>
              <span className="flex min-w-0 flex-col">
                <span className="line-clamp-2 text-sm font-medium">{m.titre}</span>
                <span className="sr-only">, </span>
                <span className="text-xs text-muted-foreground">{launchDate(m.echeance)}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export type WeekCase = {
  start: string;
  total: number;
  done: number;
  late: number;
  current: boolean;
  /** Ancre de la semaine dans la page (ou adresse du filtre « Tout ») ; null : semaine vide. */
  href: string | null;
};

/**
 * Bande des semaines, une case par semaine (vides comprises) : faite en vert (coche), en retard en
 * rouge (pictogramme d'alerte avant le nombre, pas seulement la couleur), semaine en cours
 * encadrée, à venir avec le nombre de tâches restantes. Libellé complet lu par les lecteurs d'écran
 * et en bulle au survol. Défilement de côté dans la bande seulement (la semaine du jour est à
 * l'écran : launchWeekStrip commence peu avant).
 */
export function WeekStrip({ weeks }: { weeks: readonly WeekCase[] }) {
  if (weeks.length === 0) return null;
  return (
    <nav aria-label={t.weeks}>
      <ol className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pt-1 pb-2">
        {weeks.map((w) => {
          const label = `${t.weekCase(launchRange(w.start, addDays(w.start, 6)), w.total, w.done, w.late)}${
            w.current ? ` (${t.thisWeekCase})` : ""
          }`;
          const tone =
            w.total === 0
              ? "bg-background text-subtle-foreground"
              : w.late > 0
                ? "bg-danger-soft text-danger"
                : w.done === w.total
                  ? "bg-success-soft text-success"
                  : "border border-border bg-surface text-foreground";
          const box = (
            <>
              <span aria-hidden="true" className="text-[0.6875rem] text-muted-foreground">
                {launchDayMonth(w.start)}
              </span>
              <span
                aria-hidden="true"
                className={`flex h-9 w-11 items-center justify-center rounded-input text-sm font-medium tabular-nums ${tone} ${
                  w.current ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                }`}
              >
                {w.total === 0 ? (
                  "·"
                ) : w.late > 0 ? (
                  <span className="flex items-center gap-0.5">
                    <CircleAlert className="size-3" strokeWidth={2.5} />
                    {w.late}
                  </span>
                ) : w.done === w.total ? (
                  <Check className="size-4" strokeWidth={3} />
                ) : (
                  w.total - w.done
                )}
              </span>
            </>
          );
          return (
            <li key={w.start} className="shrink-0">
              {w.href ? (
                <Link
                  href={w.href as Route}
                  aria-label={label}
                  title={label}
                  aria-current={w.current ? "date" : undefined}
                  className="flex flex-col items-center gap-1 rounded-input p-1 outline-none hover:bg-surface focus-visible:ring-4 focus-visible:ring-primary/20"
                >
                  {box}
                </Link>
              ) : (
                <span title={label} className="flex flex-col items-center gap-1 p-1">
                  <span className="sr-only">{label}</span>
                  {box}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
