import { parisToday, type ChantierStatus } from "@menao/core";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChantierAppointmentView } from "@/components/pro/chantier-appointment";
import { fr } from "@/i18n/fr";
import { appointmentAgenda } from "@/lib/artisan/agenda";
import { getChantierDetail } from "@/lib/artisan/chantiers";
import { requireProSpace } from "@/lib/artisan/space";
import { ArtisanFollowUp } from "./follow-up";

const t = fr.pro.appointment;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** Après l'acompte, la fiche devient la vue du chantier (F-22, maquette « Vue d'un chantier »). */
const FOLLOW_UP: readonly ChantierStatus[] = [
  "acompte_paye",
  "planifie",
  "en_cours",
  "travaux_termines",
  "reserves_a_lever",
  "receptionne",
  "cloture",
  "en_litige",
];

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/**
 * Vue d'un rendez-vous (F-18), maquette « Vue d'un rendez-vous », jusqu'à l'acompte ; ensuite vue
 * du chantier (F-22).
 */
export default async function ChantierPage({
  params,
  searchParams,
}: PageProps<"/pro/chantiers/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireProSpace();
  const c = await getChantierDetail(supabase, id);
  if (!c) notFound();
  if (FOLLOW_UP.includes(c.chantier.status)) {
    const { onglet, demarrage } = await searchParams;
    return (
      <ArtisanFollowUp
        supabase={supabase}
        c={c}
        tab={onglet === "dossier" ? "dossier" : "suivi"}
        startConfirmed={demarrage === "confirme"}
      />
    );
  }

  const [{ data: signed }, { data: trades }, { data: draft }, { data: sentQuote }] =
    await Promise.all([
      c.photos.length
        ? supabase.storage.from("project-photos").createSignedUrls(c.photos, 3600)
        : Promise.resolve({ data: [] }),
      supabase.from("trades").select("code, label").eq("active", true).order("sort_order"),
      supabase
        .from("quotes")
        .select("id")
        .eq("chantier_id", id)
        .eq("status", "brouillon")
        .maybeSingle(),
      // F-21 : dernière version envoyée (réponse du client, PDF).
      supabase
        .from("quotes")
        .select(
          "id, status, numero, total_ttc_cents, sent_at, valid_until, refusal_reason, client_message, signed_at",
        )
        .eq("chantier_id", id)
        .neq("status", "brouillon")
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
  // F-31, F-35 : acompte du devis signé et sa facture.
  const [{ data: deposit }, { data: invoice }] =
    sentQuote?.status === "signe"
      ? await Promise.all([
          supabase
            .from("payments")
            .select("status, amount_cents, paid_at")
            .eq("quote_id", sentQuote.id)
            .eq("kind", "acompte")
            .in("status", ["en_attente", "en_cours", "paye"])
            .maybeSingle(),
          supabase
            .from("invoices")
            .select("id, numero")
            .eq("quote_id", sentQuote.id)
            .eq("kind", "acompte")
            .maybeSingle(),
        ])
      : [{ data: null }, { data: null }];
  const planned = c.chantier.status === "rdv_planifie" && c.appointment?.status === "planifie";
  // F-44 : créneaux libres et avertissements du tiroir « Modifier le rendez-vous ».
  const agenda = planned
    ? await appointmentAgenda({ excludeChantierId: c.chantier.id })
    : undefined;

  return (
    <ChantierAppointmentView
      c={c}
      photoUrls={(signed ?? []).flatMap((p) => (p.signedUrl ? [p.signedUrl] : []))}
      trades={trades ?? []}
      hasDraft={draft !== null}
      sentQuote={sentQuote}
      deposit={deposit}
      invoice={invoice}
      minDate={parisToday()}
      agenda={agenda}
    />
  );
}
