"use server";

import { reviewReplySchema, reviewReportSchema, reviewSchema } from "@menao/validation";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { requireArtisan } from "@/lib/artisan/requests";
import { text, type FormState } from "@/lib/auth/form";
import { createClient } from "@/lib/supabase/server";

/** Erreur de la base affichable telle quelle (règle métier, droit refusé), sinon générique. */
const rpcError = (error: { code?: string; message: string }): FormState => ({
  error: error.code === "22023" || error.code === "42501" ? error.message : fr.errors.generic,
});

/**
 * F-28 « Comment s'est passée votre expérience ? » : trois curseurs, rapport qualité/prix,
 * commentaire. Droits (PV signé, un avis par chantier) et score MENAO : particulier_submit_review.
 */
export async function submitReview(
  chantierId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(chantierId).success) return { error: fr.errors.generic };
  const values = {
    quality: text(formData, "quality") ?? "",
    delays: text(formData, "delays") ?? "",
    communication: text(formData, "communication") ?? "",
    value_for_money: text(formData, "value_for_money") ?? "",
    comment: text(formData, "comment") ?? "",
  };
  const parsed = reviewSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const supabase = await createClient();
  const { error } = await supabase.rpc("particulier_submit_review", {
    p_chantier_id: chantierId,
    p_quality: parsed.data.quality,
    p_delays: parsed.data.delays,
    p_communication: parsed.data.communication,
    p_value: parsed.data.value_for_money,
    p_comment: parsed.data.comment,
  });
  if (error) return { ...rpcError(error), values };
  revalidatePath(`/mon-espace/chantiers/${chantierId}`);
  redirect(`/mon-espace/chantiers/${chantierId}/avis` as Route);
}

/** F-28 : réponse publique de l'artisan, une seule fois (artisan_reply_review). */
export async function replyToReview(
  reviewId: string,
  chantierId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(reviewId).success || !z.uuid().safeParse(chantierId).success) {
    return { error: fr.errors.generic };
  }
  const values = { reply: text(formData, "reply") ?? "" };
  const parsed = reviewReplySchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const { supabase } = await requireArtisan();
  const { error } = await supabase.rpc("artisan_reply_review", {
    p_review_id: reviewId,
    p_reply: parsed.data.reply,
  });
  if (error) return { ...rpcError(error), values };
  revalidatePath(`/pro/chantiers/${chantierId}`);
  return { success: fr.pro.followUp.replySent };
}

/** F-28 : signalement d'un avis à l'équipe (ticket), depuis un compte connecté. */
export async function reportReview(
  reviewId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(reviewId).success) return { error: fr.errors.generic };
  const values = { reason: text(formData, "reason") ?? "" };
  const parsed = reviewReportSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_review", {
    p_review_id: reviewId,
    p_reason: parsed.data.reason,
  });
  if (error) return { ...rpcError(error), values };
  return { success: fr.search.profile.reportSent };
}
