import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { HoursEditor } from "@/components/agenda/hours-editor";
import { Card, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import type { ReceptionSettings, ReceptionState } from "@/lib/admin/reception";
import { saveReceptionHours } from "@/lib/admin/reception-actions";
import { formatClock, formatDateNumeric, formatDayTimeInline, formatTime } from "@/lib/format";
import { ReceptionClosuresForm } from "./reception-closures-form";

const t = fr.admin.tickets.reception;

/**
 * Horaires d'accueil de l'équipe (F-81, ADR 0230) : état du moment, plages de la semaine (même
 * éditeur que l'agenda des artisans) et fermetures. Modifiables par un admin dans les Réglages
 * (ADR 0284) ; ailleurs (boîte de réception), lisibles, avec le lien vers les Réglages pour un
 * admin.
 */
export function ReceptionCard({
  settings,
  state,
  canEdit,
  title = t.title,
  editHref,
  footer,
}: {
  settings: ReceptionSettings;
  state: ReceptionState;
  canEdit: boolean;
  title?: string;
  /** Lecture seule : lien « Modifier dans Réglages » à la place de la phrase pour le support. */
  editHref?: string;
  footer?: ReactNode;
}) {
  const status = state.open
    ? state.closesAt
      ? t.openNow(formatTime(state.closesAt))
      : t.openNow("")
    : state.nextOpening
      ? t.closedNow(formatDayTimeInline(state.nextOpening))
      : t.closedUnknown;
  return (
    <Card id="accueil" className="flex scroll-mt-24 flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-medium">{title}</h2>
          <StatusBadge tone={state.open ? "success" : "neutral"}>{status}</StatusBadge>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">{t.intro}</p>
      </div>
      {canEdit ? (
        <>
          <HoursEditor
            initial={settings.hours}
            action={saveReceptionHours}
            texts={{ title: t.hoursTitle, text: t.hoursText, save: t.hoursSave, none: t.hoursNone }}
          />
          <div className="flex flex-col gap-3 border-t border-border pt-5">
            <h3 className="font-medium">{t.closuresTitle}</h3>
            <ReceptionClosuresForm
              closedDates={settings.closedDates}
              holidaysClosed={settings.holidaysClosed}
            />
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2 text-sm">
          <ul className="flex flex-col gap-1">
            {t.summaryDays.map((day, index) => {
              const ranges = settings.hours.filter((h) => h.weekday === index + 1);
              return (
                <li key={day}>
                  <span className="inline-block w-24 capitalize">{day}</span>
                  {ranges.length
                    ? ranges
                        .map((r) => `${formatClock(r.start)} – ${formatClock(r.end)}`)
                        .join(", ")
                    : fr.pro.agenda.availability.hours.closed}
                </li>
              );
            })}
          </ul>
          {settings.closedDates.length > 0 && (
            <p className="text-muted-foreground">
              {t.closures} :{" "}
              {settings.closedDates.map((d) => formatDateNumeric(`${d}T12:00:00Z`)).join(", ")}
            </p>
          )}
          {editHref ? (
            <Link
              href={editHref as Route}
              className="self-start font-semibold text-primary-strong underline-offset-2 hover:underline"
            >
              {fr.admin.settingsPage.edit} →
            </Link>
          ) : (
            <p className="text-muted-foreground">{t.readOnly}</p>
          )}
        </div>
      )}
      {footer}
    </Card>
  );
}
