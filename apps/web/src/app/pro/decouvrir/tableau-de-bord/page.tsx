import {
  EXAMPLE_IDS,
  activityCurrentMonth,
  activityYear,
  activityYears,
  artisanTodo,
  clientsAwaitingQuote,
  dashboardActivity,
  exampleActivityInput,
  exampleChantier,
  exampleChantierRows,
  exampleInbox,
  examplePayments,
  laterAppointments,
  monthToDateRevenue,
  requestsAwaitingAnswer,
  revenueTrend,
  upcomingAgenda,
} from "@menao/core";
import type { Metadata } from "next";
import { DashboardView } from "@/components/pro/dashboard-view";
import { fr } from "@/i18n/fr";
import { EXAMPLES_BASE, requireExampleViewer } from "@/lib/artisan/examples";
import { formatMonthName } from "@/lib/format";

export const metadata: Metadata = { title: `${fr.pro.dashboard.title} — MENAO` };

/** Temps de réponse affiché dans les exemples. */
const EXAMPLE_RESPONSE = { minutes: 38, responses: 6 };

/**
 * Tableau de bord d'exemple (ADR 0184) : mêmes calculs que pour un vrai artisan (« À faire
 * maintenant », rendez-vous, encaissé du mois), appliqués aux demandes et chantiers d'exemple.
 */
export default async function ExampleDashboardPage({
  searchParams,
}: PageProps<"/pro/decouvrir/tableau-de-bord">) {
  const { annee } = await searchParams;
  const { firstName } = await requireExampleViewer();
  const now = new Date();
  const activityInput = exampleActivityInput(now);
  const years = activityYears(activityInput.payments, now);
  const year = activityYear(typeof annee === "string" ? annee : null, years);
  const rows = exampleChantierRows(now).map((c) => ({
    ...c,
    appointmentAt: c.appointment_at,
    startAt: c.start_at,
    particulierId: c.particulier_id,
  }));
  const appointments = upcomingAgenda(rows, now, 8).map(({ kind, at, row }) => ({
    kind,
    chantierId: row.chantier_id,
    startsAt: at,
    title: row.title,
    place: [row.code_postal, row.ville_nom].filter(Boolean).join(" "),
  }));
  const todo = artisanTodo(
    {
      requests: requestsAwaitingAnswer(exampleInbox(now), now).map((r) => ({
        id: r.request_id,
        expiresAt: r.expires_at,
        title: r.summary || r.trade_label,
        place: [r.code_postal, r.ville_nom].filter(Boolean).join(" "),
      })),
      appointments: appointments.map((a) => ({ ...a, at: a.startsAt })),
      // L'éditeur de devis n'a pas d'exemple : pas de « Devis à envoyer ».
      quotesToSend: [],
      documentsToRenew: [],
      urssafMissing: false,
      paymentsMissing: false,
      reviewsToAnswer: 0,
      welcomeGiftToChoose: false,
    },
    now,
  );
  const revenue = monthToDateRevenue(examplePayments(now), now);

  return (
    <DashboardView
      firstName={firstName}
      visible
      awaitingClients={clientsAwaitingQuote(rows)}
      revenue={{
        cents: revenue.currentCents,
        trend: revenueTrend(revenue.currentCents, revenue.previousCents),
        previousMonth: formatMonthName(revenue.previousMonth),
      }}
      responseTime={EXAMPLE_RESPONSE}
      appointments={laterAppointments(
        appointments.map((a) => ({ ...a, at: a.startsAt })),
        now,
      ).slice(0, 4)}
      todo={todo}
      base={EXAMPLES_BASE}
      agendaHref={null}
      activity={{
        data: dashboardActivity(activityInput, year, now),
        years,
        yearHref: (y) => `${EXAMPLES_BASE}/tableau-de-bord?annee=${y}`,
        currentMonth: activityCurrentMonth(year, now),
        chantierHref: (id) =>
          exampleChantier(id, now) ? `${EXAMPLES_BASE}/chantiers/${id}` : null,
        shortcuts: {
          quote: `${EXAMPLES_BASE}/chantiers/${EXAMPLE_IDS.chantierChauffeEau}/devis`,
          block: `${EXAMPLES_BASE}/agenda`,
          share: `${EXAMPLES_BASE}/profil`,
          invite: `${EXAMPLES_BASE}/mon-profil`,
        },
      }}
    />
  );
}
