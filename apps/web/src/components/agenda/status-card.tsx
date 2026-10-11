"use client";

import {
  availableFromChoices,
  type AvailabilityStatus,
  type AvailableFromChoice,
} from "@menao/core";
import { CalendarClock, CircleCheck, CirclePause, Palmtree, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Alert, Button, Field } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { saveAvailableFrom, savePause } from "@/lib/artisan/agenda-actions";
import { initialFormState } from "@/lib/auth/form";
import { formatDayMonth, formatDayMonthShort } from "@/lib/format";

const t = fr.pro.agenda.availability;

const LOOK: Record<AvailabilityStatus["kind"], { icon: LucideIcon; tone: string }> = {
  disponible: { icon: CircleCheck, tone: "bg-success-soft text-success" },
  a_partir_du: { icon: CalendarClock, tone: "bg-primary-soft text-primary-strong" },
  pause: { icon: CirclePause, tone: "bg-warning-soft text-warning" },
  conges: { icon: Palmtree, tone: "bg-warning-soft text-warning" },
};

function statusText(status: AvailabilityStatus): { title: string; text: string } {
  switch (status.kind) {
    case "pause":
      return t.status.pause;
    case "conges":
      return {
        title: t.status.conges.title(formatDayMonth(status.until)),
        text: t.status.conges.text,
      };
    case "a_partir_du":
      return {
        title: t.status.aPartirDu.title(formatDayMonth(status.date)),
        text: t.status.aPartirDu.text,
      };
    default:
      return t.status.disponible;
  }
}

/**
 * Statut de disponibilité (F-44) : recevoir ou non de nouvelles demandes (pause), et date à partir
 * de laquelle un nouveau chantier peut commencer.
 */
export function StatusCard({
  status,
  paused,
  availableFrom,
  today,
  visible,
}: {
  status: AvailabilityStatus;
  paused: boolean;
  availableFrom: string | null;
  today: string;
  /** Profil visible hors pause (validation, abonnement, paiements). */
  visible: boolean;
}) {
  const { icon: Icon, tone } = LOOK[status.kind];
  const { title, text } = statusText(status);
  const [pauseState, pauseAction, pausing] = useActionState(savePause, initialFormState);

  return (
    <section
      aria-labelledby="statut-titre"
      className="overflow-hidden rounded-card border border-border bg-surface shadow-card"
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className={`flex size-12 shrink-0 items-center justify-center rounded-full ${tone}`}
          >
            <Icon className="size-6" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t.status.title}
            </p>
            <h2 id="statut-titre" className="text-lg font-medium">
              {title}
            </h2>
            <p className="text-sm text-muted-foreground">{text}</p>
          </div>
        </div>
        <form action={pauseAction} className="shrink-0">
          <input type="hidden" name="paused" value={paused ? "non" : "oui"} />
          <Button
            type="submit"
            variant={paused ? "primary" : "secondary"}
            block={false}
            disabled={pausing}
            className="w-full sm:w-auto"
          >
            {paused ? t.status.resumeAction : t.status.pauseAction}
          </Button>
        </form>
      </div>
      {(pauseState.error || pauseState.success || !visible) && (
        <div className="flex flex-col gap-2 px-5 pb-4 sm:px-6">
          {pauseState.error && <Alert tone="error">{pauseState.error}</Alert>}
          {pauseState.success && <Alert tone="success">{pauseState.success}</Alert>}
          {!visible && (
            <Alert tone="info">
              {t.status.visibilityHidden}{" "}
              <Link href="/pro/onboarding" className="font-medium underline underline-offset-2">
                {fr.pro.space.file}
              </Link>
            </Alert>
          )}
        </div>
      )}
      <AvailableFrom availableFrom={availableFrom} today={today} />
    </section>
  );
}

function AvailableFrom({ availableFrom, today }: { availableFrom: string | null; today: string }) {
  const [state, action, pending] = useActionState(saveAvailableFrom, initialFormState);
  const choices = availableFromChoices(today);
  const saved = availableFrom && availableFrom > today ? availableFrom : null;
  const matching = choices.find((c) => c.date === saved)?.key ?? null;
  const [other, setOther] = useState(saved !== null && matching === null);
  const label = (key: AvailableFromChoice, date: string | null) =>
    date ? t.from.choiceLabel(t.from.choices[key], formatDayMonthShort(date)) : t.from.choices[key];

  return (
    <div className="flex flex-col gap-3 border-t border-border bg-primary-softer/40 p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h3 className="font-medium">{t.from.title}</h3>
        <p className="text-sm text-muted-foreground">{t.from.text}</p>
      </div>
      <form action={action} className="flex flex-wrap gap-2">
        {choices.map(({ key, date }) => {
          const current = !other && matching === key;
          return (
            <button
              key={key}
              type="submit"
              name="availableFrom"
              value={date ?? ""}
              aria-pressed={current}
              disabled={pending}
              onClick={() => setOther(false)}
              className="inline-flex min-h-10 items-center rounded-pill border border-border bg-surface px-4 text-sm font-medium transition-colors hover:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground disabled:opacity-70"
            >
              {label(key, date)}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={other}
          aria-expanded={other}
          aria-controls="autre-date"
          onClick={() => setOther((v) => !v)}
          className="inline-flex min-h-10 items-center rounded-pill border border-dashed border-border-strong bg-surface px-4 text-sm font-medium transition-colors hover:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none aria-pressed:border-primary aria-pressed:text-primary-strong"
        >
          {t.from.other}
        </button>
      </form>
      {other && (
        <form
          id="autre-date"
          action={action}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="sm:w-60">
            <Field
              name="availableFrom"
              type="date"
              min={today}
              label={t.from.otherLabel}
              defaultValue={state.values?.availableFrom ?? saved ?? ""}
              errors={state.fieldErrors?.availableFrom}
              className="bg-surface"
            />
          </div>
          <Button type="submit" variant="outline" block={false} disabled={pending}>
            {t.from.save}
          </Button>
        </form>
      )}
      <p role="status" className="text-xs text-muted-foreground">
        {state.error ??
          (state.success ? `${state.success} ` : "") +
            (saved ? t.from.current(formatDayMonth(saved)) : t.from.now)}
      </p>
    </div>
  );
}
