import type { DisputeCategory } from "@menao/core";
import type { Database } from "@menao/db";
import { fr } from "@/i18n/fr";
import { supabase } from "./supabase";

type TicketStatus = Database["public"]["Tables"]["tickets"]["Row"]["status"];

/** Erreur de la base affichable telle quelle (règle métier, droit refusé), sinon générique. */
const rpcError = (error: { code?: string; message: string }) =>
  error.code === "22023" || error.code === "42501" ? error.message : fr.errors.generic;

/** Signalement encore ouvert sur ce chantier : on le suit plutôt que d'en créer un autre. */
export async function openDispute(chantierId: string): Promise<string | null> {
  const { data } = await supabase
    .from("tickets")
    .select("id")
    .eq("chantier_id", chantierId)
    .eq("type", "litige")
    .neq("status", "resolu")
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * F-42 « Signaler un problème lié au chantier » : ticket pour l'équipe ; un chantier actif passe
 * en litige (report_chantier_problem). Renvoie le signalement créé, ou un message d'erreur.
 */
export async function reportProblem(
  chantierId: string,
  category: DisputeCategory,
  description: string,
): Promise<{ ticketId: string } | { error: string }> {
  const { data, error } = await supabase.rpc("report_chantier_problem", {
    p_chantier_id: chantierId,
    p_category: category,
    p_description: description,
  });
  if (error || !data) return { error: error ? rpcError(error) : fr.errors.generic };
  return { ticketId: data };
}

export type TicketEntry = {
  id: string;
  fromStaff: boolean;
  body: string | null;
  /** URL signée (1 h) de la photo jointe. */
  photoUrl: string | null;
  createdAt: string;
};

export type Ticket = {
  status: TicketStatus;
  category: DisputeCategory | null;
  message: string | null;
  createdAt: string;
  chantier: { id: string; title: string };
  entries: TicketEntry[];
};

/**
 * Suivi d'un signalement par son déclarant (F-42), comme sur le site : description, échanges avec
 * l'équipe MENAO, photos. Les tickets d'autrui ne sont pas lisibles (RLS).
 */
export async function loadTicket(ticketId: string): Promise<Ticket | null> {
  const [{ data: ticket }, { data: rows }] = await Promise.all([
    supabase
      .from("tickets")
      .select("id, type, status, category, message, created_at, chantiers(id, title)")
      .eq("id", ticketId)
      .maybeSingle(),
    supabase
      .from("ticket_messages")
      .select("id, from_staff, body, storage_path, created_at")
      .eq("ticket_id", ticketId)
      .order("created_at"),
  ]);
  if (!ticket || ticket.type !== "litige" || !ticket.chantiers) return null;
  const paths = [...new Set((rows ?? []).flatMap((r) => (r.storage_path ? [r.storage_path] : [])))];
  const { data: signed } = paths.length
    ? await supabase.storage.from("ticket-photos").createSignedUrls(paths, 3600)
    : { data: [] };
  const urls = new Map(
    (signed ?? []).flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl] as const] : [])),
  );
  return {
    status: ticket.status,
    category: ticket.category,
    message: ticket.message,
    createdAt: ticket.created_at,
    chantier: { id: ticket.chantiers.id, title: ticket.chantiers.title },
    entries: (rows ?? []).map((r) => ({
      id: r.id,
      fromStaff: r.from_staff,
      body: r.body,
      photoUrl: r.storage_path ? (urls.get(r.storage_path) ?? null) : null,
      createdAt: r.created_at,
    })),
  };
}

/** F-42 : message du déclarant à l'équipe MENAO dans son signalement (add_ticket_message). */
export async function addTicketMessage(ticketId: string, body: string): Promise<string | null> {
  const { error } = await supabase.rpc("add_ticket_message", {
    p_ticket_id: ticketId,
    p_body: body,
  });
  return error ? rpcError(error) : null;
}
