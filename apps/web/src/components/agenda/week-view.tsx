import {
  absenceOn,
  gridSpan,
  layoutDay,
  minutesToTime,
  parisDateTime,
  rangesOn,
  timeToMinutes,
  weekdayOf,
  type HoursRange,
} from "@menao/core";
import { CalendarOff, HardHat, MapPin, Palmtree, UserRound } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { fr } from "@/i18n/fr";
import { deleteBlockedSlot } from "@/lib/artisan/agenda-actions";
import type { AgendaAbsence, AgendaItem, AgendaKind } from "@/lib/artisan/agenda";
import { formatClock, formatDayMonth, formatTime } from "@/lib/format";
import { RemoveButton } from "./remove-button";

const t = fr.pro.agenda;
/** Hauteur d'une heure dans la grille, en pixels. */
const HOUR = 52;

const KIND_STYLES: Record<AgendaKind, string> = {
  visite: "border-primary bg-primary-soft text-primary-strong",
  demarrage: "border-success bg-success-soft text-success",
  creneau: "border-border-strong bg-background text-muted-foreground",
};
const KIND_ICONS = { visite: UserRound, demarrage: HardHat, creneau: CalendarOff } as const;

/** Rayures des journées d'absence. */
const ABSENCE_STRIPES: CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(135deg, var(--color-warning-soft) 0 8px, transparent 8px 16px)",
};
/** Lignes des heures. */
const HOUR_LINES: CSSProperties = {
  backgroundImage: "linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)",
  backgroundSize: `100% ${HOUR}px`,
};

type Placed = AgendaItem & { date: string; startMinutes: number; endMinutes: number };

const clockOf = (minutes: number) => formatClock(minutesToTime(minutes));

function describe(item: Placed): string {
  const time = t.range(clockOf(item.startMinutes), clockOf(item.endMinutes));
  return [t.kinds[item.kind], time, item.title, item.place].filter(Boolean).join(" · ");
}

/**
 * Semaine de l'agenda (F-44). Ordinateur : grille horaire du lundi au dimanche, horaires de travail
 * en clair, absences rayées, heure actuelle en rouge. Mobile : liste jour par jour.
 */
