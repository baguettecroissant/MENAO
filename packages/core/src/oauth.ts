/**
 * Connexion avec Google ou Apple, pour les clients (ADR 0108). Les fournisseurs s'activent par
 * configuration (NEXT_PUBLIC_OAUTH_PROVIDERS sur le site, EXPO_PUBLIC_OAUTH_PROVIDERS dans
 * l'application) une fois configurés dans Supabase : liste vide, aucun bouton.
 */
export const OAUTH_PROVIDERS = ["google", "apple"] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export function isOAuthProvider(value: unknown): value is OAuthProvider {
  return typeof value === "string" && (OAUTH_PROVIDERS as readonly string[]).includes(value);
}

/** « apple, Google » → fournisseurs connus, dans l'ordre d'affichage (Google puis Apple). */
export function enabledOAuthProviders(value: string | undefined): OAuthProvider[] {
  const wanted = new Set((value ?? "").split(",").map((v) => v.trim().toLowerCase()));
  return OAUTH_PROVIDERS.filter((provider) => wanted.has(provider));
}

/**
 * Compte Google ou Apple dont l'inscription reste à finaliser (acceptation des CGU), d'après
 * app_metadata : marqueur posé par la base, retiré par complete_oauth_signup.
 */
export function signupPending(appMetadata: unknown): boolean {
  return (
    typeof appMetadata === "object" &&
    appMetadata !== null &&
    (appMetadata as Record<string, unknown>).signup_pending === true
  );
}
