import {
  addDays,
  defaultAgendaDay,
  mondayOf,
  weekDates,
  type AvailabilityStatus,
  type HoursRange,
} from "@menao/core";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Alert, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import type { AgendaAbsence, AgendaItem } from "@/lib/artisan/agenda";
import { formatDay, formatDayMonth, formatDayShort, formatTime } from "@/lib/format";
import { ExampleLock } from "@/components/pro/examples";
import { SheetChip, sheetCard } from "@/components/pro/sheet";
import { AgendaTabs } from "./agenda-tabs";
import { availabilityLabel } from "./availability-label";
import { BlockSlotButton } from "./block-slot-button";
import { WeekView } from "./week-view";

const t = fr.pro.agenda;

/** Prochaine visite ou démarrage (`upcomingAgenda` de @menao/core). */
export type AgendaUpcoming = {
  kind: "visite" | "demarrage";
  at: string;
  chantierId: string;
  title: string;
  client: string | null;
  place: string | null;
};

const STATUS_STYLES: Record<AvailabilityStatus["kind"], string> = {
  disponible: "bg-success-soft text-success",
  a_partir_du: "bg-primary-soft text-primary-strong",
  pause: "bg-warning-soft text-warning",
  conges: "bg-warning-soft text-warning",
};

const navButton =
  "inline-flex size-10 items-center justify-center rounded-full border border-border bg-surface text-foreground shadow-card hover:bg-background focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none";

/** « Du 12 au 18 octobre 2026 », « Du 26 octobre au 1 novembre 2026 »… */
function weekTitle(monday: string, sunday: string): string {
  if (monday.slice(0, 4) !== sunday.slice(0, 4)) {
    return t.week(formatDay(monday), formatDay(sunday));
  }
  if (monday.slice(0, 7) !== sunday.slice(0, 7)) {
    return t.week(formatDayMonth(monday), formatDay(sunday));
  }
  return t.week(String(Number(monday.slice(8, 10))), formatDay(sunday));
}

/**
 * Écran « Agenda » (F-44) : navigation de semaine en semaine, statut de disponibilité, « Bloquer
 * un créneau », grille de la semaine et légende.
 */
