import {
  cancelReport,
  journalSummary,
  paymentProgress,
  type ArtisanCancelReason,
  type JournalSummary,
} from "@menao/core";
import type { Database } from "@menao/db";
import { parseArtisanChantierDetail, type ArtisanChantierDetail } from "@menao/validation";
import { fr } from "@/i18n/fr";
import type { ChantierDocument } from "./chantiers";
import { REVIEW_COLUMNS, toArtisanReview, type ArtisanReview } from "./pro-reviews";
import { supabase } from "./supabase";

/** Liens signés (1 h) des fichiers d'un espace privé, par chemin ; les droits RLS s'appliquent. */
async function signedUrls(bucket: string, paths: readonly string[]) {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return new Map<string, string>();
  const { data } = await supabase.storage.from(bucket).createSignedUrls(unique, 3600);
  return new Map(
    (data ?? []).flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl] as const] : [])),
  );
}

type Tables = Database["public"]["Tables"];
export type ArtisanChantierRow =
  Database["public"]["Functions"]["artisan_chantiers"]["Returns"][number];

/** Chantiers de l'artisan (F-18), comme sur le site (`artisan_chantiers`). */
export async function loadArtisanChantiers(): Promise<ArtisanChantierRow[] | null> {
  const { data, error } = await supabase.rpc("artisan_chantiers");
  return error ? null : (data ?? []);
}

export type SentQuote = Pick<
  Tables["quotes"]["Row"],
  | "id"
  | "status"
  | "numero"
  | "total_ttc_cents"
  | "sent_at"
  | "valid_until"
  | "refusal_reason"
  | "client_message"
  | "signed_at"
>;
export type DepositPayment = Pick<Tables["payments"]["Row"], "status" | "amount_cents" | "paid_at">;

export type ArtisanChantier = {
  detail: ArtisanChantierDetail;
  photoUrls: string[];
  /** Dernière version envoyée du devis (F-21), puis son acompte et sa facture (F-31, F-35). */
  sentQuote: SentQuote | null;
  deposit: DepositPayment | null;
  depositInvoice: { id: string; numero: string } | null;
  /** Brouillon de devis en cours (F-19). */
  hasDraft: boolean;
};

/**
 * Vue d'un rendez-vous ou d'un chantier de l'artisan (F-18), comme sur le site : demande d'origine,
 * rendez-vous et notes privées, dernier devis envoyé et acompte. artisan_chantier_detail ne
 * renvoie que ses chantiers.
 */
