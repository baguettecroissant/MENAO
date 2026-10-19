"use server";

import { revalidatePath } from "next/cache";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { requireAdmin } from "./guard";

const t = fr.admin.referrals;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Annulation d'un parrainage abusif avant la récompense (F-60, ADR 0143). La base vérifie le rôle
 * (admin en session aal2) et le statut, enregistre le motif et inscrit l'annulation au journal.
 */
export async function cancelReferral(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, "referral") ?? "";
  const reason = text(formData, "reason")?.trim() ?? "";
  if (!reason) return { fieldErrors: { reason: [t.errors.reason] } };
  if (!UUID.test(id)) return { error: fr.errors.generic };
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_cancel_referral", { p_id: id, p_reason: reason });
  if (error) return { error: error.code === "22023" ? error.message : fr.errors.generic };
  revalidatePath("/admin/parrainages");
  return { success: t.cancelDone };
}
