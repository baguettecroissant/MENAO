import {
  clientsAwaitingQuote,
  collectedThisMonth,
  requestsAwaitingAnswer,
  upcomingAgenda,
} from "@menao/core";
import type { Metadata } from "next";
import { DashboardView } from "@/components/pro/dashboard-view";
import { fr } from "@/i18n/fr";
import { artisanActivity, requireProSpace } from "@/lib/artisan/space";

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
  const [{ chantiers, inbox }, { data: payments }] = await Promise.all([
    artisanActivity(),
    // Paiements reçus (RLS : ceux des chantiers de l'artisan), pour « Encaissé ce mois ».
    supabase.from("payments").select("amount_cents, paid_at").eq("status", "paye"),
  ]);
  const now = new Date();
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
      firstName={firstName}
      notices={notices}
      visible={visibility.visible}
      awaitingClients={clientsAwaitingQuote(rows)}
      revenueCents={collectedThisMonth(
        (payments ?? []).map((p) => ({ amountCents: p.amount_cents, paidAt: p.paid_at })),
        now,
      )}
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