export async function loadArtisanChantier(chantierId: string): Promise<ArtisanChantier | null> {
  const [{ data }, { data: sentQuote }, { data: draft }] = await Promise.all([
    supabase.rpc("artisan_chantier_detail", { p_chantier_id: chantierId }),
    supabase
      .from("quotes")
      .select(
        "id, status, numero, total_ttc_cents, sent_at, valid_until, refusal_reason, client_message, signed_at",
      )
      .eq("chantier_id", chantierId)
      .neq("status", "brouillon")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("quotes")
      .select("id")
      .eq("chantier_id", chantierId)
      .eq("status", "brouillon")
      .maybeSingle(),
  ]);
  const detail = parseArtisanChantierDetail(data);
  if (!detail) return null;
  const [{ data: signed }, { data: deposit }, { data: invoice }] = await Promise.all([
    detail.photos.length
      ? supabase.storage.from("project-photos").createSignedUrls(detail.photos, 3600)
      : Promise.resolve({ data: [] }),
    sentQuote?.status === "signe"
      ? supabase
          .from("payments")
          .select("status, amount_cents, paid_at")
          .eq("quote_id", sentQuote.id)
          .eq("kind", "acompte")
          .in("status", ["en_attente", "en_cours", "paye"])
          .maybeSingle()
      : Promise.resolve({ data: null }),
    sentQuote?.status === "signe"
      ? supabase
          .from("invoices")
          .select("id, numero")
          .eq("quote_id", sentQuote.id)
          .eq("kind", "acompte")
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return {
    detail,
    photoUrls: (signed ?? []).flatMap((p) => (p.signedUrl ? [p.signedUrl] : [])),
    sentQuote: sentQuote ?? null,
    deposit: deposit ?? null,
    depositInvoice: invoice ?? null,
    hasDraft: draft !== null,
  };
}

/** Erreur de la base affichable telle quelle (règle métier, droit refusé), sinon générique. */
const rpcError = (error: { code?: string; message: string }) =>
  error.code === "22023" || error.code === "42501" ? error.message : fr.errors.generic;

/** F-18 « Modifier le rendez-vous » : nouvelle date et heure d'arrivée (heure de Paris). */
export async function rescheduleAppointment(
  chantierId: string,
  date: string,
  time: string,
): Promise<string | null> {
  const { error } = await supabase.rpc("artisan_reschedule_appointment", {
    p_chantier_id: chantierId,
    p_date: date,
    p_time: time,
  });
  return error ? rpcError(error) : null;
}

/** F-18 « Ajouter des notes » : notes privées de l'artisan. */
export async function saveAppointmentNotes(
  chantierId: string,
  notes: string,
): Promise<string | null> {
  const { error } = await supabase.rpc("artisan_save_appointment_notes", {
    p_chantier_id: chantierId,
    p_notes: notes,
  });
  return error ? rpcError(error) : null;
}

/** F-18 « Annuler le chantier » : la demande est annulée, le particulier retrouve une place. */
export async function cancelArtisanChantier(
  chantierId: string,
  cause: ArtisanCancelReason,
  reason: string,
): Promise<string | null> {
  // Signalement (ADR 0145) : pour l'équipe seulement ; il annule la prime d'un partenaire en attente.
  const report = cancelReport(cause);
  const { error } = await supabase.rpc("artisan_cancel_chantier", {
    p_chantier_id: chantierId,
    p_reason: reason,
    ...(report ? { p_report: report } : {}),
  });
  return error ? rpcError(error) : null;
}

export type ArtisanFollowUp = {
  coverUrl: string | null;
  depositPaid: boolean;
  journal: JournalSummary;
  photoUrls: string[];
  documents: ChantierDocument[];
  /** Devis signé : total TTC et échéancier recalculé (règle 5), date de début prévue au devis. */
  quote: { totalTtcCents: number; startDate: string | null } | null;
  progress: { paidCents: number; remainingCents: number } | null;
  finishedAt: string | null;
  receivedAt: string | null;
  balancePaidAt: string | null;
  balanceCents: number | null;
  reception: { reserves: string | null; liftSignaledAt: string | null } | null;
  /** Avis du client sur ce chantier (F-28), publié ou masqué par l'équipe. */
  review: ArtisanReview | null;
  openTicketId: string | null;
  /** Note de l'artisan sur son client, après la clôture (F-23). */
  clientRating: Pick<
    Tables["client_ratings"]["Row"],
    "welcome" | "clarity" | "payment" | "created_at"
  > | null;
  /** Moyenne des notes visible des artisans qui reçoivent une demande du client (paramètre). */
  ratingsVisible: boolean;
};

/**
 * Suivi du chantier côté artisan après l'acompte (F-22), comme sur le site : journal, documents,
 * échéancier, étapes de fin de chantier (fin déclarée, réception, réserves, solde), avis du
 * client et note de l'artisan sur son client (F-23).
 */
export async function loadArtisanFollowUp(
  chantierId: string,
  projectPhotos: readonly string[],
): Promise<ArtisanFollowUp> {
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
    { data: clientRating },
    { data: ratingsVisible },
  ] = await Promise.all([
    supabase
      .from("quotes")
      .select("id, status, numero, sent_at, signed_at, created_at, total_ttc_cents, start_date")
      .eq("chantier_id", chantierId)
      .neq("status", "brouillon")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("payments")
      .select("quote_id, kind, status, amount_cents, paid_at")
      .eq("chantier_id", chantierId),
    supabase
      .from("invoices")
      .select("id, numero, kind, issued_on")
      .eq("chantier_id", chantierId)
      .order("issued_on"),
    supabase
      .from("chantier_updates")
      .select("id, kind, message, storage_path, created_at")
      .eq("chantier_id", chantierId),
    supabase
      .from("chantier_events")
      .select("created_at")
      .eq("chantier_id", chantierId)
      .eq("event", "fin_declaree")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("receptions")
      .select("id, numero, status, reserves, signed_at, lift_signaled_at")
      .eq("chantier_id", chantierId)
      .maybeSingle(),
    supabase
      .from("chantier_events")
      .select("created_at")
      .eq("chantier_id", chantierId)
      .eq("to_status", "receptionne")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("reviews").select(REVIEW_COLUMNS).eq("chantier_id", chantierId).maybeSingle(),
    supabase
      .from("tickets")
      .select("id")
      .eq("chantier_id", chantierId)
      .eq("type", "litige")
      .neq("status", "resolu")
      .maybeSingle(),
    supabase
      .from("client_ratings")
      .select("welcome, clarity, payment, created_at")
      .eq("chantier_id", chantierId)
      .maybeSingle(),
    supabase.rpc("client_ratings_visible"),
  ]);
  const journal = journalSummary(
    (updates ?? []).map((u) => ({
      id: u.id,
      kind: u.kind,
      message: u.message,
      storagePath: u.storage_path,
      createdAt: u.created_at,
    })),
  );
  const [journalPhotos, cover] = await Promise.all([
    signedUrls("chantier-photos", journal.photos),
    signedUrls("project-photos", projectPhotos.slice(0, 1)),
  ]);
  const signed = quote?.status === "signe" ? quote : null;
  const progress = signed
    ? paymentProgress(
        signed.total_ttc_cents,
        (payments ?? [])
          .filter((p) => p.quote_id === signed.id)
          .map((p) => ({ status: p.status, amountCents: p.amount_cents })),
      )
    : null;
  const balance = (payments ?? []).find((p) => p.kind === "solde" && p.status === "paye") ?? null;
  return {
    coverUrl: projectPhotos[0] ? (cover.get(projectPhotos[0]) ?? null) : null,
    depositPaid: (payments ?? []).some((p) => p.kind === "acompte" && p.status === "paye"),
    journal,
    photoUrls: journal.photos.flatMap((p) => {
      const url = journalPhotos.get(p);
      return url ? [url] : [];
    }),
    documents: [
      ...(quote?.numero
        ? [
            {
              kind: "devis" as const,
              numero: quote.numero,
              date: quote.signed_at ?? quote.sent_at ?? quote.created_at,
              id: quote.id,
              signed: quote.status === "signe",
            },
          ]
        : []),
      ...(invoices ?? []).map((i) => ({
        kind: (i.kind === "solde" ? "solde" : "acompte") as "acompte" | "solde",
        numero: i.numero,
        date: i.issued_on,
        id: i.id,
        signed: false,
      })),
      ...(reception?.status === "signe" && reception.signed_at
        ? [
            {
              kind: "pv" as const,
              numero: reception.numero,
              date: reception.signed_at,
              id: reception.id,
              signed: true,
            },
          ]
        : []),
    ],
    quote: signed ? { totalTtcCents: signed.total_ttc_cents, startDate: signed.start_date } : null,
    progress,
    finishedAt: finished?.created_at ?? null,
    receivedAt: received?.created_at ?? null,
    balancePaidAt: balance?.paid_at ?? null,
    balanceCents: balance?.amount_cents ?? null,
    reception: reception
      ? { reserves: reception.reserves, liftSignaledAt: reception.lift_signaled_at }
      : null,
    review: review ? toArtisanReview(review) : null,
    openTicketId: openTicket?.id ?? null,
    clientRating: clientRating ?? null,
    ratingsVisible: ratingsVisible === true,
  };
}

/** F-22 « Confirmer la date de démarrage » (ou la modifier tant que les travaux n'ont pas commencé). */
export async function confirmChantierStart(
  chantierId: string,
  date: string,
  time: string,
): Promise<string | null> {
  const { error } = await supabase.rpc("artisan_confirm_start", {
    p_chantier_id: chantierId,
    p_date: date,
    p_time: time,
  });
  return error ? rpcError(error) : null;
}

/** F-22 « Ajouter un message » au journal du chantier, visible par le client. */
export async function addChantierMessage(
  chantierId: string,
  message: string,
): Promise<string | null> {
  const { error } = await supabase.rpc("artisan_add_chantier_message", {
    p_chantier_id: chantierId,
    p_message: message,
  });
  return error ? rpcError(error) : null;
}

/** F-22 « Déclarer le chantier terminé » : le client est invité à réceptionner les travaux. */
export async function declareChantierFinished(chantierId: string): Promise<string | null> {
  const { error } = await supabase.rpc("artisan_declare_finished", { p_chantier_id: chantierId });
  return error ? rpcError(error) : null;
}

/** F-26 « Signaler la levée des réserves » : le client est invité à confirmer la levée. */
export async function signalReservesLifted(
  chantierId: string,
  message: string,
): Promise<string | null> {
  const { error } = await supabase.rpc("artisan_signal_reserves_lifted", {
    p_chantier_id: chantierId,
    p_message: message,
  });
  return error ? rpcError(error) : null;
}
