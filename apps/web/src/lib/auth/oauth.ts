import "server-only";
import { enabledOAuthProviders, type OAuthProvider } from "@menao/core";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { env } from "@/env";
import { createClient } from "@/lib/supabase/server";
import { confirmUrlFor } from "./confirm-url";

/** Fournisseurs affichés (configuration du déploiement). */
export const oauthProviders: OAuthProvider[] = enabledOAuthProviders(
  env.NEXT_PUBLIC_OAUTH_PROVIDERS,
);

/**
 * Connexion avec Google ou Apple (ADR 0108) : redirection vers le fournisseur, retour sur
 * /auth/confirm (échange du code, puis « Finaliser mon compte » pour un nouveau compte), puis
 * `next`, ou l'accueil du rôle. Le vérificateur PKCE est gardé dans un cookie de session.
 */
export async function redirectToProvider(
  provider: OAuthProvider,
  next: string | null,
): Promise<never> {
  if (!oauthProviders.includes(provider)) redirect("/connexion?erreur=oauth");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: next ? confirmUrlFor(next) : `${env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
      // Apple : nom et adresse demandés à la première connexion.
      ...(provider === "apple" ? { scopes: "name email" } : {}),
    },
  });
  if (error || !data.url) redirect("/connexion?erreur=oauth");
  redirect(data.url as Route);
}
