"use server";

import { clientRatingSchema } from "@menao/validation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { createClient } from "@/lib/supabase/server";

/**
 * F-23 : note de l'artisan sur son client, après la clôture (trois curseurs, commentaire).
 * Droits (chantier de l'artisan, clôturé, une note par chantier) : artisan_rate_client.
 */
export async function rateClient(
  chantierId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(chantierId).success) return { error: fr.errors.generic };
  const values = {
    welcome: text(formData, "welcome") ?? "",
    clarity: text(formData, "clarity") ?? "",
    payment: text(formData, "payment") ?? "",
    comment: text(formData, "comment") ?? "",
  };
  const parsed = clientRatingSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const supabase = await createClient();
  const { error } = await supabase.rpc("artisan_rate_client", {
    p_chantier_id: chantierId,
    p_welcome: parsed.data.welcome,
    p_clarity: parsed.data.clarity,
    p_payment: parsed.data.payment,
    p_comment: parsed.data.comment,
  });
  if (error) {
    return {
      error: error.code === "22023" || error.code === "42501" ? error.message : fr.errors.generic,
      values,
    };
  }
  revalidatePath(`/pro/chantiers/${chantierId}`);
  return { success: fr.pro.clientRating.saved };
}
