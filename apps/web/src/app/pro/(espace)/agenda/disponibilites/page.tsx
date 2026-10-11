import type { Metadata } from "next";
import { AvailabilityScreen } from "@/components/agenda/availability-screen";
import { fr } from "@/i18n/fr";
import { artisanHours, calendarFeed } from "@/lib/artisan/agenda";
import { requireProSpace } from "@/lib/artisan/space";
import { SITE_URL } from "@/lib/site/seo";

export const metadata: Metadata = { title: `${fr.pro.agenda.availability.title} — MENAO` };

/**
 * « Mes disponibilités » (F-44) : statut (pause, date de reprise), horaires de travail, congés
 * et absences, abonnement .ics pour Google Agenda, Apple Calendrier ou Outlook.
 */
export default async function AvailabilityPage() {
  const space = await requireProSpace();
  const [hours, feed] = await Promise.all([artisanHours(), calendarFeed()]);
  return (
    <AvailabilityScreen
      availability={space.availability}
      paused={space.paused}
      availableFrom={space.availableFrom}
      today={space.today}
      visible={space.visibility.visible}
      hours={hours}
      absences={space.absences}
      feedUrl={feed ? `${SITE_URL}/calendrier/${feed.token}.ics` : null}
      feedLastReadAt={feed?.last_read_at ?? null}
    />
  );
}
