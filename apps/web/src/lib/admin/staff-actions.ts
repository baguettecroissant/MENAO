"use server";

import { FunctionsHttpError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { requireAdmin } from "./guard";

const t = fr.admin.people.invite;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ["admin", "support"];
const INVALID = t.errors.invalid ?? fr.errors.generic;

/**
 * Invitation d'un admin ou d'un membre du support (F-67, ADR 0210) : l'Edge Function staff-invite
 * crée le compte avec le rôle choisi (clé serveur), enregistre l'invitation au nom de l'admin
 * (session aal2, vérifiée par la base) et Supabase envoie l'e-mail pour choisir le mot de passe.
 */
export async function inviteStaff(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = Object.fromEntries(
    ["firstName", "lastName", "email", "role"].map((k) => [k, text(formData, k)?.trim() ?? ""]),
  );
  const fieldErrors: Record<string, string[]> = {};
  if (!values.firstName || values.firstName.length > 100) fieldErrors.firstName = [INVALID];
  if (!values.lastName || values.lastName.length > 100) fieldErrors.lastName = [INVALID];
  if (!EMAIL.test(values.email ?? "")) fieldErrors.email = [INVALID];
  if (!ROLES.includes(values.role ?? "")) fieldErrors.role = [INVALID];
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.functions.invoke<{ status: string }>("staff-invite", {
    method: "POST",
    body: {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      role: values.role,
    },
  });
  let status = data?.status ?? "unavailable";
  if (error instanceof FunctionsHttpError) {
    const parsed = (await error.context.json().catch(() => null)) as { status?: string } | null;
    status = parsed?.status ?? "unavailable";
  }
  if (status !== "ok") {
    const message = t.errors[status] ?? t.errors.unavailable ?? fr.errors.generic;
    if (status === "email_taken") return { fieldErrors: { email: [message] }, values };
    return { error: message, values };
  }
  revalidatePath("/admin/personnes");
  return { success: t.invited(values.email ?? "") };
}
