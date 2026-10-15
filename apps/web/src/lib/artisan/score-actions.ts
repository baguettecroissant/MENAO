"use server";

import { revalidatePath } from "next/cache";
import { fr } from "@/i18n/fr";
import type { FormState } from "@/lib/auth/form";
import { createClient } from "@/lib/supabase/server";

/** « Mon planning est à jour » : confirmation hebdomadaire, critère du score MENAO (ADR 0105). */
export async function confirmPlanning(): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("artisan_confirm_planning");
  if (error) return { error: fr.errors.generic };
  revalidatePath("/pro", "layout");
  return { success: fr.pro.score.confirmed };
}
