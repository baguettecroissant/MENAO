"use server";

import { revalidatePath } from "next/cache";
import { fr } from "@/i18n/fr";
import type { FormState } from "@/lib/auth/form";
import { requireProSpace } from "./space";

/**
 * Fiche publique dans Google ou non (F-61, ADR 0144) : choix de l'artisan, sur sa seule fiche (la
 * base n'autorise que cette colonne). Le cache de la fiche est vidé : la consigne « noindex » est
 * servie aussitôt.
 */
export async function saveGoogleListing(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, artisanId } = await requireProSpace();
  const indexable = formData.get("indexable") === "on";
  const { data, error } = await supabase
    .from("artisans")
    .update({ indexable })
    .eq("id", artisanId)
    .select("slug")
    .single();
  if (error) return { error: fr.errors.generic };
  if (data.slug) revalidatePath(`/artisans/${data.slug}`);
  revalidatePath("/pro/profil");
  return { success: fr.pro.publicProfile.web.saved };
}
