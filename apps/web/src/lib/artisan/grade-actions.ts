"use server";

import { rewardClaimSchema } from "@menao/validation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { requireArtisan } from "@/lib/artisan/requests";
import { text, type FormState } from "@/lib/auth/form";

/** Écran « Nouveau badge débloqué » montré : les badges obtenus ne le déclenchent plus. */
export async function markBadgesSeen(): Promise<void> {
  const { supabase } = await requireArtisan();
  await supabase.rpc("artisan_mark_badges_seen");
  revalidatePath("/pro/grade");
  revalidatePath("/pro/tableau-de-bord");
}

/** F-24 « Recevoir ma récompense » : demande transmise à l'équipe (artisan_claim_reward). */
export async function claimReward(
  level: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.number().int().min(1).max(20).safeParse(level).success) {
    return { error: fr.errors.generic };
  }
  const values = {
    jacket_size: text(formData, "jacket_size") ?? "",
    pants_size: text(formData, "pants_size") ?? "",
    address: text(formData, "address") ?? "",
    city: text(formData, "city") ?? "",
    country: text(formData, "country") ?? "",
    phone: text(formData, "phone") ?? "",
  };
  const parsed = rewardClaimSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const { supabase } = await requireArtisan();
  const { error } = await supabase.rpc("artisan_claim_reward", {
    p_level: level,
    p_jacket_size: parsed.data.jacket_size,
    p_pants_size: parsed.data.pants_size,
    p_address: parsed.data.address,
    p_city: parsed.data.city,
    p_country: parsed.data.country,
    p_phone: parsed.data.phone,
  });
  if (error) {
    return {
      error: error.code === "22023" || error.code === "42501" ? error.message : fr.errors.generic,
      values,
    };
  }
  revalidatePath("/pro/grade");
  return { success: fr.pro.grade.reward.done };
}
