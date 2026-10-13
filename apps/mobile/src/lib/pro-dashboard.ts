import {
  clientsAwaitingQuote,
  monthToDateRevenue,
  requestsAwaitingAnswer,
  revenueTrend,
  upcomingAgenda,
  type AgendaKind,
  type ChantierStatus,
  type RevenueTrend,
} from "@menao/core";
import { loadInbox, type InboxItem } from "./pro-requests";
import { supabase } from "./supabase";

export type Dashboard = {
  firstName: string | null;
  suspended: boolean;
  awaitingClients: number;
  revenue: { cents: number; trend: RevenueTrend; previousMonth: string };
  responseTime: { minutes: number | null; responses: number };
  appointments: {
    kind: AgendaKind;
    requestId: string;
    startsAt: string;
    title: string;
    place: string;
  }[];
  requests: InboxItem[];
};

/**
 * Tableau de bord de l'artisan (F-16), comme sur le site : clients en attente de devis, encaissé
 * ce mois (paiements reçus sur son compte), temps de réponse, rendez-vous à venir et dernières
 * demandes. Mêmes règles que le site (`@menao/core`), lectures avec les droits du compte (RLS).
 */
export async function loadDashboard(): Promise<Dashboard | null> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) return null;
  const [inbox, { data: chantiers }, { data: payments }, { data: response }, profile, artisan] =
    await Promise.all([
      loadInbox(),
      supabase.rpc("artisan_chantiers"),
      supabase.from("payments").select("amount_cents, paid_at").eq("status", "paye"),
      supabase.rpc("my_response_stats"),
      supabase.from("profiles").select("first_name").eq("user_id", userId).maybeSingle(),
      supabase.from("artisans").select("status").eq("user_id", userId).maybeSingle(),
    ]);
  if (inbox === null) return null;
  const now = new Date();
  const revenue = monthToDateRevenue(
    (payments ?? []).map((p) => ({ amountCents: p.amount_cents, paidAt: p.paid_at })),
    now,
  );
  const rows = (chantiers ?? []).map((c) => ({
    ...c,
    status: c.status as ChantierStatus,
    appointmentAt: c.appointment_at as string | null,
    startAt: c.start_at as string | null,
    particulierId: c.particulier_id,
  }));
  return {
    firstName: profile.data?.first_name ?? null,
    suspended: artisan.data?.status === "suspendu",
    awaitingClients: clientsAwaitingQuote(rows),
    revenue: {
      cents: revenue.currentCents,
      trend: revenueTrend(revenue.currentCents, revenue.previousCents),
      previousMonth: revenue.previousMonth,
    },
    responseTime: {
      minutes: response?.[0]?.minutes ?? null,
      responses: response?.[0]?.responses ?? 0,
    },
    appointments: upcomingAgenda(rows, now).map(({ kind, at, row }) => ({
      kind,
      requestId: row.request_id,
      startsAt: at,
      title: row.title,
      place: row.adresse || [row.code_postal, row.ville_nom].filter(Boolean).join(" "),
    })),
    requests: requestsAwaitingAnswer(inbox, now).slice(0, 3),
  };
}
