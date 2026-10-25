import {
  addDays,
  mondayOf,
  weekDates,
  type AvailabilityStatus,
  type HoursRange,
} from "@menao/core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Alert, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import type { AgendaAbsence, AgendaItem } from "@/lib/artisan/agenda";
import { formatDay, formatDayMonth } from "@/lib/format";
import { ExampleLock } from "@/components/pro/examples";
import { AgendaTabs } from "./agenda-tabs";
import { availabilityLabel } from "./availability-label";
import { BlockSlotButton } from "./block-slot-button";
import { WeekView } from "./week-view";

const t = fr.pro.agenda;

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
}: {
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
}) {
  const days = weekDates(monday);
  const sunday = days[6] ?? monday;
  const thisWeek = monday === mondayOf(today);
  const weekHref = (date: string) => `${base}/agenda?semaine=${date}` as Route;

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.title}</h1>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          </div>
          <ExampleLock locked={example}>
            <AgendaTabs current="agenda" />
          </ExampleLock>
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
            <h2 className="ml-1 text-lg font-medium">{weekTitle(monday, sunday)}</h2>
          </div>
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
        </div>

        {hours.length === 0 && (
          <Alert tone="info">
            {t.hoursMissing}{" "}
            <TextLink href="/pro/agenda/disponibilites#horaires">{t.setHours}</TextLink>
          </Alert>
        )}

        {items.length === 0 && absences.length === 0 && (
          <p className="text-sm text-muted-foreground">{t.emptyWeek}</p>
        )}

        <WeekView
          days={days}
          today={today}
          now={now}
          hours={hours}
          absences={absences}
          items={items}
          base={base}
          example={example}
        />

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
