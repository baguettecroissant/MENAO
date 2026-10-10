"use server";

import { revalidatePath } from "next/cache";
import { fr } from "@/i18n/fr";
import { checkbox, type FormState } from "@/lib/auth/form";
import { createClient } from "@/lib/supabase/server";

/** Centre de notifications affiché (F-41) : toutes les notifications sont marquées lues. */
export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("mark_notifications_read", {});
}

/** F-41 : préférences d'e-mail (activité du chantier, rappels). */
export async function saveNotificationPreferences(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_notification_preferences", {
    p_activite: checkbox(formData, "activite"),
    p_rappels: checkbox(formData, "rappels"),
  });
  if (error) return { error: fr.errors.generic };
  revalidatePath("/notifications");
  return { success: fr.notificationCenter.saved };
}
