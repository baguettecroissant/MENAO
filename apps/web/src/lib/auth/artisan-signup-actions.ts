"use server";

import {
  ARTISAN_SIGNUP_FINALIZE_PATH,
  ARTISAN_SIGNUP_REQUIRED_DOCUMENTS,
  ARTISAN_WELCOME_PATH,
  LEGAL_DOCUMENT_VERSIONS,
  isOAuthProvider,
} from "@menao/core";
import {
  artisanAccountSchema,
  artisanOAuthAccountSchema,
  artisanSignupMetadata,
  artisanSignupProfileSchema,
  emailCodeSchema,
} from "@menao/validation";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import { confirmUrlFor } from "./confirm-url";
import { authErrorMessage } from "./errors";
import { redirectToProvider } from "./oauth";

const t = fr.pro.signUp;

export type ArtisanSignupState = {
  error?: string;
  /** Erreurs par champ du compte (étape « compte »). */
  fieldErrors?: Record<string, string[] | undefined>;
  /** Le parcours (métiers, entreprise, zone) est à reprendre : brouillon incomplet ou altéré. */
  profileInvalid?: boolean;
  /** Compte créé : code envoyé à cette adresse. */
  codeSentTo?: string;
};

const legalVersions = () =>
  Object.fromEntries(
    ARTISAN_SIGNUP_REQUIRED_DOCUMENTS.map((doc) => [doc, LEGAL_DOCUMENT_VERSIONS[doc]]),
  );

/**
 * Création du compte par e-mail, avec les choix du parcours (ADR 0110). « account_type » n'est
 * qu'une intention : la base n'en déduit que artisan_en_attente (ADR 0006). Supabase envoie
 * l'e-mail de confirmation, qui porte un code à 6 chiffres et un lien.
 */
export async function signUpArtisan(input: {
  profile: unknown;
  account: unknown;
}): Promise<ArtisanSignupState> {
  const profile = artisanSignupProfileSchema.safeParse(input.profile);
  if (!profile.success) return { profileInvalid: true, error: fr.errors.generic };
  const account = artisanAccountSchema.safeParse(input.account);
  if (!account.success) return { fieldErrors: z.flattenError(account.error).fieldErrors };

  const a = account.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: a.email,
    password: a.password,
    options: {
      emailRedirectTo: confirmUrlFor(ARTISAN_WELCOME_PATH),
      data: {
        account_type: "artisan",
        first_name: a.firstName,
        last_name: a.lastName,
        phone: a.phone ?? null,
        siret: profile.data.siret,
        marketing_opt_in: a.marketingOptIn,
        legal: legalVersions(),
        signup: artisanSignupMetadata(profile.data),
      },
    },
  });
  if (error) return { error: authErrorMessage(error) };
  return { codeSentTo: a.email };
}

/**
 * Vérifie le SIRET auprès de l'INSEE dès la création du compte (sirene-check, ADR 0006), avec la
 * session qui vient d'être ouverte. Un échec n'empêche rien : l'étape « Entreprise » le signale.
 */
async function checkSiret(supabase: Awaited<ReturnType<typeof createClient>>) {
  await supabase.functions.invoke("sirene-check", { method: "POST" }).catch(() => null);
}

/** Code reçu par e-mail : confirme l'adresse et ouvre la session, sans quitter le parcours. */
export async function verifyArtisanEmailCode(input: {
  email: string;
  code: string;
}): Promise<ArtisanSignupState> {
  const parsed = emailCodeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? t.code.invalid };
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.code,
    type: "email",
  });
  if (error) return { error: t.code.invalid };
  await checkSiret(supabase);
  redirect(ARTISAN_WELCOME_PATH as Route);
}

export async function resendArtisanEmailCode(email: string): Promise<ArtisanSignupState> {
  const parsed = emailCodeSchema.shape.email.safeParse(email);
  if (!parsed.success) return { error: fr.errors.generic };
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
    options: { emailRedirectTo: confirmUrlFor(ARTISAN_WELCOME_PATH) },
  });
  // Même réponse que le compte existe ou non (pas d'énumération), sauf trop de demandes.
  if (error?.code === "over_email_send_rate_limit") return { error: authErrorMessage(error) };
  return { codeSentTo: parsed.data };
}

/** Google ou Apple depuis l'inscription artisan : retour sur la finalisation artisan. */
export async function continueAsArtisanWithProvider(formData: FormData): Promise<void> {
  const provider = formData.get("provider");
  if (!isOAuthProvider(provider)) redirect("/connexion?erreur=oauth");
  await redirectToProvider(provider, ARTISAN_SIGNUP_FINALIZE_PATH);
}

/**
 * Compte Google ou Apple à finaliser (ADR 0108) transformé en compte artisan en attente, avec les
 * choix du parcours gardés dans le navigateur pendant la connexion. Le jeton est ensuite rafraîchi
 * pour porter le nouveau rôle.
 */
export async function completeArtisanOAuthSignup(input: {
  profile: unknown;
  account: unknown;
}): Promise<ArtisanSignupState> {
  const profile = artisanSignupProfileSchema.safeParse(input.profile);
  if (!profile.success) return { profileInvalid: true, error: fr.errors.generic };
  const account = artisanOAuthAccountSchema.safeParse(input.account);
  if (!account.success) return { fieldErrors: z.flattenError(account.error).fieldErrors };

  const a = account.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_artisan_oauth_signup", {
    p_first_name: a.firstName,
    p_last_name: a.lastName,
    p_phone: a.phone ?? "",
    p_marketing_opt_in: a.marketingOptIn,
    p_legal: legalVersions(),
    p_siret: profile.data.siret,
    p_signup: artisanSignupMetadata(profile.data),
  });
  if (error) return { error: error.code === "22023" ? error.message : fr.errors.generic };
  await supabase.auth.refreshSession();
  await checkSiret(supabase);
  redirect(ARTISAN_WELCOME_PATH as Route);
}
