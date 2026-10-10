"use server";

import { reviewModerationSchema } from "@menao/validation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { requireAdmin } from "./guard";

const t = fr.admin.detail;

function refresh(artisanId?: string) {
  revalidatePath("/admin/artisans");
  if (artisanId) revalidatePath(`/admin/artisans/${artisanId}`);
}

/** Valide ou refuse (avec motif) un document. Règles et audit : admin_review_document (base). */
export async function reviewDocument(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = z.uuid().safeParse(text(formData, "documentId"));
  const status = z.enum(["valide", "refuse"]).safeParse(text(formData, "status"));
  if (!id.success || !status.success) return { error: t.error };

  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_review_document", {
    p_document_id: id.data,
    p_status: status.data,
    p_reason: text(formData, "reason") ?? undefined,
  });
  if (error) return { error: error.code === "22023" ? t.error : fr.errors.generic };
  refresh(text(formData, "artisanId"));
  return { success: t.done };
}

export async function verifyCertification(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(text(formData, "certificationId"));
  if (!id.success) return;
  const { supabase } = await requireAdmin();
  await supabase.rpc("admin_verify_certification", {
    p_certification_id: id.data,
    p_verified: text(formData, "verified") === "true",
  });
  refresh(text(formData, "artisanId"));
}

/** Décision sur le dossier : valider, refuser (message), demander un complément (message). */
export async function decideArtisan(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = z.uuid().safeParse(text(formData, "artisanId"));
  const decision = z.enum(["valide", "refuse", "complement"]).safeParse(text(formData, "decision"));
  if (!id.success || !decision.success) return { error: t.error };

  const message = text(formData, "message")?.trim();
  if (decision.data !== "valide" && !message)
    return { fieldErrors: { message: [fr.admin.detail.messageHint] } };

  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_decide_artisan", {
    p_artisan_id: id.data,
    p_decision: decision.data,
    p_message: message || undefined,
  });
  if (error) return { error: error.code === "22023" ? t.error : fr.errors.generic };
  refresh(id.data);
  return { success: t.decisions[decision.data] };
}

/**
 * F-28, F-55 : masque (motif obligatoire) ou republie un avis signalé ; un avis n'est jamais masqué
 * pour la seule raison qu'il est négatif. Règles, score, signalements clos, audit :
 * admin_moderate_review (base).
 */
export async function moderateReview(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = z.uuid().safeParse(text(formData, "reviewId"));
  const status = z.enum(["publie", "masque"]).safeParse(text(formData, "status"));
  if (!id.success || !status.success) return { error: fr.errors.generic };
  const values = { reason: text(formData, "reason") ?? "" };
  const reason = status.data === "masque" ? reviewModerationSchema.safeParse(values) : null;
  if (reason && !reason.success) {
    return { fieldErrors: z.flattenError(reason.error).fieldErrors, values };
  }
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_moderate_review", {
    p_review_id: id.data,
    p_status: status.data,
    p_reason: reason?.success ? reason.data.reason : "",
  });
  if (error) return { error: error.code === "22023" ? error.message : fr.errors.generic, values };
  revalidatePath("/admin/tickets");
  return {};
}

/** Dossier envoyé par un particulier (F-09, F-56) : en cours, résolu ou rouvert. */
export async function setTicketStatus(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(text(formData, "ticketId"));
  const status = z.enum(["ouvert", "en_cours", "resolu"]).safeParse(text(formData, "status"));
  if (!id.success || !status.success) return;
  const { supabase } = await requireAdmin();
  await supabase.rpc("staff_set_ticket_status", { p_ticket_id: id.data, p_status: status.data });
  revalidatePath("/admin/tickets");
}
