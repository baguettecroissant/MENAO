import {
  artisanTodo,
  clientsAwaitingQuote,
  isAwaitingQuote,
  laterAppointments,
  levelProgress,
  monthToDateRevenue,
  requestsAwaitingAnswer,
  revenueTrend,
  upcomingAgenda,
  type ChantierStatus,
} from "@menao/core";
import { parseGrade } from "@menao/validation";
import type { Metadata } from "next";
import { DashboardView } from "@/components/pro/dashboard-view";
import { fr } from "@/i18n/fr";
import { artisanActivity, getProShell, requireProSpace } from "@/lib/artisan/space";
import { formatMonthName } from "@/lib/format";

export const metadata: Metadata = { title: `${fr.pro.dashboard.title} — MENAO` };

/**
 * Tableau de bord artisan (F-16) : indicateurs, « À faire maintenant » (ADR 0131, comme
 * l'application) et rendez-vous des jours suivants.
 */
export default async function DashboardPage() {
  const {
    supabase,
    firstName,
    avatarUrl,
    visibility,
    status,
    suspensionReason,
    radiationReason,
    documentsToRenew,
    urssafMissing,
  } = await requireProSpace();
  const onboarding = fr.pro.onboarding;
  const notices = [
    ...(status === "radie" ? [onboarding.status.radie(radiationReason)] : []),
    ...(status === "suspendu"
      ? [
          suspensionReason === "documents_expires"
            ? onboarding.status.suspenduDocuments
            : onboarding.status.suspendu,
        ]
      : []),
  ];
  // Mêmes lectures que les compteurs du menu (mises en cache pour la requête).
  const [
    { chantiers, inbox },
    { data: payments },
    { data: response },
    { data: gradeData },
    { badges },
  ] = await Promise.all([
    artisanActivity(),
    // Paiements reçus (RLS : ceux des chantiers de l'artisan), pour « Encaissé ce mois ».
    supabase.from("payments").select("amount_cents, paid_at").eq("status", "paye"),
    // Temps de réponse moyen (F-10), sur les 6 derniers mois.
    supabase.rpc("my_response_stats"),
    // F-24 : carte « Mon grade MENAO ».
    supabase.rpc("artisan_grade"),
    // Compteurs du menu (mis en cache) : avis sans réponse.
    getProShell(),
  ]);
  const grade = parseGrade(gradeData);
  const gradeLevels =
    grade?.levels.map((l) => ({
      level: l.level,
      xpMin: l.xp_min,
      reward: l.reward,
      rewardDetail: l.reward_detail,
    })) ?? [];
  const gradeProgress = grade ? levelProgress(gradeLevels, grade.xp) : null;
  const lastBadge = grade?.badges
    .filter((b) => b.unlocked_at)
    .sort((a, b) => (b.unlocked_at ?? "").localeCompare(a.unlocked_at ?? ""))[0];
  const now = new Date();
  const revenue = monthToDateRevenue(
    (payments ?? []).map((p) => ({ amountCents: p.amount_cents, paidAt: p.paid_at })),
    now,
  );
  const rows = chantiers.map((c) => ({
    ...c,
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
  const todo = artisanTodo(
    {
      requests: requestsAwaitingAnswer(inbox, now).map((r) => ({
        id: r.request_id,
        expiresAt: r.expires_at,
        title: r.summary || r.trade_label,
        place: [r.code_postal, r.ville_nom].filter(Boolean).join(" "),
      })),
      appointments: appointments.map((a) => ({ ...a, at: a.startsAt })),
      quotesToSend: rows
        .filter((c) => isAwaitingQuote(c.status as ChantierStatus))
        .map((c) => ({
          chantierId: c.chantier_id,
          title: c.title,
          place: [c.code_postal, c.ville_nom].filter(Boolean).join(" "),
        })),
      documentsToRenew,
      urssafMissing: urssafMissing && status !== "radie",
      paymentsMissing: visibility.missing.includes("paiements"),
      reviewsToAnswer: badges.reviews,
    },
    now,
  );

  return (
    <DashboardView
      grade={
        grade && gradeProgress
          ? {
              level: grade.level,
              xp: grade.xp,
              nextXp: gradeProgress.next?.xpMin ?? null,
              progress: gradeProgress.progress,
              badge: lastBadge?.code ?? null,
              newBadge: grade.badges.some((b) => b.unlocked_at && !b.seen),
            }
          : null
      }
      firstName={firstName}
      missingPhoto={!avatarUrl}
      notices={notices}
      visible={visibility.visible}
      awaitingClients={clientsAwaitingQuote(rows)}
      revenue={{
        cents: revenue.currentCents,
        trend: revenueTrend(revenue.currentCents, revenue.previousCents),
        previousMonth: formatMonthName(revenue.previousMonth),
      }}
      responseTime={{
        minutes: response?.[0]?.minutes ?? null,
        responses: response?.[0]?.responses ?? 0,
      }}
      appointments={laterAppointments(
        appointments.map((a) => ({ ...a, at: a.startsAt })),
        now,
      ).slice(0, 4)}
      todo={todo}
    />
  );
}
