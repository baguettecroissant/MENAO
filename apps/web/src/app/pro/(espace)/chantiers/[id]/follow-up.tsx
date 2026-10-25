import { journalSummary, parisToday } from "@menao/core";
import { ArtisanFollowUpView, type FollowUpData } from "@/components/pro/chantier-follow-up";
import { appointmentAgenda } from "@/lib/artisan/agenda";
import type { ChantierDetail } from "@/lib/artisan/chantiers";
import { signedUrlMap } from "@/lib/chantier/storage";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/** Données du suivi d'un chantier (F-22) : devis, paiements, journal, réception, avis… */
async function loadFollowUp(supabase: Client, c: ChantierDetail): Promise<FollowUpData> {
  const id = c.chantier.id;
  const status = c.chantier.status;
  const [
    { data: quote },
    { data: payments },
    { data: invoices },
    { data: updates },
    { data: finished },
    { data: reception },
    { data: received },
    { data: review },
    { data: openTicket },
    { data: conversations },
    { data: clientRating },
    { data: ratingsVisible },
  ] = await Promise.all([
    supabase
      .from("quotes")
      .select("id, status, numero, sent_at, signed_at, total_ttc_cents, start_date")
      .eq("chantier_id", id)
      .neq("status", "brouillon")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("payments")
      .select("quote_id, kind, status, amount_cents, paid_at")
      .eq("chantier_id", id),
    supabase
      .from("invoices")
      .select("id, numero, kind, issued_on")
      .eq("chantier_id", id)
      .order("issued_on"),
    supabase
      .from("chantier_updates")
      .select("id, kind, message, storage_path, created_at")
      .eq("chantier_id", id),
    supabase
      .from("chantier_events")
      .select("created_at")
      .eq("chantier_id", id)
      .eq("event", "fin_declaree")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // F-25, F-26 : PV de réception et date de réception.
    supabase
      .from("receptions")
      .select("id, numero, status, reserves, signed_at, lift_signaled_at")
      .eq("chantier_id", id)
      .maybeSingle(),
    supabase
      .from("chantier_events")
      .select("created_at")
      .eq("chantier_id", id)
      .eq("to_status", "receptionne")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // F-28 : avis du client sur ce chantier.
    supabase
      .from("reviews")
      .select(
        "id, score, quality, delays, communication, cleanliness, value_for_money, comment, status, moderation_reason, reply",
      )
      .eq("chantier_id", id)
      .maybeSingle(),
    // F-42 : signalement de l'artisan en cours sur ce chantier.
    supabase
      .from("tickets")
      .select("id")
      .eq("chantier_id", id)
      .eq("type", "litige")
      .neq("status", "resolu")
      .maybeSingle(),
    // F-40 : dernier échange, pour la carte « Messagerie avec … ».
    supabase.rpc("my_conversations"),
    // F-23 : note de l'artisan sur son client (après la clôture).
    supabase
      .from("client_ratings")
      .select("welcome, clarity, payment, created_at")
      .eq("chantier_id", id)
      .maybeSingle(),
    supabase.rpc("client_ratings_visible"),
  ]);
  const journalPaths = journalSummary(
    (updates ?? []).map((u) => ({
      id: u.id,
      kind: u.kind,
      message: u.message,
      storagePath: u.storage_path,
      createdAt: u.created_at,
    })),
  ).photos;
  const [journalPhotoUrls, projectPhotoUrls, agenda] = await Promise.all([
    signedUrlMap(supabase, "chantier-photos", journalPaths),
    signedUrlMap(supabase, "project-photos", c.photos),
    // F-44 : avertissements de la date de démarrage (absence, hors horaires, conflit).
    status === "acompte_paye" || status === "planifie"
      ? appointmentAgenda({ excludeChantierId: id, withSuggestions: false })
      : undefined,
  ]);
  return {
    quote,
    payments: payments ?? [],
    invoices: invoices ?? [],
    updates: updates ?? [],
    finishedAt: finished?.created_at ?? null,
    reception,
    receivedAt: received?.created_at ?? null,
    review,
    openTicketId: openTicket?.id ?? null,
    conversation: (conversations ?? []).find((row) => row.chantier_id === id) ?? null,
    clientRating,
    ratingsVisible: ratingsVisible === true,
    journalPhotoUrls,
    projectPhotoUrls,
    agenda,
  };
}

/**
 * Vue d'un chantier côté artisan après l'acompte (F-22) : données lues en base, affichage par
 * ArtisanFollowUpView (le même que pour les exemples, ADR 0184).
 */
export async function ArtisanFollowUp({
  supabase,
  c,
  tab,
  startConfirmed,
}: {
  supabase: Client;
  c: ChantierDetail;
  tab: "suivi" | "dossier";
  startConfirmed: boolean;
}) {
  const data = await loadFollowUp(supabase, c);
  return (
    <ArtisanFollowUpView
      c={c}
      data={data}
      tab={tab}
      startConfirmed={startConfirmed}
      today={parisToday()}
      now={new Date()}
    />
  );
}
