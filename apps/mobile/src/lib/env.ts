import { enabledOAuthProviders } from "@menao/core";

/** Variables publiques de l'application (fichier .env, préfixe EXPO_PUBLIC_, jamais de secret). */
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  siteUrl: process.env.EXPO_PUBLIC_SITE_URL ?? "https://menao.fr",
};

export const isConfigured = Boolean(env.supabaseUrl && env.supabaseKey);

/**
 * Connexion avec Google ou Apple (« google,apple », ADR 0108) : vide tant que les fournisseurs ne
 * sont pas configurés dans Supabase, aucun bouton.
 */
export const oauthProviders = enabledOAuthProviders(process.env.EXPO_PUBLIC_OAUTH_PROVIDERS);

/** Lien des e-mails d'authentification, ouvert sur le site (même forme que le site : `?next=`). */
const confirmUrl = (next: string) => `${env.siteUrl}/auth/confirm?next=${encodeURIComponent(next)}`;

/**
 * Lien de confirmation d'une inscription faite au moment de la demande (F-08) : il ouvre la page
 * d'envoi du site, qui rattache le projet au compte grâce au jeton (mêmes paramètres que le site).
 */
export function requestConfirmUrl(projectId: string, artisanIds: string[], token: string): string {
  const params = new URLSearchParams();
  for (const id of artisanIds) params.append("artisan", id);
  params.set("transfert", token);
  return confirmUrl(`/recherche/${projectId}/envoyer?${params}`);
}

/** Pages du site ouvertes depuis l'application. */
export const siteLinks = {
  terms: `${env.siteUrl}/cgu`,
  privacy: `${env.siteUrl}/confidentialite`,
  cgvArtisans: `${env.siteUrl}/cgv-artisans`,
  faq: `${env.siteUrl}/faq`,
  contact: `${env.siteUrl}/contact`,
  resetPassword: confirmUrl("/nouveau-mot-de-passe"),
  emailConfirmed: confirmUrl("/mon-espace"),
  /** Changement d'adresse e-mail : chaque lien se confirme sur la page « Mon compte » du site. */
  emailChanged: confirmUrl("/compte?email=confirme"),
};

/** Conditions des prestataires, à lire avant de signer (mêmes liens que le site). */
export const providerLinks = {
  docusealTerms: "https://www.docuseal.com/terms",
};
