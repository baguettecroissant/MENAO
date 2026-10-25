import { parisToday, roleFromAppMetadata } from "@menao/core";
import { accountExport, type ExportClient } from "@menao/documents";
import {
  accountProfileSchema,
  emailChangeSchema,
  messages,
  passwordChangeSchema,
} from "@menao/validation";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { siteLinks } from "./env";
import { forgetProfileSummary } from "./profile-summary";
import { supabase } from "./supabase";

const t = fr.account;

/** Issue d'un formulaire du compte, comme sur le site : message général ou erreurs par champ. */
export type AccountFormState<F extends string> = {
  success?: string;
  error?: string;
  fieldErrors?: Partial<Record<F, string>>;
};

/** Premier message de chaque champ en erreur. */
const fieldErrors = <F extends string>(error: z.ZodError) =>
  Object.fromEntries(
    Object.entries(z.flattenError(error).fieldErrors).map(([key, list]) => [
      key,
      (list as string[] | undefined)?.[0],
    ]),
  ) as Partial<Record<F, string>>;

export type AccountDetails = {
  firstName: string;
  lastName: string;
  /** Au format saisi (« 06… ») pour le formulaire. */
  phone: string;
  email: string;
  /** Nouvelle adresse en attente de confirmation. */
  pendingEmail: string | null;
  marketingOptIn: boolean;
  /** Demande de suppression en cours : sa date. */
  deletionRequestedAt: string | null;
};

/**
 * « Mon compte » (F-08), comme sur le site : informations, adresse e-mail (relue sur le serveur,
 * avec le changement en attente), communications et demande de suppression en cours.
 */
export async function loadAccount(): Promise<AccountDetails | null> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const [{ data: profile }, deletionRequestedAt] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, phone, marketing_opt_in")
      .eq("user_id", user.id)
      .maybeSingle(),
    loadDeletionRequest(),
  ]);
  return {
    firstName: profile?.first_name ?? "",
    lastName: profile?.last_name ?? "",
    phone: profile?.phone ? profile.phone.replace(/^\+33/, "0") : "",
    email: user.email ?? "",
    pendingEmail: user.new_email ?? null,
    marketingOptIn: profile?.marketing_opt_in ?? false,
    deletionRequestedAt,
  };
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** « Mes informations » : prénom, nom, téléphone (obligatoire pour un compte professionnel). */
export async function saveProfile(
  values: { firstName: string; lastName: string; phone: string },
  pro: boolean,
): Promise<AccountFormState<"firstName" | "lastName" | "phone">> {
  const parsed = accountProfileSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  if (pro && !parsed.data.phone) return { fieldErrors: { phone: messages.phoneRequired } };
  const userId = await currentUserId();
  if (!userId) return { error: t.errors.unavailable };
  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      phone: parsed.data.phone ?? null,
    })
    .eq("user_id", userId);
  if (error) return { error: t.errors.unavailable };
  // Prénom des en-têtes (avatar) relu au prochain affichage.
  forgetProfileSummary();
  return { success: t.profile.saved };
}

/**
 * Nouvelle adresse e-mail : Supabase envoie un lien aux deux adresses (double confirmation),
 * ouvert sur le site ; l'adresse du compte ne change qu'une fois les deux liens ouverts.
 */
export async function changeEmail(
  email: string,
  current: string,
): Promise<AccountFormState<"email">> {
  const parsed = emailChangeSchema.safeParse({ email });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  if (parsed.data.email === current.toLowerCase()) return { fieldErrors: { email: t.email.same } };
  const { error } = await supabase.auth.updateUser(
    { email: parsed.data.email },
    { emailRedirectTo: siteLinks.emailChanged },
  );
  if (error) {
    return {
      error:
        error.code === "email_exists"
          ? t.email.taken
          : error.status === 429
            ? t.errors.rateLimited
            : t.errors.unavailable,
    };
  }
  return { success: t.email.sent(parsed.data.email) };
}

/**
 * Mot de passe, comme sur le site : l'actuel est vérifié par une nouvelle connexion (session
 * récente exigée par Supabase pour ce changement), puis les sessions des autres appareils sont
 * révoquées.
 */
export async function changePassword(
  currentPassword: string,
  password: string,
): Promise<AccountFormState<"currentPassword" | "password">> {
  const parsed = passwordChangeSchema.safeParse({ currentPassword, password });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { data } = await supabase.auth.getSession();
  const email = data.session?.user.email;
  if (!email) return { error: t.errors.unavailable };
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.currentPassword,
  });
  if (signInError) {
    return signInError.status === 429
      ? { error: t.errors.rateLimited }
      : { fieldErrors: { currentPassword: t.password.wrong } };
  }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") {
      return { fieldErrors: { password: messages.passwordUnchanged } };
    }
    if (error.code === "weak_password") return { fieldErrors: { password: t.password.weak } };
    return { error: error.status === 429 ? t.errors.rateLimited : t.errors.unavailable };
  }
  await supabase.auth.signOut({ scope: "others" });
  return { success: t.password.changed };
}

/**
 * Communications marketing : choix daté par la base (preuve du consentement et de son retrait).
 * Message d'erreur, ou null.
 */
export async function saveMarketingOptIn(optIn: boolean): Promise<string | null> {
  const userId = await currentUserId();
  if (!userId) return t.errors.unavailable;
  const { error } = await supabase
    .from("profiles")
    .update({ marketing_opt_in: optIn })
    .eq("user_id", userId);
  return error ? t.errors.unavailable : null;
}

/**
 * « Télécharger mes données » (RGPD), comme sur le site : même contenu (`@menao/documents`), lu
 * avec les droits du compte, dans un fichier JSON proposé au partage du téléphone (enregistrer
 * dans Fichiers, envoyer). Réservé aux particuliers et aux artisans. Faux en cas d'échec.
 */
export async function shareAccountData(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user || !(await Sharing.isAvailableAsync())) return false;
    const role = roleFromAppMetadata(user.app_metadata);
    if (role === "admin" || role === "support" || role === "visiteur") return false;
    const payload = await accountExport(
      // Le client Supabase, vu par l'export comme une simple lecture de tables.
      supabase as unknown as ExportClient,
      {
        id: user.id,
        email: user.email ?? null,
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
        role,
      },
      new Date(),
    );
    const file = new File(Paths.cache, `menao-mes-donnees-${parisToday()}.json`);
    file.create({ overwrite: true });
    await file.write(JSON.stringify(payload, null, 2));
    await Sharing.shareAsync(file.uri, { mimeType: "application/json", UTI: "public.json" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Demande de suppression du compte en cours (ticket « suppression_compte » non résolu), comme sur
 * le site : sa date, ou null. Lecture avec les droits du compte (RLS).
 */
export async function loadDeletionRequest(): Promise<string | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const { data } = await supabase
    .from("tickets")
    .select("created_at")
    .eq("user_id", userId)
    .eq("type", "suppression_compte")
    .neq("status", "resolu")
    .maybeSingle();
  return data?.created_at ?? null;
}

/**
 * Demande de suppression du compte (Apple 5.1.1 v, RGPD), comme sur le site : ticket pour
 * l'équipe MENAO, réponse sous un mois (`request_account_deletion`). Date de la demande, ou null
 * en cas d'erreur.
 */
export async function requestAccountDeletion(message: string | undefined): Promise<string | null> {
  const { data, error } = await supabase.rpc("request_account_deletion", {
    ...(message ? { p_message: message } : {}),
  });
  return error || !data ? null : data;
}
