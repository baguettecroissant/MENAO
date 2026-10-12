"use server";

import {
  accountDeletionSchema,
  accountProfileSchema,
  emailChangeSchema,
  messages,
  passwordChangeSchema,
} from "@menao/validation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { confirmUrlFor } from "@/lib/auth/confirm-url";
import { checkbox, text, type FormState } from "@/lib/auth/form";
import { createClient } from "@/lib/supabase/server";
import { requireAccount } from "./session";

const t = fr.account;

/** « Mes informations » : prénom, nom, téléphone (obligatoire pour un compte professionnel). */
export async function saveAccountProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    firstName: text(formData, "firstName") ?? "",
    lastName: text(formData, "lastName") ?? "",
    phone: text(formData, "phone") ?? "",
  };
  const parsed = accountProfileSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const { supabase, user, role } = await requireAccount();
  if (role !== "particulier" && !parsed.data.phone) {
    return { fieldErrors: { phone: [messages.phoneRequired] }, values };
  }
  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      phone: parsed.data.phone ?? null,
    })
    .eq("user_id", user.id);
  if (error) return { error: t.errors.unavailable, values };
  revalidatePath("/compte");
  return { success: t.profile.saved };
}

/**
 * Nouvelle adresse e-mail : Supabase envoie un lien aux deux adresses (double confirmation) ;
 * l'adresse du compte ne change qu'une fois les deux liens ouverts.
 */
export async function changeEmail(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { email: text(formData, "email") ?? "" };
  const parsed = emailChangeSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const { supabase, email } = await requireAccount();
  if (parsed.data.email === email.toLowerCase()) {
    return { fieldErrors: { email: [t.email.same] }, values };
  }
  const { error } = await supabase.auth.updateUser(
    { email: parsed.data.email },
    { emailRedirectTo: confirmUrlFor("/compte?email=confirme") },
  );
  if (error) {
    const message =
      error.code === "email_exists"
        ? t.email.taken
        : error.status === 429
          ? t.errors.rateLimited
          : t.errors.unavailable;
    return { error: message, values };
  }
  revalidatePath("/compte");
  return { success: t.email.sent(parsed.data.email) };
}

/**
 * Mot de passe : l'actuel est vérifié par une nouvelle connexion (session récente exigée par
 * Supabase pour ce changement), puis les sessions des autres appareils sont révoquées (elles
 * cessent au plus tard à l'expiration de leur jeton, une heure).
 */
export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = passwordChangeSchema.safeParse({
    currentPassword: text(formData, "currentPassword") ?? "",
    password: text(formData, "password") ?? "",
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { supabase, email } = await requireAccount();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.currentPassword,
  });
  if (signInError) {
    return signInError.status === 429
      ? { error: t.errors.rateLimited }
      : { fieldErrors: { currentPassword: [t.password.wrong] } };
  }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") {
      return { fieldErrors: { password: [messages.passwordUnchanged] } };
    }
    if (error.code === "weak_password") return { fieldErrors: { password: [t.password.weak] } };
    return { error: error.status === 429 ? t.errors.rateLimited : t.errors.unavailable };
  }
  await supabase.auth.signOut({ scope: "others" });
  return { success: t.password.changed };
}

/** Communications marketing : choix daté par la base (preuve du consentement et de son retrait). */
export async function saveCommunications(_prev: FormState, formData: FormData): Promise<FormState> {
  const optIn = checkbox(formData, "marketingOptIn");
  const { supabase, user } = await requireAccount();
  const { error } = await supabase
    .from("profiles")
    .update({ marketing_opt_in: optIn })
    .eq("user_id", user.id);
  if (error) return { error: t.errors.unavailable };
  revalidatePath("/compte");
  return { success: optIn ? t.communications.subscribed : t.communications.unsubscribed };
}

/** Demande de suppression du compte : ticket pour l'équipe, réponse sous un mois. */
export async function requestAccountDeletion(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = { message: text(formData, "message") ?? "" };
  const parsed = accountDeletionSchema.safeParse({
    confirm: checkbox(formData, "confirm"),
    message: values.message,
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const { supabase } = await requireAccount();
  const { error } = await supabase.rpc("request_account_deletion", {
    p_message: parsed.data.message,
  });
  if (error) return { error: t.errors.unavailable, values };
  revalidatePath("/compte");
  return { success: t.deletion.sent };
}

/** Déconnexion de toutes les sessions du compte, y compris celle-ci. */
export async function signOutEverywhere(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/connexion?deconnexion=partout");
}