export function WeekView({
  days,
  today,
  now,
  hours,
  absences,
  items,
  base = "/pro",
  example = false,
}: {
  days: string[];
  today: string;
  now: Date;
  hours: HoursRange[];
  absences: AgendaAbsence[];
  items: AgendaItem[];
  /** Début des liens vers les chantiers (pages d'exemples, ADR 0184). */
  base?: string;
  /** Exemple : pas de « Libérer » sur les créneaux bloqués. */
  example?: boolean;
}) {
  const placed: Placed[] = items
    .map((item) => {
      const { date, minutes } = parisDateTime(new Date(item.start));
      return {
        ...item,
        date,
        startMinutes: minutes,
        endMinutes: Math.min(24 * 60, minutes + item.durationMinutes),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.startMinutes - b.startMinutes);
  const span = gridSpan(hours, placed);
  const height = ((span.end - span.start) / 60) * HOUR;
  const top = (minutes: number) => ((minutes - span.start) / 60) * HOUR;
  const nowMinutes = parisDateTime(now).minutes;
  const hourMarks = Array.from(
    { length: (span.end - span.start) / 60 + 1 },
    (_, i) => span.start + i * 60,
  );
  // Absences de la semaine : une barre par absence, de son premier à son dernier jour affiché.
  const first = days[0] ?? "";
  const last = days[days.length - 1] ?? "";
  const weekAbsences = absences
    .map((a) => ({
      absence: a,
      from: days.indexOf(a.startsOn < first ? first : a.startsOn),
      to: days.indexOf(a.endsOn > last ? last : a.endsOn),
    }))
    .filter((a) => a.from >= 0 && a.to >= a.from);

  return (
    <>
      {/* Ordinateur : grille horaire */}
      <div className="hidden overflow-hidden rounded-card border border-border bg-surface shadow-card lg:block">
        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-border">
          <div />
          {days.map((day, i) => {
            const isToday = day === today;
            return (
              <div key={day} className="border-l border-border px-1 py-2.5 text-center">
                <p
                  className={`text-xs font-medium tracking-wide uppercase ${isToday ? "text-primary" : "text-muted-foreground"}`}
                >
                  {t.weekdaysShort[i]}
                </p>
                <p
                  aria-current={isToday ? "date" : undefined}
                  className={`mx-auto mt-1 flex size-8 items-center justify-center rounded-full text-[0.9375rem] font-medium tabular-nums ${isToday ? "bg-primary text-primary-foreground" : ""}`}
                >
                  {Number(day.slice(8, 10))}
                </p>
              </div>
            );
          })}
        </div>

        {weekAbsences.length > 0 && (
          <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-border">
            <p className="self-center pr-2 text-right text-[0.6875rem] text-subtle-foreground">
              {t.allDay}
            </p>
            <div className="col-span-7 grid grid-cols-7 py-1.5">
              {weekAbsences.map(({ absence, from, to }) => (
                <p
                  key={absence.id}
                  style={{ gridColumn: `${from + 1} / ${to + 2}` }}
                  title={[t.kinds.absence, absence.label].filter(Boolean).join(" · ")}
                  className="mx-1 flex min-w-0 items-center gap-1.5 rounded-chip bg-warning-soft px-2 py-1 text-xs font-medium text-warning"
                >
                  <Palmtree aria-hidden="true" className="size-3.5 shrink-0" />
                  <span className="truncate">{absence.label ?? t.kinds.absence}</span>
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
          <div aria-hidden="true" className="relative" style={{ height }}>
            {hourMarks.slice(0, -1).map((m) => (
              <span
                key={m}
                className="absolute right-2 text-[0.6875rem] text-subtle-foreground tabular-nums"
                style={{ top: top(m) + 2 }}
              >
                {m / 60}h
              </span>
            ))}
          </div>
          {days.map((day) => {
            const ranges = rangesOn(hours, weekdayOf(day));
            const absent = absenceOn(absences, day) !== null;
            const dayItems = layoutDay(placed.filter((p) => p.date === day));
            const isToday = day === today;
            return (
              <div
                key={day}
                className={`relative border-l border-border ${hours.length > 0 ? "bg-background" : ""}`}
                style={{ height }}
              >
                {ranges.map((r) => (
                  <div
                    key={r.start}
                    className="absolute inset-x-0 bg-surface"
                    style={{
                      top: top(timeToMinutes(r.start)),
                      height: ((timeToMinutes(r.end) - timeToMinutes(r.start)) / 60) * HOUR,
                    }}
                  />
                ))}
                {absent && <div className="absolute inset-0" style={ABSENCE_STRIPES} />}
                <div className="pointer-events-none absolute inset-0" style={HOUR_LINES} />
                {dayItems.map(({ item, column, columns }) => (
                  <AgendaBlock
                    key={item.id}
                    item={item}
                    base={base}
                    example={example}
                    compact={columns > 1}
                    style={{
                      top: top(item.startMinutes) + 1,
                      height: Math.max(((item.endMinutes - item.startMinutes) / 60) * HOUR - 2, 24),
                      left: `calc(${(column / columns) * 100}% + 3px)`,
                      width: `calc(${100 / columns}% - 6px)`,
                    }}
                  />
                ))}
                {isToday && nowMinutes >= span.start && nowMinutes <= span.end && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-danger"
                    style={{ top: top(nowMinutes) }}
                  >
                    <span className="absolute -top-[5px] -left-[5px] size-2 rounded-full bg-danger" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile : liste jour par jour */}
      <ol className="flex flex-col gap-3 lg:hidden">
        {days.map((day, i) => {
          const ranges = rangesOn(hours, weekdayOf(day));
          const absence = absenceOn(absences, day);
          const dayItems = placed.filter((p) => p.date === day);
          const isToday = day === today;
          return (
            <li
              key={day}
              aria-current={isToday ? "date" : undefined}
              className={`rounded-card border bg-surface p-4 shadow-card ${isToday ? "border-primary/50" : "border-border"}`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-medium">
                  {t.weekdays[i]} {formatDayMonth(day)}
                </h3>
                {isToday && <span className="text-xs font-medium text-primary">{t.thisWeek}</span>}
              </div>
              {hours.length > 0 && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {ranges.length > 0
                    ? ranges
                        .map((r) => t.range(formatClock(r.start), formatClock(r.end)))
                        .join(" · ")
                    : t.closed}
                </p>
              )}
              {absence && (
                <p className="mt-2 flex items-center gap-1.5 rounded-chip bg-warning-soft px-2 py-1 text-xs font-medium text-warning">
                  <Palmtree aria-hidden="true" className="size-3.5" />
                  {[t.kinds.absence, absence.label].filter(Boolean).join(" · ")}
                </p>
              )}
              {dayItems.length > 0 ? (
                <ul className="mt-3 flex flex-col gap-2">
                  {dayItems.map((item) => (
                    <li key={item.id}>
                      <AgendaBlock item={item} variant="row" base={base} example={example} />
                    </li>
                  ))}
                </ul>
              ) : (
                !absence && <p className="mt-2 text-sm text-subtle-foreground">{t.emptyDay}</p>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}

/** Visite ou démarrage (lien vers le chantier), ou créneau bloqué (avec « Libérer »). */
function AgendaBlock({
  item,
  style,
  variant = "grid",
  compact = false,
  base,
  example,
}: {
  item: Placed;
  style?: CSSProperties;
  variant?: "grid" | "row";
  /** Colonne étroite (événements côte à côte) : heure et titre seulement. */
  compact?: boolean;
  base: string;
  example: boolean;
}) {
  const Icon = KIND_ICONS[item.kind];
  const grid = variant === "grid";
  const time = formatTime(item.start);
  const body = (
    <>
      <span className="flex min-w-0 items-center gap-1 font-medium">
        <Icon aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="truncate">{compact ? time : `${time} · ${t.kinds[item.kind]}`}</span>
      </span>
      {item.title && <span className="block truncate text-foreground/85">{item.title}</span>}
      {item.place && !compact && (grid ? item.durationMinutes >= 60 : true) && (
        <span className="flex min-w-0 items-center gap-1 text-[0.6875rem] opacity-80">
          <MapPin aria-hidden="true" className="size-3 shrink-0" />
          <span className="truncate">{item.place}</span>
        </span>
      )}
    </>
  );
  const classes = `${KIND_STYLES[item.kind]} border-l-[3px] text-xs leading-4 ${
    grid ? "absolute z-[1] overflow-hidden rounded-md px-1.5 py-1" : "flex rounded-lg px-3 py-2"
  }`;

  if (item.chantierId) {
    return (
      <Link
        href={`${base}/chantiers/${item.chantierId}` as Route}
        aria-label={describe(item)}
        title={describe(item)}
        style={style}
        className={`${classes} transition-shadow hover:shadow-raised focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none ${grid ? "block" : "flex-col"}`}
      >
        {body}
      </Link>
    );
  }
  return (
    <div
      style={style}
      title={describe(item)}
      className={`${classes} ${grid ? "group" : "items-start justify-between gap-2"}`}
    >
      <span className="block min-w-0">{body}</span>
      {/* Grille : « Libérer » apparaît au survol ou au clavier ; liste mobile : toujours visible. */}
      {!example && (
        <RemoveButton
          action={deleteBlockedSlot.bind(null, item.id)}
          label={t.block.remove(describe(item))}
          className={
            grid
              ? "absolute top-0.5 right-0.5 size-6 bg-surface opacity-0 shadow-card group-hover:opacity-100"
              : "-mr-1 size-8 opacity-70 hover:opacity-100"
          }
        />
      )}
    </div>
  );
}
