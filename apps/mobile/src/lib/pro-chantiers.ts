import type { Database } from "@menao/db";
import { parseArtisanChantierDetail, type ArtisanChantierDetail } from "@menao/validation";
import { fr } from "@/i18n/fr";
import { supabase } from "./supabase";

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
};

/**
 * Vue d'un rendez-vous ou d'un chantier de l'artisan (F-18), comme sur le site : demande d'origine,
 * rendez-vous et notes privées, dernier devis envoyé et acompte. artisan_chantier_detail ne
 * renvoie que ses chantiers.
 */
export async function loadArtisanChantier(chantierId: string): Promise<ArtisanChantier | null> {
  const [{ data }, { data: sentQuote }] = await Promise.all([
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
  reason: string,
): Promise<string | null> {
  const { error } = await supabase.rpc("artisan_cancel_chantier", {
    p_chantier_id: chantierId,
    p_reason: reason,
  });
  return error ? rpcError(error) : null;
}
