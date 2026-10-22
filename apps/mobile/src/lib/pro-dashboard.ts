import {
  artisanTodo,
  artisanVisibility,
  clientsAwaitingQuote,
  isAwaitingQuote,
  laterAppointments,
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
  type TodoItem,
} from "@menao/core";
import { loadInbox, type InboxItem } from "./pro-requests";
import { countReviewsToAnswer } from "./pro-reviews";
import { supabase } from "./supabase";
import { loadWelcomeGift } from "./welcome-gift";

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
  /** « À faire maintenant » (ADR 0130) : ce qui attend une action, du plus urgent au moins urgent. */
  todo: TodoItem[];
  /** Rendez-vous des jours suivants (ceux du jour sont dans « À faire »). */
  later: Dashboard["appointments"];
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
    welcomeGift,
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
    supabase.from("subscriptions").select("status, past_due_since").maybeSingle(),
    // Cadeau de bienvenue du filleul à choisir (ADR 0154).
    loadWelcomeGift(),
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
  const appointments = upcomingAgenda(rows, now, 8).map(({ kind, at, row }) => ({
    kind,
    chantierId: row.chantier_id,
    startsAt: at,
    title: row.title,
    place: row.adresse || [row.code_postal, row.ville_nom].filter(Boolean).join(" "),
  }));
  const awaiting = requestsAwaitingAnswer(inbox, now);
  const status = artisan.data?.status;
  const urssafMissing =
    status === "valide" &&
    !(artisan.data?.artisan_documents ?? []).some(
      (d) => d.type === "urssaf" && (d.status === "valide" || d.status === "en_attente"),
    );
  const renew =
    status === "valide" || status === "suspendu"
      ? documentsToRenew(artisan.data?.artisan_documents ?? [], now)
      : [];
  const visibility =
    status === "valide" && artisan.data
      ? (() => {
          const v = artisanVisibility({
            status: "valide",
            subscriptionActive: subscriptionGrantsAccess(
              (subscription.data?.status as SubscriptionStatus | undefined) ?? null,
              subscription.data?.past_due_since ?? null,
            ),
            connectChargesEnabled: artisan.data.connect_charges_enabled,
          });
          return {
            visible: v.visible,
            missing: v.missing.filter((m) => m !== "validation"),
          };
        })()
      : null;
  const todo = artisanTodo(
    {
      requests: awaiting.map((r) => ({
        id: r.request_id,
        expiresAt: r.expires_at,
        title: r.summary || r.trade_label,
        place: [r.code_postal, r.ville_nom].filter(Boolean).join(" "),
      })),
      appointments: appointments.map((a) => ({ ...a, at: a.startsAt })),
      quotesToSend: rows
        .filter((c) => isAwaitingQuote(c.status))
        .map((c) => ({
          chantierId: c.chantier_id,
          title: c.title,
          place: [c.code_postal, c.ville_nom].filter(Boolean).join(" "),
        })),
      documentsToRenew: renew,
      urssafMissing,
      paymentsMissing: visibility?.missing.includes("paiements") ?? false,
      reviewsToAnswer,
      welcomeGiftToChoose: welcomeGift?.status === "a_choisir",
    },
    now,
  );
  return {
    firstName: profile.data?.first_name ?? null,
    suspended: artisan.data?.status === "suspendu",
    // Radiation (ADR 0114) : l'espace reste accessible, le profil n'apparaît plus.
    radiated: artisan.data?.status === "radie" ? { reason: artisan.data.radiation_reason } : null,
    // Attestation URSSAF demandée depuis le 17 octobre 2026 (ADR 0115) : invitation à l'ajouter.
    urssafMissing,
    documentsToRenew: renew,
    visibility,
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
    appointments: appointments.slice(0, 4),
    requests: awaiting.slice(0, 3),
    reviewsToAnswer,
    todo,
    later: laterAppointments(
      appointments.map((a) => ({ ...a, at: a.startsAt })),
      now,
    ).slice(0, 4),
  };
}