export function AgendaScreen({
  monday,
  today,
  now,
  availability,
  hours,
  items,
  absences,
  base = "/pro",
  example = false,
  canEdit = true,
  day,
  upcoming = [],
}: {
  /** Jour choisi sur téléphone (?jour=AAAA-MM-JJ) ; par défaut aujourd'hui ou le lundi. */
  day?: string | null;
  /** Prochaines visites et démarrages (colonne « À venir » en grand écran, ADR 0249). */
  upcoming?: readonly AgendaUpcoming[];
  monday: string;
  today: string;
  now: Date;
  availability: AvailabilityStatus;
  hours: HoursRange[];
  items: AgendaItem[];
  absences: AgendaAbsence[];
  /** Début des liens (pages d'exemples, ADR 0184). */
  base?: string;
  /** Exemple : disponibilités, créneau à bloquer et onglets inactifs. */
  example?: boolean;
  /**
   * Créneaux, absences, horaires et disponibilité (ADR 0241) : patron et chef d'équipe ; un
   * ouvrier voit les rendez-vous de ses chantiers, en lecture.
   */
  canEdit?: boolean;
}) {
  const days = weekDates(monday);
  const sunday = days[6] ?? monday;
  const thisWeek = monday === mondayOf(today);
  const weekHref = (date: string) => `${base}/agenda?semaine=${date}` as Route;
  const selected = day && days.includes(day) ? day : defaultAgendaDay(monday, today);
  const dayHref = (date: string) => `${base}/agenda?semaine=${monday}&jour=${date}`;

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[2rem] leading-[1.05] sm:text-[2.5rem]">{t.title}</h1>
            <p className="text-[0.9375rem] text-label sm:text-base">{t.subtitle}</p>
          </div>
          {canEdit && (
            <ExampleLock locked={example}>
              <AgendaTabs current="agenda" />
            </ExampleLock>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Link
              href={weekHref(addDays(monday, -7))}
              aria-label={t.previousWeek}
              className={navButton}
            >
              <ChevronLeft aria-hidden="true" className="size-5" />
            </Link>
            <Link href={weekHref(addDays(monday, 7))} aria-label={t.nextWeek} className={navButton}>
              <ChevronRight aria-hidden="true" className="size-5" />
            </Link>
            {!thisWeek && (
              <Link
                href={`${base}/agenda` as Route}
                className="inline-flex min-h-10 items-center rounded-pill border border-border bg-surface px-4 text-sm font-medium shadow-card hover:bg-background focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
              >
                {t.thisWeek}
              </Link>
            )}
            <h2 className="ml-1 text-xl sm:text-[1.375rem]">{weekTitle(monday, sunday)}</h2>
          </div>
          {canEdit && (
            <ExampleLock locked={example}>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/pro/agenda/disponibilites"
                  className={`inline-flex min-h-10 items-center gap-2 rounded-pill px-4 text-sm font-medium focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none ${STATUS_STYLES[availability.kind]}`}
                >
                  <span aria-hidden="true" className="size-2 rounded-full bg-current" />
                  {availabilityLabel(availability)}
                </Link>
                <BlockSlotButton minDate={today} defaultDate={monday > today ? monday : today} />
              </div>
            </ExampleLock>
          )}
        </div>

        {canEdit && hours.length === 0 && (
          <Alert tone="info">
            {t.hoursMissing}{" "}
            <TextLink href="/pro/agenda/disponibilites#horaires">{t.setHours}</TextLink>
          </Alert>
        )}

        {items.length === 0 && absences.length === 0 && (
          <p className="text-sm text-muted-foreground">{t.emptyWeek}</p>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="flex min-w-0 flex-col gap-5">
            <WeekView
              days={days}
              today={today}
              now={now}
              hours={hours}
              absences={absences}
              items={items}
              base={base}
              example={example}
              readOnly={!canEdit}
              selected={selected}
              dayHref={dayHref}
            />
          </div>
          <aside className="flex flex-col gap-4 max-lg:hidden">
            <section aria-labelledby="agenda-a-venir" className={sheetCard}>
              <h2 id="agenda-a-venir" className="text-lg">
                {t.upcoming}
              </h2>
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.upcomingEmpty}</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {upcoming.map((u) => (
                    <li
                      key={`${u.kind}-${u.chantierId}-${u.at}`}
                      className="flex gap-3 py-3.5 first:pt-0 last:pb-0"
                    >
                      <span className="flex w-14 shrink-0 flex-col">
                        <span className="text-xs font-bold text-muted-foreground uppercase">
                          {formatDayShort(u.at)}
                        </span>
                        <span className="font-display text-lg leading-tight font-bold tabular-nums">
                          {formatTime(u.at)}
                        </span>
                      </span>
                      <span
                        className={`flex min-w-0 flex-1 flex-col gap-1 border-l-[3px] pl-3 ${u.kind === "demarrage" ? "border-success" : "border-primary"}`}
                      >
                        <span>
                          <SheetChip tone={u.kind === "demarrage" ? "success" : "primary"}>
                            {t.kinds[u.kind]}
                          </SheetChip>
                        </span>
                        <span className="font-semibold leading-snug">{u.title}</span>
                        <span className="text-sm text-muted-foreground">
                          {[u.client, u.place].filter(Boolean).join(" · ")}
                        </span>
                        <Link
                          href={`${base}/chantiers/${u.chantierId}` as Route}
                          className="self-start text-sm font-semibold text-primary-strong hover:underline"
                        >
                          {t.seeChantier}
                        </Link>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            {canEdit && !example && (
              <section className={sheetCard} aria-labelledby="agenda-calendrier">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[0.625rem] bg-primary-soft text-primary-strong">
                    <CalendarDays aria-hidden="true" className="size-[1.125rem]" />
                  </span>
                  <div className="flex flex-col">
                    <h2 id="agenda-calendrier" className="font-sans text-base font-semibold">
                      {t.calendarTitle}
                    </h2>
                    <p className="text-[0.8125rem] text-muted-foreground">{t.calendarText}</p>
                  </div>
                </div>
                <Link
                  href="/pro/agenda/disponibilites#calendrier"
                  className="inline-flex min-h-10 items-center justify-center rounded-pill border border-border-strong bg-surface px-4 text-sm font-semibold hover:bg-background focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
                >
                  {t.calendarCta}
                </Link>
              </section>
            )}
          </aside>
        </div>

        <ul
          aria-label={t.legendLabel}
          className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"
        >
          <li className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-3 rounded-sm border-l-[3px] border-primary bg-primary-soft"
            />
            {t.legend.visite}
          </li>
          <li className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-3 rounded-sm border-l-[3px] border-success bg-success-soft"
            />
            {t.legend.demarrage}
          </li>
          <li className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-3 rounded-sm border-l-[3px] border-border-strong bg-background"
            />
            {t.legend.creneau}
          </li>
          {items.some((item) => item.kind === "occupe") && (
            <li className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-3 rounded-sm border-l-[3px] border-subtle-foreground bg-surface"
              />
              {t.legend.occupe}
            </li>
          )}
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="size-3 rounded-sm bg-warning-soft" />
            {t.legend.absence}
          </li>
          {hours.length > 0 && (
            <li className="hidden items-center gap-2 lg:flex">
              <span
                aria-hidden="true"
                className="size-3 rounded-sm border border-border bg-surface"
              />
              {t.legend.hours}
            </li>
          )}
        </ul>
      </div>
    </main>
  );
}
