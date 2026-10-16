import {
  LEGAL_DOCUMENT_VERSIONS,
  SIGNUP_REQUIRED_DOCUMENTS,
  signupPending,
  type OAuthProvider,
} from "@menao/core";
import type { CompleteSignup } from "@menao/validation";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { fr } from "@/i18n/fr";
import { sessionFromCallbackUrl } from "./oauth-url";
import { supabase } from "./supabase";

export type OAuthOutcome =
  | { status: "connecte"; pending: boolean }
  | { status: "annule" }
  | { status: "erreur"; message: string };

/**
 * « Continuer avec Google / Apple » (ADR 0108), comme sur le site : la page du fournisseur
 * s'ouvre dans la fenêtre sécurisée du téléphone, puis Supabase rouvre l'application
 * (`menao://auth/callback`, ou l'adresse d'Expo Go en développement) avec la session.
 * `pending` : nouveau compte, à finaliser (CGU) avant d'aller plus loin.
 */
export async function signInWithProvider(provider: OAuthProvider): Promise<OAuthOutcome> {
  const redirectTo = Linking.createURL("auth/callback");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      // Apple : nom et adresse demandés à la première connexion.
      ...(provider === "apple" ? { scopes: "name email" } : {}),
    },
  });
  if (error || !data.url) return { status: "erreur", message: fr.oauth.error };
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") return { status: "annule" };
  const callback = sessionFromCallbackUrl(result.url);
  if (!callback.ok) {
    return callback.cancelled
      ? { status: "annule" }
      : { status: "erreur", message: fr.oauth.error };
  }
  const { data: session, error: sessionError } = await supabase.auth.setSession(callback.tokens);
  if (sessionError || !session.user) return { status: "erreur", message: fr.oauth.error };
  return { status: "connecte", pending: signupPending(session.user.app_metadata) };
}

export type SignupProfile = {
  firstName: string;
  lastName: string;
  email: string | null;
  provider: string;
};

/** Nom repris du fournisseur, pour préremplir « Finaliser mon compte ». */
export async function loadSignupProfile(): Promise<SignupProfile | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("user_id", data.user.id)
    .maybeSingle();
  return {
    firstName: profile?.first_name ?? "",
    lastName: profile?.last_name ?? "",
    email: data.user.email ?? null,
    provider: data.user.app_metadata.provider === "apple" ? "Apple" : "Google",
  };
}

/**
 * « Finaliser mon compte » : nom, téléphone, CGU et politique de confidentialité (versions en
 * vigueur), newsletters (complete_oauth_signup), puis jeton rafraîchi sans le marqueur.
 * Renvoie le message d'erreur, ou null.
 */
export async function completeOAuthSignup(input: CompleteSignup): Promise<string | null> {
  const { error } = await supabase.rpc("complete_oauth_signup", {
    p_first_name: input.firstName,
    p_last_name: input.lastName,
    p_phone: input.phone ?? "",
    p_marketing_opt_in: input.marketingOptIn,
    p_legal: Object.fromEntries(
      SIGNUP_REQUIRED_DOCUMENTS.map((doc) => [doc, LEGAL_DOCUMENT_VERSIONS[doc]]),
    ),
  });
  if (error) return error.code === "22023" ? error.message : fr.errors.generic;
  await supabase.auth.refreshSession();
  return null;
}
