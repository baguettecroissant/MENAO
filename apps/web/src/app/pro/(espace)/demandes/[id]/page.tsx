import { parisToday, timeLeft } from "@menao/core";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { RequestOpportunityView } from "@/components/pro/request-opportunity";
import { fr } from "@/i18n/fr";
import { appointmentAgenda } from "@/lib/artisan/agenda";
import { getRequestDetail } from "@/lib/artisan/requests";
import { requireProSpace } from "@/lib/artisan/space";

const t = fr.pro.onboarding.requests;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/**
 * Opportunité (F-17), maquette « Vue d'une opportunité » : fixer un rendez-vous ou refuser.
 * Une fois le rendez-vous fixé, la demande s'ouvre sur la vue du chantier (F-18).
 */
export default async function ArtisanRequestPage({ params }: PageProps<"/pro/demandes/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireProSpace();
  const r = await getRequestDetail(supabase, id);
  if (!r) notFound();
  if (r.chantier_id) redirect(`/pro/chantiers/${r.chantier_id}` as Route);

  const left = r.status === "envoyee" ? timeLeft(new Date(r.expires_at), new Date()) : null;
  // En attente de réponse, ou acceptée avant la phase 3 sans rendez-vous (ADR 0016).
  const open = (r.status === "envoyee" && left !== null) || r.status === "acceptee";
  const [{ data: signed }, { data: trades }, agenda, { data: reputation }, { data: partnerRows }] =
    await Promise.all([
      r.photos.length
        ? supabase.storage.from("project-photos").createSignedUrls(r.photos, 3600)
        : Promise.resolve({ data: [] }),
      supabase.from("trades").select("code, label").eq("active", true).order("sort_order"),
      // F-44 : créneaux libres et avertissements du tiroir « Fixer un rendez-vous ».
      open ? appointmentAgenda() : undefined,
      // F-23 : moyenne des notes du client par les artisans, si l'équipe l'a rendue visible.
      supabase.rpc("client_reputation", { p_request_id: r.id }),
      // « Recommander un partenaire » (ADR 0174) : partenaires du réseau de parrainage.
      supabase.rpc("partner_recommendation_options", { p_request_id: r.id }),
    ]);

  return (
    <RequestOpportunityView
      r={r}
      photoUrls={(signed ?? []).flatMap((p) => (p.signedUrl ? [p.signedUrl] : []))}
      left={left}
      open={open}
      minDate={parisToday()}
      trades={trades ?? []}
      agenda={agenda}
      clientReputation={reputation?.[0] ?? null}
      partners={(partnerRows ?? []).map((o) => ({
        projectId: o.project_id,
        trade: o.trade_label,
        sameProject: o.same_project,
        artisanId: o.artisan_id,
        name: o.display_name,
        recommended: o.recommended,
      }))}
    />
  );
}
