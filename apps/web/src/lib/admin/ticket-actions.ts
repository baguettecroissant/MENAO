"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { requireStaff } from "./guard";

const t = fr.admin.tickets;

function refresh(ticketId: string) {
  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
}

/** F-56 (ADR 0049) : « Je m'en occupe » ou rendre la main (staff_take_ticket). */
export async function takeTicket(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(text(formData, "ticketId"));
  if (!id.success) return;
  const { supabase } = await requireStaff();
  await supabase.rpc("staff_take_ticket", {
    p_ticket_id: id.data,
    p_take: text(formData, "take") !== "false",
  });
  refresh(id.data);
}

/** Note interne, visible de l'équipe seulement (table ticket_notes, droits de la base). */
export async function addTicketNote(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = z.uuid().safeParse(text(formData, "ticketId"));
  if (!id.success) return { error: fr.errors.generic };
  const values = { body: text(formData, "body") ?? "" };
  const body = values.body.trim();
  if (!body) return { fieldErrors: { body: [t.noteRequired] }, values };
  if (body.length > 2000) return { fieldErrors: { body: [fr.errors.generic] }, values };
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("ticket_notes").insert({ ticket_id: id.data, body });
  if (error) return { error: fr.errors.generic, values };
  refresh(id.data);
  return { success: "ok" };
}

/**
 * Demandes retenues par le recoupement automatique (ADR 0157) : transmises aux artisans (délai de
 * 72 h à partir de maintenant) ou bloquées avec un motif interne. Décision journalisée en base.
 */
export async function reviewHeldRequests(_prev: FormState, formData: FormData): Promise<FormState> {
  const projectId = z.uuid().safeParse(text(formData, "projectId"));
  const release = text(formData, "decision") === "release";
  const reason = (text(formData, "reason") ?? "").trim();
  if (!projectId.success) return { error: fr.errors.generic };
  const t = fr.admin.tickets.heldRequests;
  if (!release && !reason) {
    return { fieldErrors: { reason: [fr.admin.referrals.errors.reason] }, values: { reason } };
  }
  const { supabase } = await requireStaff();
  const { data, error } = await supabase.rpc("staff_review_held_requests", {
    p_project_id: projectId.data,
    p_release: release,
    p_reason: reason,
  });
  if (error) {
    return {
      error: error.code === "22023" ? error.message : fr.errors.generic,
      values: { reason },
    };
  }
  revalidatePath("/admin/tickets", "layout");
  return { success: release ? t.released(data ?? 1) : t.blocked };
}
