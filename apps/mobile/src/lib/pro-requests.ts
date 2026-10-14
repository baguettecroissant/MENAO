import type { RefusalReason } from "@menao/core";
import type { Database } from "@menao/db";
import { parseRequestDetail, type RequestDetail } from "@menao/validation";
import { fr } from "@/i18n/fr";
import { supabase } from "./supabase";

type InboxRow = Database["public"]["Functions"]["artisan_inbox"]["Returns"][number];
export type InboxItem = InboxRow & { photoUrl: string | null };

/** Photos privées des projets (bucket project-photos), par liens signés d'une heure. */
async function signedPhotos(paths: readonly string[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const { data } = await supabase.storage.from("project-photos").createSignedUrls(unique, 3600);
  return new Map(
    (data ?? []).flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl] as const] : [])),
  );
}

/** Demandes reçues par l'artisan (F-16, F-17), comme sur le site (`artisan_inbox`). */
export async function loadInbox(): Promise<InboxItem[] | null> {
  const { data, error } = await supabase.rpc("artisan_inbox");
  if (error) return null;
  const rows = data ?? [];
  const photos = await signedPhotos(rows.flatMap((r) => (r.photo_path ? [r.photo_path] : [])));
  return rows.map((r) => ({
    ...r,
    photoUrl: r.photo_path ? (photos.get(r.photo_path) ?? null) : null,
  }));
}

export type Opportunity = { detail: RequestDetail; photoUrls: string[] };

/**
 * Opportunité (F-17), comme sur le site : coordonnées et adresse exacte seulement une fois le
 * rendez-vous fixé (décision C, ADR 0014). artisan_request_detail ne renvoie que ses demandes.
 */
export async function loadOpportunity(requestId: string): Promise<Opportunity | null> {
  const { data } = await supabase.rpc("artisan_request_detail", { p_request_id: requestId });
  const detail = parseRequestDetail(data);
  if (!detail) return null;
  const photos = await signedPhotos(detail.photos);
  return {
    detail,
    photoUrls: detail.photos.flatMap((p) => {
      const url = photos.get(p);
      return url ? [url] : [];
    }),
  };
}

/** Erreur SQL : message des règles métier (code 22023), sinon message générique. */
const sqlError = (error: { code?: string; message: string }) =>
  error.code === "22023" ? error.message : fr.errors.generic;

/** F-17 « Refuser le chantier » : motif de la liste, précisé si « Autre ». */
export async function refuseRequest(
  requestId: string,
  reason: RefusalReason,
  detail: string,
): Promise<string | null> {
  const { error } = await supabase.rpc("artisan_respond_request", {
    p_request_id: requestId,
    p_accept: false,
    p_reason: reason,
    p_detail: detail,
  });
  return error ? sqlError(error) : null;
}

/**
 * F-17 « Fixer un rendez-vous » : crée le chantier ; le client voit la date dans son espace et
 * reçoit les coordonnées de l'artisan. Date et heure de Paris (AAAA-MM-JJ, HH:MM).
 */
export async function fixAppointment(
  requestId: string,
  date: string,
  time: string,
): Promise<{ chantierId: string } | { error: string }> {
  const { data, error } = await supabase.rpc("artisan_fix_appointment", {
    p_request_id: requestId,
    p_date: date,
    p_time: time,
  });
  if (error || !data) return { error: error ? sqlError(error) : fr.errors.generic };
  return { chantierId: data };
}

/**
 * « Ce chantier a besoin d'une expertise » (F-17, F-18), comme sur le site : signalement à l'équipe
 * MENAO, avec le corps de métier nécessaire (artisan_report_expertise).
 */
export async function reportExpertise(
  requestId: string,
  trade: string,
  message: string,
): Promise<string | null> {
  const { error } = await supabase.rpc("artisan_report_expertise", {
    p_request_id: requestId,
    p_trade_code: trade,
    p_message: message,
  });
  return error ? sqlError(error) : null;
}
