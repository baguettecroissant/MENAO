import type { ReactNode } from "react";
import type { AvailabilityStatus, HoursRange } from "@menao/core";
import { fr } from "@/i18n/fr";
import type { AgendaAbsence } from "@/lib/artisan/agenda";
import { AbsencesManager } from "./absences-manager";
import { AgendaTabs } from "./agenda-tabs";
import { CalendarSync } from "./calendar-sync";
import { HoursEditor } from "./hours-editor";
import { StatusCard } from "./status-card";

const t = fr.pro.agenda.availability;

/**
 * Écran « Mes disponibilités » (F-44) : statut (pause, date de reprise), horaires de travail,
 * congés et absences, abonnement .ics.
 */
export function AvailabilityScreen({
  availability,
  paused,
  availableFrom,
  today,
  visible,
  hours,
  absences,
  feedUrl,
  feedLastReadAt,
  scoreCard,
}: {
  availability: AvailabilityStatus;
  paused: boolean;
  availableFrom: string | null;
  today: string;
  visible: boolean;
  hours: HoursRange[];
  absences: AgendaAbsence[];
  feedUrl: string | null;
  feedLastReadAt: string | null;
  /** Score MENAO et « Mon planning est à jour » (ADR 0105), rendus par la page. */
  scoreCard?: ReactNode;
}) {
  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex max-w-2xl flex-col gap-1.5">
            <h1 className="text-[2rem] leading-[1.05] sm:text-[2.5rem]">{t.title}</h1>
            <p className="text-[0.9375rem] text-label sm:text-base">{t.intro}</p>
          </div>
          <AgendaTabs current="disponibilites" />
        </div>

        <StatusCard
          status={availability}
          paused={paused}
          availableFrom={availableFrom}
          today={today}
          visible={visible}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start">
          <HoursEditor initial={hours} />
          <div className="flex flex-col gap-5">
            <AbsencesManager absences={absences} today={today} />
            {scoreCard}
            <div id="calendrier" className="scroll-mt-24">
              <CalendarSync url={feedUrl} lastReadAt={feedLastReadAt} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
