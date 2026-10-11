import { addDays, parisLocalToDate, weekStartFrom } from "@menao/core";
import type { Metadata } from "next";
import { AgendaScreen } from "@/components/agenda/agenda-screen";
import { fr } from "@/i18n/fr";
import { absencesBetween, agendaItems, artisanHours } from "@/lib/artisan/agenda";
import { requireProSpace } from "@/lib/artisan/space";

export const metadata: Metadata = { title: `${fr.pro.agenda.title} — MENAO` };

/**
 * Agenda de l'artisan (F-44) : visites, démarrages de chantier, créneaux bloqués et absences de
 * la semaine, sur ses horaires de travail. Semaine choisie par ?semaine=AAAA-MM-JJ.
 */
export default async function AgendaPage({ searchParams }: PageProps<"/pro/agenda">) {
  const { semaine } = await searchParams;
  const space = await requireProSpace();
  const monday = weekStartFrom(typeof semaine === "string" ? semaine : null, space.today);
  const [hours, items, absences] = await Promise.all([
    artisanHours(),
    agendaItems(parisLocalToDate(monday, "00:00"), parisLocalToDate(addDays(monday, 7), "00:00")),
    absencesBetween(monday, addDays(monday, 6)),
  ]);
  return (
    <AgendaScreen
      monday={monday}
      today={space.today}
      now={new Date()}
      availability={space.availability}
      hours={hours}
      items={items}
      absences={absences}
    />
  );
}
