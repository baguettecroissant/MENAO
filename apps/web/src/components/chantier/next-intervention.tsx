import { APPOINTMENT_DURATION_MINUTES, googleCalendarUrl, outlookCalendarUrl } from "@menao/core";
import { CalendarDays } from "lucide-react";
import type { ReactNode } from "react";
import { fr } from "@/i18n/fr";
import type { NextInterventionData } from "@/lib/chantier/view";
import { formatDayShort, formatTime } from "@/lib/format";
import { AddToCalendar } from "./add-to-calendar";

const t = fr.chantier.next;

/** « Prochaine intervention » (maquettes) : rendez-vous ou démarrage, à ajouter à son agenda. */
export function NextIntervention({
  chantierId,
  next,
  title,
  location,
  artisanName,
  clientName,
  centered = false,
  children,
}: {
  chantierId: string;
  next: NextInterventionData;
  title: string;
  location: string | null;
  artisanName: string | null;
  clientName: string | null;
  /** Contenu centré (carte de « Mes chantiers », maquette bureau). */
  centered?: boolean;
  /** Action supplémentaire (artisan : modifier la date de démarrage). */
  children?: ReactNode;
}) {
  const event = {
    start: new Date(next.startsAt),
    durationMinutes: APPOINTMENT_DURATION_MINUTES,
    summary: next.kind === "demarrage" ? fr.agenda.startSummary(title) : fr.agenda.summary(title),
    location,
    description: fr.agenda.description(artisanName, clientName),
  };
  const day = formatDayShort(next.startsAt);
  const time = formatTime(next.startsAt);
  return (
    <section
      aria-label={t.title}
      className={`flex flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-card sm:p-5 ${centered ? "items-stretch text-center" : ""}`}
    >
      <p className={`flex items-center gap-2 text-sm ${centered ? "justify-center" : ""}`}>
        <CalendarDays aria-hidden="true" className="size-4 text-primary" />
        {t.title}
      </p>
      <p className="font-medium text-primary-strong">
        {next.kind === "demarrage" ? t.startOn(day, time) : t.appointmentOn(day, time)}
      </p>
      <AddToCalendar
        google={googleCalendarUrl(event)}
        outlook={outlookCalendarUrl(event)}
        ics={`/agenda/${chantierId}`}
      />
      {children}
    </section>
  );
}
