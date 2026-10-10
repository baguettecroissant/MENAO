import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ReportProblem } from "@/components/dispute/report-problem";
import { fr } from "@/i18n/fr";
import { getChantierDetail } from "@/lib/artisan/chantiers";
import { requireProSpace } from "@/lib/artisan/space";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const metadata: Metadata = { title: `${fr.dispute.reportTitle} — MENAO` };

/** « Signaler un problème lié au chantier » côté artisan (F-42). */
export default async function ProReportProblemPage({
  params,
}: PageProps<"/pro/chantiers/[id]/signaler">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireProSpace();
  const [c, { data: open }] = await Promise.all([
    getChantierDetail(supabase, id),
    supabase
      .from("tickets")
      .select("id")
      .eq("chantier_id", id)
      .eq("type", "litige")
      .neq("status", "resolu")
      .maybeSingle(),
  ]);
  if (!c) notFound();
  if (open) redirect(`/signalements/${open.id}` as Route);
  return (
    <ReportProblem
      chantierId={id}
      chantierHref={`/pro/chantiers/${id}`}
      title={c.chantier.title}
      status={c.chantier.status}
    />
  );
}
