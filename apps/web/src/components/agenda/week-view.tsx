import {
  absenceOn,
  agendaItemsAfter,
  freeRangesOn,
  gridSpan,
  layoutDay,
  minutesToTime,
  parisDateTime,
  rangesOn,
  timeToMinutes,
  weekdayOf,
  type HoursRange,
} from "@menao/core";
import {
  CalendarOff,
  ChevronRight,
  HardHat,
  Headset,
  MapPin,
  Palmtree,
  Smartphone,
  UserRound,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { fr } from "@/i18n/fr";
import { deleteBlockedSlot } from "@/lib/artisan/agenda-actions";
import type { AgendaAbsence, AgendaItem, AgendaKind } from "@/lib/artisan/agenda";
import { formatClock, formatDayInline, formatDayMonth, formatTime } from "@/lib/format";
import { AgendaItemDetails } from "./agenda-item-details";

const t = fr.pro.agenda;
/** Hauteur d'une heure dans la grille, en pixels. */
const HOUR = 60;

const KIND_STYLES: Record<AgendaKind, string> = {
  visite: "border-primary bg-primary-soft text-primary-strong",
  demarrage: "border-success bg-success-soft text-success",
  creneau: "border-border-strong bg-background text-muted-foreground",
  occupe: "border-subtle-foreground bg-surface text-muted-foreground",
};
/** Rendez-vous pris par la secrétaire dédiée (ADR 0232) : comme une visite chez le client. */
const SECRETARY_STYLE = "border-primary bg-primary-soft text-primary-strong";

const KIND_ICONS = {
  visite: UserRound,
  demarrage: HardHat,
  creneau: CalendarOff,
  occupe: Smartphone,
} as const;

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

/** Couleur du point (bande des jours) et du filet (liste) d'un rendez-vous. */
const DOTS: Record<AgendaKind, string> = {
  visite: "bg-primary",
  demarrage: "bg-success",
  creneau: "bg-border-strong",
  occupe: "bg-subtle-foreground",
};
const BARS: Record<AgendaKind, string> = {
  visite: "border-primary",
  demarrage: "border-success",
  creneau: "border-border-strong",
  occupe: "border-subtle-foreground",
};
const dotOf = (item: Placed) => (item.secretary ? DOTS.visite : DOTS[item.kind]);
const barOf = (item: Placed) => (item.secretary ? BARS.visite : BARS[item.kind]);

const clockOf = (minutes: number) => formatClock(minutesToTime(minutes));

function describe(item: Placed): string {
  const time = t.range(clockOf(item.startMinutes), clockOf(item.endMinutes));
  if (item.secretary) {
    return [t.details.secretaryKind, time, item.secretary.callerName, item.secretary.city]
      .filter(Boolean)
      .join(" · ");
  }
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
  readOnly = false,
  selected,
  dayHref,
}: {
  /** Jour affiché sur téléphone (AAAA-MM-JJ). */
  selected: string;
  /** Lien vers un jour de la semaine (?semaine=…&jour=…). */
  dayHref: (date: string) => string;
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
  /** Ouvrier (ADR 0241) : agenda en lecture, pas de « Libérer » non plus. */
  readOnly?: boolean;
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
        <div className="grid grid-cols-[3.5rem_repeat(5,minmax(0,1fr))_repeat(2,minmax(0,0.65fr))] border-b border-border">
          <div />
          {days.map((day, i) => {
            const isToday = day === today;
            return (
              <div key={day} className="border-l border-border px-1 py-2.5 text-center">
                <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                  {t.weekdaysShort[i]}
                </p>
                <p
                  aria-current={isToday ? "date" : undefined}
                  className={`mx-auto mt-1 flex size-9 items-center justify-center rounded-full font-display text-lg font-bold tabular-nums ${isToday ? "bg-foreground text-surface" : ""}`}
                >
                  {Number(day.slice(8, 10))}
                </p>
              </div>
            );
          })}
        </div>

        {weekAbsences.length > 0 && (
          <div className="grid grid-cols-[3.5rem_repeat(5,minmax(0,1fr))_repeat(2,minmax(0,0.65fr))] border-b border-border">
            <p className="self-center pr-2 text-right text-[0.6875rem] text-subtle-foreground">
              {t.allDay}
            </p>
            <div className="col-span-7 grid grid-cols-[repeat(5,minmax(0,1fr))_repeat(2,minmax(0,0.65fr))] py-1.5">
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

        <div className="grid grid-cols-[3.5rem_repeat(5,minmax(0,1fr))_repeat(2,minmax(0,0.65fr))]">
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
                    example={example || readOnly}
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

      {/* Téléphone (ADR 0249) : bande des 7 jours, le jour choisi, puis la suite de la semaine. */}
      <div className="flex flex-col gap-4 lg:hidden">
        <nav
          aria-label={t.daysLabel}
          className="flex gap-0.5 rounded-[1.125rem] border border-border bg-surface p-1 shadow-card"
        >
          {days.map((day, i) => {
            const on = day === selected;
            const kinds = placed.filter((p) => p.date === day).map((p) => dotOf(p));
            return (
              <Link
                key={day}
                href={dayHref(day) as Route}
                scroll={false}
                aria-current={on ? "date" : undefined}
                aria-label={t.dayLabel(`${t.weekdays[i]} ${formatDayMonth(day)}`, kinds.length)}
                className={`flex flex-1 flex-col items-center gap-1 rounded-[0.875rem] pt-2 pb-2.5 focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none ${on ? "bg-foreground text-surface" : ""}`}
              >
                <span
                  className={`text-[0.6875rem] font-bold uppercase ${on ? "" : "text-muted-foreground"}`}
                >
                  {t.weekdaysShort[i]?.replace(".", "")}
                </span>
                <span className="font-display text-[1.1875rem] leading-none font-bold tabular-nums">
                  {Number(day.slice(8, 10))}
                </span>
                <span aria-hidden="true" className="flex h-1.5 gap-[3px]">
                  {kinds.slice(0, 3).map((k, j) => (
                    <span key={j} className={`size-1.5 rounded-full ${on ? "bg-surface" : k}`} />
                  ))}
                </span>
              </Link>
            );
          })}
        </nav>
        {(() => {
          const index = Math.max(0, days.indexOf(selected));
          const ranges = rangesOn(hours, weekdayOf(selected));
          const absence = absenceOn(absences, selected);
          const dayItems = placed.filter((p) => p.date === selected);
          const later = agendaItemsAfter(placed, selected, days[days.length - 1] ?? selected);
          const free = freeRangesOn({ date: selected, hours, absences, items: placed, now });
          return (
            <>
              <section aria-labelledby="agenda-jour" className="flex flex-col gap-3">
                <h3 id="agenda-jour" className="flex items-baseline gap-2 text-lg">
                  {t.weekdays[index]} {formatDayMonth(selected)}
                  <span className="font-sans text-sm font-semibold text-muted-foreground">
                    {t.dayCount(dayItems.length)}
                  </span>
                </h3>
                {hours.length > 0 && (
                  <p className="-mt-2 text-[0.8125rem] text-muted-foreground">
                    {ranges.length > 0
                      ? ranges
                          .map((r) => t.range(formatClock(r.start), formatClock(r.end)))
                          .join(" · ")
                      : t.closed}
                  </p>
                )}
                {absence && (
                  <p className="flex items-center gap-1.5 rounded-chip bg-warning-soft px-2.5 py-1.5 text-sm font-medium text-warning">
                    <Palmtree aria-hidden="true" className="size-4" />
                    {[t.kinds.absence, absence.label].filter(Boolean).join(" · ")}
                  </p>
                )}
                {dayItems.length > 0 ? (
                  <ul className="flex flex-col gap-2">
                    {dayItems.map((item) => (
                      <li key={item.id}>
                        <AgendaBlock
                          item={item}
                          variant="row"
                          base={base}
                          example={example || readOnly}
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  !absence && (
                    <p className="rounded-card border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                      {t.emptyDay}
                    </p>
                  )
                )}
                {free.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t.free(free.map((r) => t.range(formatClock(r.start), formatClock(r.end))))}
                  </p>
                )}
              </section>
              {later.length > 0 && (
                <section aria-labelledby="agenda-plus-tard" className="flex flex-col gap-3">
                  <h3 id="agenda-plus-tard" className="flex items-baseline gap-2 text-lg">
                    {t.later}
                    <span className="font-sans text-sm font-semibold text-muted-foreground">
                      {later.length}
                    </span>
                  </h3>
                  <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface shadow-card">
                    {later.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={dayHref(item.date) as Route}
                          scroll={false}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-background focus-visible:bg-background focus-visible:outline-none"
                        >
                          <span className="flex w-14 shrink-0 flex-col">
                            <span className="text-xs font-bold text-muted-foreground uppercase">
                              {t.weekdaysShort[days.indexOf(item.date)]}{" "}
                              {Number(item.date.slice(8, 10))}
                            </span>
                            <span className="font-display font-bold tabular-nums">
                              {clockOf(item.startMinutes)}
                            </span>
                          </span>
                          <span
                            className={`flex min-w-0 flex-1 flex-col gap-0.5 border-l-[3px] pl-3 ${barOf(item)}`}
                          >
                            <span className="truncate font-semibold">
                              {item.secretary ? item.secretary.callerName : item.title}
                            </span>
                            <span className="truncate text-sm text-muted-foreground">
                              {[
                                item.secretary ? t.details.secretaryKind : t.kinds[item.kind],
                                item.secretary ? item.secretary.city : item.place,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                          <ChevronRight
                            aria-hidden="true"
                            className="size-5 shrink-0 text-muted-foreground"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          );
        })()}
      </div>
    </>
  );
}

/**
 * Visite ou démarrage (lien vers le chantier), ou créneau sans chantier : rendez-vous de la
 * secrétaire, créneau bloqué ou plage du téléphone, avec sa fenêtre de détail.
 */
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
  const s = item.secretary;
  const Icon = s ? Headset : KIND_ICONS[item.kind];
  const grid = variant === "grid";
  const time = formatTime(item.start);
  const kindLabel = s ? t.details.secretaryKind : t.kinds[item.kind];
  const title = s ? s.callerName : item.title;
  const place = s ? s.city : item.place;
  const body = (
    <>
      <span className="flex min-w-0 items-center gap-1 font-medium">
        <Icon aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="truncate">{compact ? time : `${time} · ${kindLabel}`}</span>
      </span>
      {title && <span className="block truncate text-foreground/85">{title}</span>}
      {place && !compact && (grid ? item.durationMinutes >= 60 : true) && (
        <span className="flex min-w-0 items-center gap-1 text-[0.6875rem] opacity-80">
          <MapPin aria-hidden="true" className="size-3 shrink-0" />
          <span className="truncate">{place}</span>
        </span>
      )}
    </>
  );
  const classes = `${s ? SECRETARY_STYLE : KIND_STYLES[item.kind]} border-l-[3px] ${
    grid
      ? "absolute z-[1] overflow-hidden rounded-lg px-2 py-1.5 text-xs leading-4"
      : "flex rounded-xl px-3.5 py-3 text-sm leading-5"
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
  // Créneau sans chantier : cliquable, détail et « Libérer » dans une fenêtre (ADR 0232).
  const when = t.details.when(
    formatDayInline(item.start).replace(/ \d{4}$/, ""),
    t.range(clockOf(item.startMinutes), clockOf(item.endMinutes)),
  );
  return (
    <AgendaItemDetails
      item={item}
      when={when}
      describe={describe(item)}
      style={style}
      className={`${classes} ${grid ? "block" : "w-full flex-col items-start"}`}
      removeAction={
        !example && item.kind === "creneau" ? deleteBlockedSlot.bind(null, item.id) : undefined
      }
    >
      {grid ? body : <span className="block min-w-0">{body}</span>}
    </AgendaItemDetails>
  );
}
