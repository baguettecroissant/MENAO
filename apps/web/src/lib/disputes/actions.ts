"use server";

import { disputeDecisionSchema, problemReportSchema, ticketMessageSchema } from "@menao/validation";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";
import { text, type FormState } from "@/lib/auth/form";
import { createClient } from "@/lib/supabase/server";

/** Erreur de la base affichable telle quelle (règle métier, droit refusé), sinon générique. */
const rpcError = (error: { code?: string; message: string }): FormState => ({
  error: error.code === "22023" || error.code === "42501" ? error.message : fr.errors.generic,
});

/**
 * F-42 « Signaler un problème lié au chantier » : ticket pour l'équipe ; un chantier actif passe
 * en litige (report_chantier_problem). Le déclarant suit ensuite son signalement.
 */
export async function reportProblem(
  chantierId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(chantierId).success) return { error: fr.errors.generic };
  const values = {
    category: text(formData, "category") ?? "",
    description: text(formData, "description") ?? "",
  };
  const parsed = problemReportSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const supabase = await createClient();
  const { data: ticketId, error } = await supabase.rpc("report_chantier_problem", {
    p_chantier_id: chantierId,
    p_category: parsed.data.category,
    p_description: parsed.data.description,
  });
  if (error || !ticketId)
    return { ...(error ? rpcError(error) : { error: fr.errors.generic }), values };
  revalidatePath(`/mon-espace/chantiers/${chantierId}`);
  revalidatePath(`/pro/chantiers/${chantierId}`);
  redirect(`/signalements/${ticketId}` as Route);
}

/** F-42 : message du déclarant ou de l'équipe dans le ticket (add_ticket_message). */
export async function addTicketMessage(
  ticketId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(ticketId).success) return { error: fr.errors.generic };
  const values = { body: text(formData, "body") ?? "" };
  const parsed = ticketMessageSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_ticket_message", {
    p_ticket_id: ticketId,
    p_body: parsed.data.body,
  });
  if (error) return { ...rpcError(error), values };
  revalidatePath(`/signalements/${ticketId}`);
  revalidatePath("/admin/tickets");
  return { success: "ok" };
}

/** F-42 : décision de l'équipe, reprise ou annulation du chantier (admin_close_dispute). */
export async function closeDispute(
  ticketId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(ticketId).success) return { error: fr.errors.generic };
  const values = {
    outcome: text(formData, "outcome") ?? "",
    message: text(formData, "message") ?? "",
  };
  const parsed = disputeDecisionSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_close_dispute", {
    p_ticket_id: ticketId,
    p_outcome: parsed.data.outcome,
    p_message: parsed.data.message,
  });
  if (error) return { ...rpcError(error), values };
  revalidatePath("/admin/tickets");
  return {};
}
