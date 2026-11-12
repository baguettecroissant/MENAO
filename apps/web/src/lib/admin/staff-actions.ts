"use server";

import { FunctionsHttpError } from "@supabase/supabase-js";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { requireAdmin } from "./guard";

const t = fr.admin.people.invite;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Trois accès (ADR 0286).
const ROLES = ["admin", "support", "verification"];
const INVALID = t.errors.invalid ?? fr.errors.generic;

/**
 * Invitation d'un admin, d'un membre du support ou de la vérification (F-67, ADR 0210, 0286) : l'Edge Function staff-invite
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
  revalidatePath("/admin/reglages/equipe");
  return { success: t.invited(values.email ?? "") };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TEAM_PATH = "/admin/reglages/equipe";

/**
 * Changement d'accès d'un membre de l'équipe (F-133, ADR 0284, 0286) : la base vérifie
 * l'admin (aal2), refuse son propre compte, ferme les sessions du membre et journalise.
 */
export async function setStaffRole(formData: FormData): Promise<void> {
  const id = text(formData, "userId") ?? "";
  const role = text(formData, "role");
  if (!UUID.test(id) || (role !== "admin" && role !== "support" && role !== "verification")) {
    redirect(`${TEAM_PATH}?erreur=1` as Route);
  }
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_set_staff_role", { p_user_id: id, p_role: role });
  revalidatePath(TEAM_PATH);
  redirect(`${TEAM_PATH}?${error ? "erreur=1" : "fait=acces"}` as Route);
}

/** Retrait de l'accès d'un membre qui quitte MENAO (connexion bloquée, sessions fermées). */
export async function removeStaff(formData: FormData): Promise<void> {
  const id = text(formData, "userId") ?? "";
  if (!UUID.test(id)) redirect(`${TEAM_PATH}?erreur=1` as Route);
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_remove_staff", { p_user_id: id });
  revalidatePath(TEAM_PATH);
  revalidatePath("/admin/personnes");
  redirect(`${TEAM_PATH}?${error ? "erreur=1" : "fait=retrait"}` as Route);
}
