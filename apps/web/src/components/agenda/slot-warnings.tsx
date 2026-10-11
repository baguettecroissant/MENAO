"use client";

import {
  APPOINTMENT_DURATION_MINUTES,
  isValidDate,
  parisLocalToDate,
  slotConflicts,
  slotWarnings,
} from "@menao/core";
import { TriangleAlert } from "lucide-react";
import { useMemo } from "react";
import { fr } from "@/i18n/fr";
import type { AppointmentAgenda } from "@/lib/artisan/agenda";
import { formatTime } from "@/lib/format";

const t = fr.pro.appointment.warnings;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Avertissements (non bloquants) sous les champs date et heure d'un rendez-vous ou d'un démarrage
 * (F-44) : absence, hors horaires, ou autre élément de l'agenda au même moment.
 */
export function SlotWarnings({
  date,
  time,
  agenda,
}: {
  date: string;
  time: string;
  agenda: AppointmentAgenda;
}) {
  const warnings = useMemo(() => {
    if (!isValidDate(date) || !TIME.test(time)) return [];
    const start = parisLocalToDate(date, time);
    const duration = APPOINTMENT_DURATION_MINUTES;
    return slotWarnings({ start, durationMinutes: duration, ...agenda }).map((kind) => {
      if (kind !== "conflit") return t[kind];
      const what = slotConflicts(start, duration, agenda.busy)
        .map((b) =>
          [fr.pro.agenda.kinds[b.kind], b.title, formatTime(b.start)].filter(Boolean).join(" · "),
        )
        .join(", ");
      return t.conflit(what);
    });
  }, [agenda, date, time]);

  return (
    <div aria-live="polite">
      {warnings.length > 0 && (
        <ul className="flex flex-col gap-1.5 rounded-input bg-warning-soft px-3.5 py-2.5 text-sm text-warning">
          {warnings.map((w) => (
            <li key={w} className="flex items-start gap-2">
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
