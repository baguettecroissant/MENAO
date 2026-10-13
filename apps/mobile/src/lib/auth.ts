import { authErrorKind, LEGAL_DOCUMENT_VERSIONS, SIGNUP_REQUIRED_DOCUMENTS } from "@menao/core";
import type { SignIn, SignUp } from "@menao/validation";
import { fr } from "@/i18n/fr";
import { supabase } from "./supabase";

/**
 * Inscription d'un particulier, comme sur le site : mêmes métadonnées, lues par le trigger
 * app.after_auth_user_insert (profil, acceptation des documents légaux). Jamais de rôle ici : il
 * vit dans app_metadata, fixé côté base. Renvoie le message d'erreur, ou null.
 */
export async function signUpParticulier(
  input: SignUp,
  emailRedirectTo: string,
): Promise<string | null> {
  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo,
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
  return error ? fr.errors[authErrorKind(error.code)] : null;
}

/** Connexion par e-mail et mot de passe. Renvoie le message d'erreur, ou null. */
export async function signIn(input: SignIn) {
  const { data, error } = await supabase.auth.signInWithPassword(input);
  return error
    ? { error: fr.errors[authErrorKind(error.code)], user: null }
    : { error: null, user: data.user };
}
