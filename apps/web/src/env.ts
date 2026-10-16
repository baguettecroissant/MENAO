import { z } from "zod";

/**
 * Variables d'environnement publiques, validées au démarrage.
 * Les références `process.env.NEXT_PUBLIC_*` doivent rester explicites pour être
 * injectées au build par Next.js.
 */
const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SENTRY_DSN: z
    .url()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  // Fiches de l'application dans les stores : vides tant qu'elle n'est pas publiée (fenêtre
  // « depuis votre poche » masquée, /application renvoie à l'accueil).
  NEXT_PUBLIC_APP_STORE_URL: z
    .url()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  NEXT_PUBLIC_PLAY_STORE_URL: z
    .url()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  // Connexion avec Google ou Apple (« google,apple ») : vide tant que les fournisseurs ne sont pas
  // configurés dans Supabase, aucun bouton (ADR 0108).
  NEXT_PUBLIC_OAUTH_PROVIDERS: z.string().optional(),
});

export const env = schema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_APP_STORE_URL: process.env.NEXT_PUBLIC_APP_STORE_URL,
  NEXT_PUBLIC_PLAY_STORE_URL: process.env.NEXT_PUBLIC_PLAY_STORE_URL,
  NEXT_PUBLIC_OAUTH_PROVIDERS: process.env.NEXT_PUBLIC_OAUTH_PROVIDERS,
});
