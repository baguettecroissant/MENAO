import {
  clientsAwaitingQuote,
  levelProgress,
  monthToDateRevenue,
  requestsAwaitingAnswer,
  revenueTrend,
  upcomingAgenda,
} from "@menao/core";
import { parseGrade } from "@menao/validation";
import type { Metadata } from "next";
import { DashboardView } from "@/components/pro/dashboard-view";
import { fr } from "@/i18n/fr";
import { artisanActivity, requireProSpace } from "@/lib/artisan/space";
import { formatMonthName } from "@/lib/format";

const t = fr.pro.onboarding.requests;
const dayShort = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeZone: "UTC" });

export const metadata: Metadata = { title: `${fr.pro.dashboard.title} — MENAO` };

/** Tableau de bord artisan (F-16) : chantiers et demandes de l'artisan connecté. */
export default async function DashboardPage() {
  const { supabase, firstName, visibility, status, suspensionReason, documentsToRenew } =
    await requireProSpace();
  const onboarding = fr.pro.onboarding;
  const notices = [
    ...(status === "suspendu"
      ? [
          suspensionReason === "documents_expires"
            ? onboarding.status.suspenduDocuments
            : onboarding.status.suspendu,
        ]
      : []),
    ...(documentsToRenew.length
      ? [
          onboarding.documents.expiringBanner(
            documentsToRenew.map((type) => onboarding.documents.types[type]).join(", "),
          ),
        ]
      : []),
  ];
  // Mêmes lectures que les compteurs du menu (mises en cache pour la requête).
  const [{ chantiers, inbox }, { data: payments }, { data: response }, { data: gradeData }] =
    await Promise.all([
      artisanActivity(),
      // Paiements reçus (RLS : ceux des chantiers de l'artisan), pour « Encaissé ce mois ».
      supabase.from("payments").select("amount_cents, paid_at").eq("status", "paye"),
      // Temps de réponse moyen (F-10), sur les 6 derniers mois.
      supabase.rpc("my_response_stats"),
      // F-24 : carte « Mon grade MENAO ».
      supabase.rpc("artisan_grade"),
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
  const latest = requestsAwaitingAnswer(inbox, now).slice(0, 3);
  const paths = latest.map((r) => r.photo_path).filter((p): p is string => Boolean(p));
  const { data: signed } = paths.length
    ? await supabase.storage.from("project-photos").createSignedUrls(paths, 3600)
    : { data: [] };

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
      appointments={upcomingAgenda(rows, now).map(({ kind, at, row }) => ({
        kind,
        chantierId: row.chantier_id,
        startsAt: at,
        title: row.title,
        place: row.adresse || [row.code_postal, row.ville_nom].filter(Boolean).join(" "),
      }))}
      requests={latest.map((r) => ({
        requestId: r.request_id,
        title: r.summary || r.trade_label,
        place: [r.code_postal, r.ville_nom].filter(Boolean).join(" "),
        start:
          r.date_mode === "date" && r.date_souhaitee
            ? t.startWish(dayShort.format(new Date(`${r.date_souhaitee}T00:00:00Z`)))
            : r.date_mode === "des_que_possible"
              ? t.startAsap
              : t.startUnknown,
        urgent: r.urgence,
        thumbUrl: r.photo_path
          ? (signed?.find((s) => s.path === r.photo_path)?.signedUrl ?? null)
          : null,
      }))}
    />
  );
}
