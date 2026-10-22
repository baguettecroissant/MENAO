"use server";

import { welcomeGiftChoiceSchema } from "@menao/validation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { requireArtisan } from "@/lib/artisan/requests";
import { text, type FormState } from "@/lib/auth/form";

/**
 * Cadeau de bienvenue du filleul (F-60, ADR 0154) : choix transmis à l'équipe
 * (`choose_welcome_gift`, ticket « recompense »), une seule fois.
 */
export async function chooseWelcomeGift(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    item: text(formData, "item") ?? "",
    size: text(formData, "size") ?? "",
    recipient: text(formData, "recipient") ?? "",
    ligne: text(formData, "ligne") ?? "",
    code_postal: text(formData, "code_postal") ?? "",
    commune: text(formData, "commune") ?? "",
  };
  const parsed = welcomeGiftChoiceSchema.safeParse({ ...values, size: values.size || null });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const { supabase } = await requireArtisan();
  const { error } = await supabase.rpc("choose_welcome_gift", {
    p_item: parsed.data.item,
    p_size: parsed.data.size ?? "",
    p_recipient: parsed.data.recipient,
    p_adresse_ligne: parsed.data.ligne,
    p_adresse_code_postal: parsed.data.code_postal,
    p_adresse_commune: parsed.data.commune,
  });
  if (error) {
    return {
      error: error.code === "22023" || error.code === "42501" ? error.message : fr.errors.generic,
      values,
    };
  }
  revalidatePath("/pro/mon-profil");
  revalidatePath("/pro/tableau-de-bord");
  return { success: fr.pro.hub.welcomeGift.done };
}
