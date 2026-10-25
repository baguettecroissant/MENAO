import type { RefusalReason } from "@menao/core";
import type { Database } from "@menao/db";
import { parseRequestDetail, type RequestDetail } from "@menao/validation";
import { fr } from "@/i18n/fr";
import { loadClientReputation, type ClientReputation } from "./client-ratings";
import { formatLongDate } from "./dates";
import { supabase } from "./supabase";
import { isExampleId } from "@menao/core";
import { exampleInboxItems, exampleOpportunity } from "./example-data";
import { examplesActive } from "./examples";

type InboxRow = Database["public"]["Functions"]["artisan_inbox"]["Returns"][number];
export type InboxItem = InboxRow & { photoUrl: string | null };

/** Début souhaité d'une demande : date, « dès que possible » ou inconnu. */
export function requestStart(r: Pick<InboxRow, "date_mode" | "date_souhaitee">): string {
  const t = fr.proRequests;
  if (r.date_mode === "date" && r.date_souhaitee) {
    return t.startWish(formatLongDate(r.date_souhaitee));
  }
  return r.date_mode === "des_que_possible" ? t.startAsap : t.startUnknown;
}

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
  if (examplesActive()) return exampleInboxItems();
  const { data, error } = await supabase.rpc("artisan_inbox");
  if (error) return null;
  const rows = data ?? [];
  const photos = await signedPhotos(rows.flatMap((r) => (r.photo_path ? [r.photo_path] : [])));
  return rows.map((r) => ({
    ...r,
    photoUrl: r.photo_path ? (photos.get(r.photo_path) ?? null) : null,
  }));
}

/** Partenaire du réseau de parrainage à recommander au client (ADR 0174). */
export type PartnerOption = {
  projectId: string;
  trade: string;
  sameProject: boolean;
  artisanId: string;
  name: string;
  recommended: boolean;
};

export type Opportunity = {
  detail: RequestDetail;
  photoUrls: string[];
  /** F-23 : moyenne des notes du client par les artisans, si l'équipe l'a rendue visible. */
  reputation: ClientReputation | null;
  /** « Recommander un partenaire » (ADR 0174), comme sur le site. */
  partners: PartnerOption[];
};

/**
 * Opportunité (F-17), comme sur le site : coordonnées et adresse exacte seulement une fois le
 * rendez-vous fixé (décision C, ADR 0014). artisan_request_detail ne renvoie que ses demandes.
 */
export async function loadOpportunity(requestId: string): Promise<Opportunity | null> {
  if (isExampleId(requestId)) return exampleOpportunity(requestId);
  const { data } = await supabase.rpc("artisan_request_detail", { p_request_id: requestId });
  const detail = parseRequestDetail(data);
  if (!detail) return null;
  const [photos, reputation, { data: partnerRows }] = await Promise.all([
    signedPhotos(detail.photos),
    loadClientReputation(requestId),
    supabase.rpc("partner_recommendation_options", { p_request_id: requestId }),
  ]);
  return {
    detail,
    photoUrls: detail.photos.flatMap((p) => {
      const url = photos.get(p);
      return url ? [url] : [];
    }),
    reputation,
    partners: (partnerRows ?? []).map((o) => ({
      projectId: o.project_id,
      trade: o.trade_label,
      sameProject: o.same_project,
      artisanId: o.artisan_id,
      name: o.display_name,
      recommended: o.recommended,
    })),
  };
}

/** Erreur SQL : message des règles métier (code 22023), sinon message générique. */
const sqlError = (error: { code?: string; message: string }) =>
  error.code === "22023" ? error.message : fr.errors.generic;

/**
 * « Recommander un partenaire » (ADR 0174), comme sur le site : règles vérifiées en base, le
 * client est prévenu. Renvoie le message d'erreur à afficher, ou null.
 */
export async function recommendPartner(
  requestId: string,
  projectId: string,
  partnerId: string,
): Promise<string | null> {
  const { error } = await supabase.rpc("recommend_partner", {
    p_request_id: requestId,
    p_project_id: projectId,
    p_partner_id: partnerId,
  });
  return error ? sqlError(error) : null;
}

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

/** « Je pense que ce n'est pas un vrai particulier » (ADR 0157), comme sur le site : ticket pour l'équipe. */
export async function reportFakeClient(requestId: string, detail: string): Promise<string | null> {
  const { error } = await supabase.rpc("artisan_report_fake_client", {
    p_request_id: requestId,
    p_detail: detail.trim().slice(0, 1000),
  });
  return error ? sqlError(error) : null;
}
