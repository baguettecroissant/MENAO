import "server-only";
import { z } from "zod";
import { signedUrlMap } from "@/lib/chantier/storage";
import type { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE } from "./follow-up";

type Client = Awaited<ReturnType<typeof createClient>>;

/** Files de la boîte de réception (F-56, ADR 0049), calculées par la base (staff_tickets). */
export const TICKET_FILTERS = [
  "a_traiter",
  "en_retard",
  "mes_tickets",
  "litiges",
  "signalements",
  "messages",
  "suppressions",
  "clos",
  "tous",
] as const;
export type TicketFilter = (typeof TICKET_FILTERS)[number];

export function parseTicketFilter(value: unknown): TicketFilter {
  return typeof value === "string" && (TICKET_FILTERS as readonly string[]).includes(value)
    ? (value as TicketFilter)
    : "a_traiter";
}

const counts = z.record(z.string(), z.number().int().nonnegative());

export async function listTickets(
  supabase: Client,
  { filter, query, page }: { filter: TicketFilter; query: string | null; page: number },
) {
  const { data } = await supabase.rpc("staff_tickets", {
    p_filter: filter,
    p_query: query ?? undefined,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  const rows = data ?? [];
  return { rows, total: rows[0]?.total ?? 0 };
}

export async function ticketCounts(supabase: Client, query: string | null) {
  const { data } = await supabase.rpc("staff_ticket_counts", { p_query: query ?? undefined });
  const parsed = counts.safeParse(data);
  return parsed.success ? parsed.data : {};
}

const fullName = (p: { first_name: string | null; last_name: string | null } | undefined) =>
  [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim() || null;

/** Ticket complet : objet lié, fil avec le déclarant (photos signées), notes internes. */
export async function getTicketDetail(supabase: Client, id: string) {
  const { data: ticket } = await supabase
    .from("tickets")
    .select(
      "id, type, status, subject, message, contact_email, user_id, project_id, chantier_id, category, due_at, resolved_at, handled_by, created_at, projects(description, ville_nom, trades(label)), reviews(id, artisan_id, author_name, score, comment, status, moderation_reason), messages(id, kind, body, hidden_at, moderation_reason), chantiers(id, title, status), ticket_messages(id, from_staff, body, storage_path, created_at)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!ticket) return null;
  const { data: notes } = await supabase
    .from("ticket_notes")
    .select("id, body, author_id, created_at")
    .eq("ticket_id", id)
    .order("created_at");
  const people = [
    ticket.user_id,
    ticket.handled_by,
    ...(notes ?? []).map((n) => n.author_id),
  ].filter((v): v is string => Boolean(v));
  const [{ data: profiles }, photos] = await Promise.all([
    people.length
      ? supabase.from("profiles").select("user_id, first_name, last_name").in("user_id", people)
      : Promise.resolve({
          data: [] as { user_id: string; first_name: string | null; last_name: string | null }[],
        }),
    signedUrlMap(
      supabase,
      "ticket-photos",
      ticket.ticket_messages.map((m) => m.storage_path),
    ),
  ]);
  const nameOf = (userId: string | null) =>
    userId ? fullName(profiles?.find((p) => p.user_id === userId)) : null;
  return {
    ticket,
    declarant: nameOf(ticket.user_id),
    handler: nameOf(ticket.handled_by),
    notes: (notes ?? []).map((n) => ({ ...n, author: nameOf(n.author_id) })),
    thread: [...ticket.ticket_messages]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((m) => ({
        id: m.id,
        fromStaff: m.from_staff,
        body: m.body,
        photoUrl: m.storage_path ? (photos.get(m.storage_path) ?? null) : null,
        createdAt: m.created_at,
      })),
  };
}
