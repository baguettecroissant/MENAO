"use client";

import {
  MAX_RANGES_PER_DAY,
  SUGGESTED_HOURS,
  WEEKDAYS,
  hoursErrors,
  minutesToTime,
  timeToMinutes,
  type HoursRange,
  type Weekday,
} from "@menao/core";
import { ChevronDown, Clock, Copy, Plus, Trash2 } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { Alert, Button, focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { saveHours } from "@/lib/artisan/agenda-actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.agenda.availability.hours;
// Heures au quart d'heure, toujours au format 24 h (un champ « time » natif suit la langue du
// système et peut afficher AM/PM).
const QUARTERS = Array.from({ length: 96 }, (_, i) => minutesToTime(i * 15));

function TimeSelect({
  value,
  label,
  onChange,
}: {
  value: string;
  label: string;
  onChange: (value: string) => void;
}) {
  const options = QUARTERS.includes(value) ? QUARTERS : [...QUARTERS, value].sort();
  return (
    <div className="relative">
      <select
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        className={`h-10 w-[5.75rem] appearance-none rounded-input border border-border bg-surface pr-7 pl-3 text-[0.9375rem] text-foreground tabular-nums transition-colors hover:border-border-strong ${focusRing}`}
      >
        {options.map((time) => (
          <option key={time} value={time}>
            {time}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}
const days = fr.pro.agenda.weekdays;

type Range = { start: string; end: string };
type Week = Record<Weekday, Range[]>;

const toWeek = (hours: readonly HoursRange[]): Week =>
  Object.fromEntries(
    WEEKDAYS.map((d) => [
      d,
      hours
        .filter((h) => h.weekday === d)
        .sort((a, b) => a.start.localeCompare(b.start))
        .map(({ start, end }) => ({ start, end })),
    ]),
  ) as Week;
const toHours = (week: Week): HoursRange[] =>
  WEEKDAYS.flatMap((weekday) => week[weekday].map((r) => ({ weekday, ...r })));

function workdays(ranges: Range[], withSaturdayMorning = false): HoursRange[] {
  const saturday: HoursRange[] = withSaturdayMorning
    ? [{ weekday: 6, start: "08:00", end: "12:00" }]
    : [];
  return ([1, 2, 3, 4, 5] as const)
    .flatMap((weekday) => ranges.map((r): HoursRange => ({ weekday, ...r })))
    .concat(saturday);
}

/** Journée ouverte d'un clic : 8 h – 12 h et 13 h 30 – 17 h 30. */
const DEFAULT_DAY: Range[] = [
  { start: "08:00", end: "12:00" },
  { start: "13:30", end: "17:30" },
];

/** Modèles d'horaires courants dans le bâtiment. */
const PRESETS = {
  semaine: SUGGESTED_HOURS,
  samedi: workdays(DEFAULT_DAY, true),
  continue: workdays([{ start: "07:30", end: "16:00" }]),
  vide: [],
} satisfies Record<keyof typeof t.presets, readonly HoursRange[]>;

/**
 * Horaires de travail de la semaine (F-44) : jusqu'à trois plages par jour, modèles courants,
 * recopie du lundi. Enregistrés en une fois ; contrôles de @menao/core avant l'envoi.
 */
export function HoursEditor({ initial }: { initial: HoursRange[] }) {
  const [week, setWeek] = useState<Week>(() => toWeek(initial));
  const [saved, setSaved] = useState(() => JSON.stringify(toHours(toWeek(initial))));
  const [state, action, pending] = useActionState(
    async (prev: typeof initialFormState, formData: FormData) => {
      const result = await saveHours(prev, formData);
      if (result.success) setSaved(String(formData.get("hours")));
      return result;
    },
    initialFormState,
  );
  const hours = useMemo(() => toHours(week), [week]);
  const json = JSON.stringify(hours);
  const dirty = json !== saved;
  const issue = hoursErrors(hours);
  const total = hours.reduce((sum, h) => sum + timeToMinutes(h.end) - timeToMinutes(h.start), 0);

  const update = (weekday: Weekday, ranges: Range[]) =>
    setWeek((current) => ({ ...current, [weekday]: ranges }));
  const setRange = (weekday: Weekday, index: number, patch: Partial<Range>) =>
    update(
      weekday,
      week[weekday].map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  const addRange = (weekday: Weekday) => {
    const ranges = week[weekday];
    const last = ranges[ranges.length - 1];
    // Nouvelle plage après la dernière : une heure plus tard, pour deux heures.
    const startMinutes = last ? Math.min(timeToMinutes(last.end) + 60, 21 * 60) : 8 * 60;
    update(weekday, [
      ...ranges,
      {
        start: minutesToTime(startMinutes),
        end: minutesToTime(Math.min(startMinutes + 120, 23 * 60 + 45)),
      },
    ]);
  };
  const copyMonday = () =>
    setWeek((current) => ({
      ...current,
      ...Object.fromEntries(
        ([2, 3, 4, 5] as const).map((d) => [d, current[1].map((r) => ({ ...r }))]),
      ),
    }));

  return (
    <section
      id="horaires"
      aria-labelledby="horaires-titre"
      className="scroll-mt-24 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id="horaires-titre" className="flex items-center gap-2 text-[1.0625rem] font-medium">
          <Clock aria-hidden="true" className="size-[1.125rem] text-primary" />
          {t.title}
        </h2>
        <p className="text-sm text-muted-foreground">{t.text}</p>
      </div>

      <div role="group" aria-label={t.presetsLabel} className="mt-4 flex flex-wrap gap-2">
        {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setWeek(toWeek(PRESETS[key]))}
            className="inline-flex min-h-9 items-center rounded-pill border border-border bg-background px-3.5 text-sm hover:border-primary/50 hover:bg-primary-softer focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
          >
            {t.presets[key]}
          </button>
        ))}
      </div>

      <ul className="mt-5 flex flex-col divide-y divide-border">
        {WEEKDAYS.map((weekday, i) => {
          const day = days[i] ?? "";
          const ranges = week[weekday];
          const open = ranges.length > 0;
          const dayIssue = open ? hoursErrors(ranges.map((r) => ({ weekday, ...r }))) : null;
          return (
            <li key={weekday} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start">
              <div className="flex items-center justify-between gap-3 sm:w-44 sm:shrink-0 sm:pt-1.5">
                <span className="font-medium">{day}</span>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    role="switch"
                    checked={open}
                    aria-label={t.open(day.toLowerCase())}
                    onChange={(e) => update(weekday, e.target.checked ? DEFAULT_DAY : [])}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className="relative h-6 w-10 rounded-full bg-border-strong transition-colors peer-checked:bg-primary peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4"
                  />
                  <span className="w-12">{open ? t.openShort : t.closed}</span>
                </label>
              </div>
              {open && (
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
                  {ranges.map((range, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <TimeSelect
                        value={range.start}
                        label={t.from(day.toLowerCase(), index + 1)}
                        onChange={(start) => setRange(weekday, index, { start })}
                      />
                      <span aria-hidden="true" className="text-muted-foreground">
                        –
                      </span>
                      <TimeSelect
                        value={range.end}
                        label={t.to(day.toLowerCase(), index + 1)}
                        onChange={(end) => setRange(weekday, index, { end })}
                      />
                      <button
                        type="button"
                        aria-label={t.removeRange(day.toLowerCase(), index + 1)}
                        onClick={() =>
                          update(
                            weekday,
                            ranges.filter((_, j) => j !== index),
                          )
                        }
                        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-danger-soft hover:text-danger focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </button>
                    </div>
                  ))}
                  {ranges.length < MAX_RANGES_PER_DAY && (
                    <button
                      type="button"
                      aria-label={t.addRangeTo(day.toLowerCase())}
                      onClick={() => addRange(weekday)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-pill px-2 text-sm font-medium text-primary-strong hover:bg-primary-softer focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
                    >
                      <Plus aria-hidden="true" className="size-4" />
                      {t.addRange}
                    </button>
                  )}
                  {dayIssue && (
                    <p className="w-full text-xs text-danger" role="alert">
                      {t.errors[dayIssue]}
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={copyMonday}
        disabled={week[1].length === 0}
        aria-label={t.copyMonday}
        className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-pill px-2 text-sm font-medium text-primary-strong hover:bg-primary-softer focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:text-subtle-foreground disabled:hover:bg-transparent"
      >
        <Copy aria-hidden="true" className="size-4" />
        {t.copyMondayShort}
      </button>

      <form
        action={action}
        className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <input type="hidden" name="hours" value={json} />
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {total > 0 ? t.total(Math.floor(total / 60), total % 60) : t.none}
          {dirty && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-chip bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">
              {t.unsaved}
            </span>
          )}
        </p>
        <Button type="submit" block={false} disabled={pending || issue !== null || !dirty}>
          {t.save}
        </Button>
      </form>
      {state.error && (
        <div className="mt-3">
          <Alert tone="error">{state.error}</Alert>
        </div>
      )}
      {state.success && !dirty && (
        <div className="mt-3">
          <Alert tone="success">{state.success}</Alert>
        </div>
      )}
    </section>
  );
}
