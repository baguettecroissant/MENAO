import "server-only";
import { statusesOfStage, type ChantierStage, type ProjectFilter } from "@menao/core";
import { z } from "zod";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/** Taille d'une page des listes du back-office (F-53, ADR 0046). */
export const PAGE_SIZE = 50;

const counts = z.record(z.string(), z.number().int().nonnegative());
const offset = (page: number) => (page - 1) * PAGE_SIZE;

/** Page demandée dans l'adresse (1 par défaut). */
export function parsePage(value: unknown): number {
  const n = typeof value === "string" ? Number.parseInt(value, 10) : NaN;
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export async function listProjects(
  supabase: Client,
  { filter, query, page }: { filter: ProjectFilter; query: string | null; page: number },
) {
  const { data } = await supabase.rpc("admin_projects", {
    p_filter: filter,
    p_query: query ?? undefined,
    p_limit: PAGE_SIZE,
    p_offset: offset(page),
  });
  const rows = data ?? [];
  return { rows, total: rows[0]?.total ?? 0 };
}

export async function projectCounts(supabase: Client, query: string | null) {
  const { data } = await supabase.rpc("admin_project_counts", { p_query: query ?? undefined });
  const parsed = counts.safeParse(data);
  return parsed.success ? parsed.data : {};
}

export async function listChantiers(
  supabase: Client,
  { stage, query, page }: { stage: ChantierStage | null; query: string | null; page: number },
) {
  const { data } = await supabase.rpc("admin_chantiers", {
    p_statuses: stage ? statusesOfStage(stage) : undefined,
    p_query: query ?? undefined,
    p_limit: PAGE_SIZE,
    p_offset: offset(page),
  });
  const rows = data ?? [];
  return { rows, total: rows[0]?.total ?? 0 };
}

/** Chantiers par statut (même recherche) ; les étapes sont regroupées par packages/core. */
export async function chantierCounts(supabase: Client, query: string | null) {
  const { data } = await supabase.rpc("admin_chantier_counts", { p_query: query ?? undefined });
  const parsed = counts.safeParse(data);
  return parsed.success ? parsed.data : {};
}

/** Coordonnées d'un compte : nom et téléphone du profil, e-mail (admin_user_emails). */
async function contact(supabase: Client, userId: string) {
  const [{ data: profile }, { data: emails }] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, phone")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.rpc("admin_user_emails", { p_user_ids: [userId] }),
  ]);
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
  return {
    name: name || null,
    phone: profile?.phone ?? null,
    email: emails?.[0]?.email ?? null,
  };
}

export async function getProjectDetail(supabase: Client, id: string) {
  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, user_id, description, created_at, analyzed_at, ai_confidence, trade_code, lieu_type, room_codes, work_type_codes, surface, ville_nom, code_postal, adresse, date_mode, date_souhaitee, urgence, trades(label)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!project) return null;
  const [requests, chantiers, photos, tickets, rooms, works, client] = await Promise.all([
    supabase
      .from("requests")
      .select(
        "id, artisan_id, status, created_at, expires_at, responded_at, refusal_reason, refusal_detail, cancelled_at, message, contact_phone, artisans(raison_sociale, nom_commercial)",
      )
      .eq("project_id", id)
      .order("created_at"),
    supabase.from("chantiers").select("id, request_id, status, title").eq("project_id", id),
    supabase
      .from("project_photos")
      .select("id, storage_path")
      .eq("project_id", id)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("tickets")
      .select("id, type, status, created_at")
      .eq("project_id", id)
      .order("created_at"),
    supabase.from("rooms").select("code, label"),
    supabase.from("work_types").select("code, label"),
    contact(supabase, project.user_id),
  ]);
  const photoRows = photos.data ?? [];
  const { data: signed } = photoRows.length
    ? await supabase.storage.from("project-photos").createSignedUrls(
        photoRows.map((p) => p.storage_path),
        3600,
      )
    : { data: [] };
  const label = (list: { code: string; label: string }[] | null, code: string) =>
    list?.find((item) => item.code === code)?.label ?? code;
  return {
    project,
    client,
    requests: requests.data ?? [],
    chantiers: chantiers.data ?? [],
    tickets: tickets.data ?? [],
    photos: photoRows.map((p, i) => ({ id: p.id, url: signed?.[i]?.signedUrl ?? null })),
    rooms: project.room_codes.map((code) => label(rooms.data, code)),
    works: project.work_type_codes.map((code) => label(works.data, code)),
  };
}

export async function getChantierDetail(supabase: Client, id: string) {
  const { data: chantier } = await supabase
    .from("chantiers")
    .select(
      "id, project_id, artisan_id, particulier_id, status, title, adresse, ville_nom, code_postal, start_at, created_at, artisans(raison_sociale, nom_commercial)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!chantier) return null;
  const [events, quotes, payments, invoices, receptions, tickets, client] = await Promise.all([
    supabase
      .from("chantier_events")
      .select("id, event, actor_role, created_at")
      .eq("chantier_id", id)
      .order("created_at"),
    supabase
      .from("quotes")
      .select("id, numero, version, status, total_ttc_cents, sent_at, signed_at")
      .eq("chantier_id", id)
      .order("version"),
    supabase
      .from("payments")
      .select("id, kind, amount_cents, status, paid_at, created_at")
      .eq("chantier_id", id)
      .order("created_at"),
    supabase
      .from("invoices")
      .select("id, kind, numero, issued_on, total_ttc_cents")
      .eq("chantier_id", id)
      .order("issued_on"),
    supabase
      .from("receptions")
      .select("id, numero, status, with_reserves, signed_at")
      .eq("chantier_id", id)
      .order("created_at"),
    supabase
      .from("tickets")
      .select("id, type, status, created_at")
      .eq("chantier_id", id)
      .order("created_at"),
    contact(supabase, chantier.particulier_id),
  ]);
  return {
    chantier,
    client,
    events: events.data ?? [],
    quotes: quotes.data ?? [],
    payments: payments.data ?? [],
    invoices: invoices.data ?? [],
    receptions: receptions.data ?? [],
    tickets: tickets.data ?? [],
  };
}
