import {
  APPOINTMENT_DURATION_MINUTES,
  buildCalendar,
  type IcsAllDayEvent,
  type IcsEvent,
} from "@menao/core";
import { fr } from "@/i18n/fr";
import { SITE_URL } from "@/lib/site/seo";
import { createPublicClient } from "@/lib/supabase/public";

const TOKEN = /^[0-9a-f]{48}$/;

/**
 * Abonnement .ics de l'artisan (F-44), lu sans session par Google Agenda, Apple Calendrier ou
 * Outlook : le jeton secret du lien désigne l'agenda. Lien inconnu ou renouvelé : 404.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ jeton: string }> }) {
  const token = (await params).jeton.replace(/\.ics$/, "");
  if (!TOKEN.test(token)) return new Response(null, { status: 404 });
  const { data, error } = await createPublicClient().rpc("artisan_calendar_events", {
    p_token: token,
  });
  if (error) return new Response(null, { status: error.code === "PT404" ? 404 : 503 });

  const stamp = new Date();
  const chantierLink = (id: string) => fr.agenda.feedDescription(`${SITE_URL}/pro/chantiers/${id}`);
  const events = data.flatMap((e): (IcsEvent | IcsAllDayEvent)[] => {
    switch (e.kind) {
      case "visite":
      case "demarrage":
        return [
          {
            uid: `${e.kind}-${e.item_id}`,
            start: new Date(e.starts_at),
            durationMinutes: APPOINTMENT_DURATION_MINUTES,
            summary:
              e.kind === "visite"
                ? fr.agenda.visitSummary(e.title)
                : fr.agenda.startSummary(e.title),
            location: e.place,
            description: chantierLink(e.chantier_id),
            stamp,
          },
        ];
      case "creneau":
        return [
          {
            uid: `creneau-${e.item_id}`,
            start: new Date(e.starts_at),
            durationMinutes: Math.round(
              (new Date(e.ends_at).getTime() - new Date(e.starts_at).getTime()) / 60_000,
            ),
            summary: fr.agenda.blockedSummary(e.title),
            stamp,
          },
        ];
      case "absence":
        return [
          {
            uid: `absence-${e.item_id}`,
            startDate: e.starts_on,
            endDate: e.ends_on,
            summary: fr.agenda.absenceSummary(e.title),
            stamp,
          },
        ];
      default:
        return [];
    }
  });

  return new Response(buildCalendar(fr.agenda.feedName, events), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="agenda-menao.ics"',
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex",
    },
  });
}
