import {
  artisanVisibility,
  clientsAwaitingQuote,
  documentsToRenew,
  monthToDateRevenue,
  requestsAwaitingAnswer,
  revenueTrend,
  subscriptionGrantsAccess,
  upcomingAgenda,
  type AgendaKind,
  type ChantierStatus,
  type MonitoredDocumentType,
  type RevenueTrend,
  type SubscriptionStatus,
} from "@menao/core";
import { loadInbox, type InboxItem } from "./pro-requests";
import { countReviewsToAnswer } from "./pro-reviews";
import { supabase } from "./supabase";

export type Dashboard = {
  firstName: string | null;
  suspended: boolean;
  radiated: { reason: string | null } | null;
  urssafMissing: boolean;
  /** Documents arrivant à échéance sans renouvellement déposé (F-51), comme sur le site. */
  documentsToRenew: MonitoredDocumentType[];
  /**
   * Visibilité auprès des particuliers d'un artisan validé (ADR 0124) : ce qui manque, sans
   * jamais parler d'abonnement dans l'application (règles d'Apple, CLAUDE.md règle 10).
   */
  visibility: { visible: boolean; missing: ("abonnement" | "paiements")[] } | null;
  awaitingClients: number;
  revenue: { cents: number; trend: RevenueTrend; previousMonth: string };
  responseTime: { minutes: number | null; responses: number };
  appointments: {
    kind: AgendaKind;
    chantierId: string;
    startsAt: string;
    title: string;
    place: string;
  }[];
  requests: InboxItem[];
  /** Avis publiés sans réponse (F-28), comme le compteur du menu du site. */
  reviewsToAnswer: number;
};

/**
 * Tableau de bord de l'artisan (F-16), comme sur le site : prénom, clients en attente de devis,
 * encaissé ce mois (paiements reçus sur son compte), temps de réponse, rendez-vous à venir,
 * dernières demandes et avis sans réponse. Mêmes règles que le site (`@menao/core`), lectures avec les
 * droits du compte (RLS).
 */
export async function loadDashboard(): Promise<Dashboard | null> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) return null;
  const [
    inbox,
    { data: chantiers },
    { data: payments },
    { data: response },
    profile,
    artisan,
    reviewsToAnswer,
    subscription,
  ] = await Promise.all([
    loadInbox(),
    supabase.rpc("artisan_chantiers"),
    supabase.from("payments").select("amount_cents, paid_at").eq("status", "paye"),
    supabase.rpc("my_response_stats"),
    supabase.from("profiles").select("first_name").eq("user_id", userId).maybeSingle(),
    supabase
      .from("artisans")
      .select(
        "status, radiation_reason, connect_charges_enabled, artisan_documents(type, status, date_fin)",
      )
      .eq("user_id", userId)
      .maybeSingle(),
    countReviewsToAnswer(),
    // Abonnement de l'artisan (lecture limitée à son compte, RLS).
    supabase.from("subscriptions").select("status").maybeSingle(),
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
    // Radiation (ADR 0114) : l'espace reste accessible, le profil n'apparaît plus.
    radiated: artisan.data?.status === "radie" ? { reason: artisan.data.radiation_reason } : null,
    // Attestation URSSAF demandée depuis le 17 octobre 2026 (ADR 0115) : invitation à l'ajouter.
    urssafMissing:
      artisan.data?.status === "valide" &&
      !artisan.data.artisan_documents.some(
        (d) => d.type === "urssaf" && (d.status === "valide" || d.status === "en_attente"),
      ),
    documentsToRenew:
      artisan.data?.status === "valide" || artisan.data?.status === "suspendu"
        ? documentsToRenew(artisan.data.artisan_documents, now)
        : [],
    visibility:
      artisan.data?.status === "valide"
        ? (() => {
            const v = artisanVisibility({
              status: "valide",
              subscriptionActive: subscriptionGrantsAccess(
                (subscription.data?.status as SubscriptionStatus | undefined) ?? null,
              ),
              connectChargesEnabled: artisan.data.connect_charges_enabled,
            });
            return {
              visible: v.visible,
              missing: v.missing.filter((m) => m !== "validation"),
            };
          })()
        : null,
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
      chantierId: row.chantier_id,
      startsAt: at,
      title: row.title,
      place: row.adresse || [row.code_postal, row.ville_nom].filter(Boolean).join(" "),
    })),
    requests: requestsAwaitingAnswer(inbox, now).slice(0, 3),
    reviewsToAnswer,
  };
}
