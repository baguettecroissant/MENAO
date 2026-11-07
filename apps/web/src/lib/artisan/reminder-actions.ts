"use server";

import { revalidatePath } from "next/cache";
import { fr } from "@/i18n/fr";
import { checkbox, type FormState } from "@/lib/auth/form";
import { createClient } from "@/lib/supabase/server";

const t = fr.pro.onboarding.plans.clientReminders;

/** « Rappels à vos clients » (ADR 0239) : quels rappels partent aussi par SMS. */
export async function saveClientReminders(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_client_reminder_settings", {
    p_rdv: checkbox(formData, "rdv"),
    p_demarrage: checkbox(formData, "demarrage"),
    p_acompte: checkbox(formData, "acompte"),
    p_avis: checkbox(formData, "avis"),
  });
  if (error) return { error: error.code === "42501" ? error.message : fr.errors.generic };
  revalidatePath("/pro/onboarding/formule");
  return { success: t.saved };
}
