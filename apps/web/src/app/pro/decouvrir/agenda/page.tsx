import {
  EXAMPLE_HOURS,
  addDays,
  availabilityStatus,
  exampleAgendaItems,
  exampleChantierRows,
  parisLocalToDate,
  parisToday,
  weekStartFrom,
} from "@menao/core";
import type { Metadata } from "next";
import { AgendaScreen } from "@/components/agenda/agenda-screen";
import { fr } from "@/i18n/fr";
import { agendaUpcoming } from "@/lib/artisan/agenda-upcoming";
import { EXAMPLES_BASE, requireExampleViewer } from "@/lib/artisan/examples";

export const metadata: Metadata = { title: `${fr.pro.agenda.title} — MENAO` };

/** Agenda d'exemple (ADR 0184) : visite, démarrage de chantier et créneau bloqué. */
export default async function ExampleAgendaPage({
  searchParams,
}: PageProps<"/pro/decouvrir/agenda">) {
  const { semaine, jour } = await searchParams;
  await requireExampleViewer();
  const now = new Date();
  const today = parisToday(now);
  const monday = weekStartFrom(typeof semaine === "string" ? semaine : null, today);
  return (
    <AgendaScreen
      monday={monday}
      today={today}
      now={now}
      day={typeof jour === "string" ? jour : null}
      upcoming={agendaUpcoming(exampleChantierRows(now), now)}
      availability={availabilityStatus({
        paused: false,
        availableFrom: null,
        absences: [],
        today,
      })}
      hours={[...EXAMPLE_HOURS]}
      items={exampleAgendaItems(
        parisLocalToDate(monday, "00:00"),
        parisLocalToDate(addDays(monday, 7), "00:00"),
        now,
      )}
      absences={[]}
      base={EXAMPLES_BASE}
      example
    />
  );
}
