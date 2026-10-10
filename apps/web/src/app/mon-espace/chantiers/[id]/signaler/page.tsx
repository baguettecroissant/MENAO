import type { ChantierStatus } from "@menao/core";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ReportProblem } from "@/components/dispute/report-problem";
import { fr } from "@/i18n/fr";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const metadata: Metadata = { title: `${fr.dispute.reportTitle} — MENAO` };

/** « Signaler un problème lié au chantier » côté client (F-42). */
export default async function ClientReportProblemPage({
  params,
}: PageProps<"/mon-espace/chantiers/[id]/signaler">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth || auth.claims.is_anonymous) {
    redirect(`/connexion?next=/mon-espace/chantiers/${id}/signaler` as Route);
  }
  const [{ data: rows }, { data: open }] = await Promise.all([
    supabase.rpc("particulier_chantiers", { p_chantier_id: id }),
    // Signalement déjà ouvert sur ce chantier : on le suit plutôt que d'en créer un autre.
    supabase
      .from("tickets")
      .select("id")
      .eq("chantier_id", id)
      .eq("type", "litige")
      .neq("status", "resolu")
      .maybeSingle(),
  ]);
  const c = rows?.[0];
  if (!c) notFound();
  if (open) redirect(`/signalements/${open.id}` as Route);
  return (
    <ReportProblem
      chantierId={id}
      chantierHref={`/mon-espace/chantiers/${id}`}
      title={c.title}
      status={c.status as ChantierStatus}
    />
  );
}
