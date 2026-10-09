"use server";

import { LEGAL_DOCUMENT_VERSIONS, SIGNUP_REQUIRED_DOCUMENTS } from "@menao/core";
import { magicLinkSchema, safeRedirectPath, signInSchema, signUpSchema } from "@menao/validation";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/env";
import { fr } from "@/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import { authErrorMessage } from "./errors";
import { checkbox, text, type FormState } from "./form";

const confirmUrl = `${env.NEXT_PUBLIC_SITE_URL}/auth/confirm`;

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
      emailRedirectTo: confirmUrl,
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

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { email: text(formData, "email") ?? "" };
  const parsed = signInSchema.safeParse({ ...values, password: text(formData, "password") ?? "" });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: authErrorMessage(error), values };

  redirect(safeRedirectPath(text(formData, "next")) as Route);
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

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  // Session courante uniquement : ne déconnecte pas les autres appareils (app mobile).
  await supabase.auth.signOut({ scope: "local" });
  redirect("/");
}
