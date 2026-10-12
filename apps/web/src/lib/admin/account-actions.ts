"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { env } from "@/env";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { requireAdmin } from "./guard";

const t = fr.admin.accountActions;

function refresh(userId: string) {
  revalidatePath(`/admin/personnes/${userId}`);
  revalidatePath("/admin/personnes");
}

/** Erreur de règle de la base affichable telle quelle, sinon message générique. */
const ruleError = (error: { code?: string; message: string }) =>
  error.code === "22023" ? error.message : fr.errors.generic;

/**
 * F-52 (ADR 0048) : lien de réinitialisation du mot de passe envoyé par Supabase Auth à
 * l'adresse du compte (même e-mail que « Mot de passe oublié »), journalisé.
 */
export async function sendPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = z.uuid().safeParse(text(formData, "userId"));
  if (!id.success) return { error: fr.errors.generic };
  const { supabase } = await requireAdmin();
  const { data: emails } = await supabase.rpc("admin_user_emails", { p_user_ids: [id.data] });
  const email = emails?.[0]?.email;
  if (!email) return { error: t.noEmail };
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/nouveau-mot-de-passe`,
  });
  if (error) {
    const limited =
      error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit";
    return { error: limited ? fr.errors.rateLimited : fr.errors.generic };
  }
  await supabase.rpc("admin_log_account_action", {
    p_user_id: id.data,
    p_action: "compte.lien_mot_de_passe",
  });
  return { success: t.resetSent(email) };
}

/** Accès au compte suspendu (connexion bloquée, sessions fermées), motif transmis (base). */
export async function suspendAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = z.uuid().safeParse(text(formData, "userId"));
  if (!id.success) return { error: fr.errors.generic };
  const values = { reason: text(formData, "reason") ?? "" };
  if (!values.reason.trim()) return { fieldErrors: { reason: [t.reasonRequired] }, values };
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_suspend_account", {
    p_user_id: id.data,
    p_reason: values.reason,
  });
  if (error) return { error: ruleError(error), values };
  refresh(id.data);
  return { success: t.suspended };
}

export async function reactivateAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = z.uuid().safeParse(text(formData, "userId"));
  if (!id.success) return { error: fr.errors.generic };
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_reactivate_account", { p_user_id: id.data });
  if (error) return { error: ruleError(error) };
  refresh(id.data);
  return { success: t.reactivated };
}
