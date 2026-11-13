"use server";

import { PAYMENT_KINDS } from "@menao/core";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { checkbox, text, type FormState } from "@/lib/auth/form";
import { createClient } from "@/lib/supabase/server";

const t = fr.pro.moneyOverview;
const PATH = "/pro/suivi";

const reminderSchema = z.object({
  chantierId: z.uuid(),
  kind: z.enum(PAYMENT_KINDS),
});

/** « Relancer » (ADR 0238) : rappel au client d'un acompte ou d'un solde dû, au nom de l'artisan. */
export async function sendPaymentReminder(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = reminderSchema.safeParse({
    chantierId: text(formData, "chantierId"),
    kind: text(formData, "kind"),
  });
  if (!parsed.success) return { error: fr.errors.generic };
  const supabase = await createClient();
  const { error } = await supabase.rpc("artisan_send_payment_reminder", {
    p_chantier_id: parsed.data.chantierId,
    p_kind: parsed.data.kind,
  });
  if (error) {
    return {
      error: error.code === "22023" || error.code === "42501" ? error.message : fr.errors.generic,
    };
  }
  revalidatePath(PATH);
  return { success: t.reminded };
}

/** « Relances automatiques » (ADR 0238), désactivées par défaut. */
export async function setAutoReminders(_prev: FormState, formData: FormData): Promise<FormState> {
  const enabled = checkbox(formData, "auto");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_payment_reminders_auto", { p_enabled: enabled });
  if (error) return { error: error.code === "42501" ? error.message : fr.errors.generic };
  revalidatePath(PATH);
  return { success: enabled ? t.autoOn : t.autoOff };
}
