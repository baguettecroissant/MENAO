"use server";

import {
  LEGAL_DOCUMENT_VERSIONS,
  SIGNUP_REQUIRED_DOCUMENTS,
  homePathForRole,
  isArtisanFinalizePath,
  isOAuthProvider,
  roleFromAppMetadata,
  signupPending,
} from "@menao/core";
import {
  completeSignupSchema,
  magicLinkSchema,
  newPasswordSchema,
  passwordResetRequestSchema,
  safeRedirectPath,
  signInSchema,
  signUpSchema,
} from "@menao/validation";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/env";
import { fr } from "@/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import { confirmUrlFor } from "./confirm-url";
import { authErrorMessage } from "./errors";
import { checkbox, text, type FormState } from "./form";
import { redirectToProvider } from "./oauth";

const confirmUrl = `${env.NEXT_PUBLIC_SITE_URL}/auth/confirm`;

/**
 * Après une connexion : la page demandée, ou d'abord « Finaliser mon compte » pour un compte
 * Google ou Apple à finaliser (ADR 0108). Une redirection d'action serveur ne repasse pas par le
 * garde (proxy.ts) : la vérification est donc faite ici aussi.
 */
function redirectAfterSignIn(appMetadata: unknown, target: string): never {
  // La finalisation artisan (ADR 0110) remplace « Finaliser mon compte ».
  if (signupPending(appMetadata) && !isArtisanFinalizePath(target)) {
    redirect(`/finaliser-compte?next=${encodeURIComponent(target)}` as Route);
  }
  redirect(target as Route);
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    firstName: text(formData, "firstName") ?? "",
    lastName: text(formData, "lastName") ?? "",
    phone: text(formData, "phone") ?? "",
    email: text(formData, "email") ?? "",
  };
  const parsed = signUpSchema.safeParse({
    ...values,
    password: text(formData, "password") ?? "",
    acceptTerms: checkbox(formData, "acceptTerms"),
    marketingOptIn: checkbox(formData, "marketingOptIn"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const input = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: confirmUrlFor("/mon-espace"),
      // Lu par le trigger app.after_auth_user_insert (profil + acceptations), puis retiré.
      // Jamais de rôle ici : le rôle vit dans app_metadata, fixé côté base.
      data: {
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.phone ?? null,
        marketing_opt_in: input.marketingOptIn,
        legal: Object.fromEntries(
          SIGNUP_REQUIRED_DOCUMENTS.map((doc) => [doc, LEGAL_DOCUMENT_VERSIONS[doc]]),
        ),
      },
    },
  });
  if (error) return { error: authErrorMessage(error), values };

  redirect("/verifier-email");
}

/** Inscription professionnelle (F-14) : rôle artisan_en_attente attribué par le trigger SQL. */
export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { email: text(formData, "email") ?? "" };
  const parsed = signInSchema.safeParse({ ...values, password: text(formData, "password") ?? "" });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: authErrorMessage(error), values };

  const home = homePathForRole(roleFromAppMetadata(data.user.app_metadata));
  redirectAfterSignIn(data.user.app_metadata, safeRedirectPath(text(formData, "next"), home));
}

export async function sendMagicLink(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { email: text(formData, "email") ?? "" };
  const parsed = magicLinkSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    // Connexion seulement : l'inscription passe par le formulaire (acceptation des CGU).
    options: { shouldCreateUser: false, emailRedirectTo: confirmUrl },
  });
  // Réponse identique que le compte existe ou non (pas d'énumération des comptes).
  if (
    error &&
    (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit")
  ) {
    return { error: fr.errors.rateLimited, values };
  }
  return { success: fr.magicLink.sent };
}

export async function requestPasswordReset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = { email: text(formData, "email") ?? "" };
  const parsed = passwordResetRequestSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    // Utilisé par le modèle d'e-mail par défaut de Supabase (flux « code ») ; le modèle MENAO
    // (token_hash, type=recovery) mène de toute façon à /nouveau-mot-de-passe.
    redirectTo: `${confirmUrl}?next=/nouveau-mot-de-passe`,
  });
  // Réponse identique que le compte existe ou non (pas d'énumération des comptes).
  if (
    error &&
    (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit")
  ) {
    return { error: fr.errors.rateLimited, values };
  }
  return { success: fr.forgotPassword.sent };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = newPasswordSchema.safeParse({ password: text(formData, "password") ?? "" });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: authErrorMessage(error) };

  redirectAfterSignIn(
    data.user.app_metadata,
    homePathForRole(roleFromAppMetadata(data.user.app_metadata)),
  );
}

/** « Continuer avec Google / Apple » (ADR 0108), depuis la connexion ou l'inscription client. */
export async function continueWithProvider(formData: FormData): Promise<void> {
  const provider = text(formData, "provider");
  if (!isOAuthProvider(provider)) redirect("/connexion?erreur=oauth");
  const next = text(formData, "next");
  await redirectToProvider(provider, next ? safeRedirectPath(next) : null);
}

/**
 * « Finaliser mon compte » après Google ou Apple (ADR 0108) : nom, téléphone, acceptation des CGU
 * et de la politique de confidentialité (versions en vigueur), newsletters. Le jeton est ensuite
 * rafraîchi pour ne plus porter le marqueur « à finaliser ».
 */
export async function completeSignup(
  next: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = {
    firstName: text(formData, "firstName") ?? "",
    lastName: text(formData, "lastName") ?? "",
    phone: text(formData, "phone") ?? "",
  };
  const parsed = completeSignupSchema.safeParse({
    ...values,
    acceptTerms: checkbox(formData, "acceptTerms"),
    marketingOptIn: checkbox(formData, "marketingOptIn"),
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_oauth_signup", {
    p_first_name: parsed.data.firstName,
    p_last_name: parsed.data.lastName,
    p_phone: parsed.data.phone ?? "",
    p_marketing_opt_in: parsed.data.marketingOptIn,
    p_legal: Object.fromEntries(
      SIGNUP_REQUIRED_DOCUMENTS.map((doc) => [doc, LEGAL_DOCUMENT_VERSIONS[doc]]),
    ),
  });
  if (error) return { error: error.code === "22023" ? error.message : fr.errors.generic, values };
  const { data } = await supabase.auth.refreshSession();
  const home = homePathForRole(roleFromAppMetadata(data.user?.app_metadata));
  redirect(safeRedirectPath(next, home) as Route);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  // Session courante uniquement : ne déconnecte pas les autres appareils (app mobile).
  await supabase.auth.signOut({ scope: "local" });
  redirect("/");
}
