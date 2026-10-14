"use server";

import { conversationMessageSchema, messageReportSchema } from "@menao/validation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { createClient } from "@/lib/supabase/server";

/** Erreur de la base affichable telle quelle (règle métier, droit refusé), sinon générique. */
const rpcError = (error: { code?: string; message: string }): FormState => ({
  error: error.code === "22023" || error.code === "42501" ? error.message : fr.errors.generic,
});

function refresh(chantierId: string) {
  revalidatePath(`/mon-espace/messages/${chantierId}`);
  revalidatePath(`/pro/messages/${chantierId}`);
  // Carte « Messagerie avec … » de la vue du chantier côté artisan.
  revalidatePath(`/pro/chantiers/${chantierId}`);
}

/** F-40 : message texte dans la conversation du chantier (send_message : droits, limites). */
export async function sendMessage(
  chantierId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(chantierId).success) return { error: fr.errors.generic };
  const values = { body: text(formData, "body") ?? "" };
  const parsed = conversationMessageSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_message", {
    p_chantier_id: chantierId,
    p_body: parsed.data.body,
  });
  if (error) return { ...rpcError(error), values };
  refresh(chantierId);
  return { success: "ok" };
}

/** Conversation affichée : messages de l'autre partie lus, e-mail en attente annulé. */
export async function markConversationRead(chantierId: string): Promise<void> {
  if (!z.uuid().safeParse(chantierId).success) return;
  const supabase = await createClient();
  await supabase.rpc("mark_conversation_read", { p_chantier_id: chantierId });
}

/** F-40 : signalement d'un message à l'équipe (ticket « message »). */
export async function reportMessage(
  messageId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(messageId).success) return { error: fr.errors.generic };
  const values = { reason: text(formData, "reason") ?? "" };
  const parsed = messageReportSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_message", {
    p_message_id: messageId,
    p_reason: parsed.data.reason,
  });
  if (error) return { ...rpcError(error), values };
  return { success: fr.messages.reportSent };
}
