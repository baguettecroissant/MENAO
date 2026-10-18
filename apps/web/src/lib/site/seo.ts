import { env } from "@/env";

export const SITE_URL = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

/**
 * Indexation par les moteurs de recherche : fermée par défaut (staging, aperçus Vercel), ouverte
 * seulement en production avec ALLOW_INDEXING=true (lu au build).
 */
export const indexingAllowed = process.env.ALLOW_INDEXING === "true";

/**
 * Pré-lancement en production (ADR 0101) : seule la page d'attente est indexable, pour que Google
 * connaisse la marque MENAO avant l'ouverture (ADR 0134). Jamais sur les aperçus ni sur staging.
 */
export const prelaunchIndexing =
  !indexingAllowed &&
  Boolean(process.env.PRELAUNCH_ACCESS_CODE) &&
  process.env.VERCEL_ENV === "production";

/**
 * Robots des moteurs de réponse et des assistants IA (ADR 0134) : autorisés sur le site public,
 * avec les mêmes exclusions que les moteurs de recherche, pour que MENAO puisse être cité.
 */
export const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bytespider",
  "CCBot",
  "Amazonbot",
  "meta-externalagent",
  "MistralAI-User",
  "DuckAssistBot",
] as const;

/** Espaces privés et pages techniques : jamais explorés. */
export const PRIVATE_PATHS = [
  "/recherche/",
  "/mon-espace",
  "/pro/onboarding",
  "/pro/demandes",
  "/admin",
  "/auth/",
  "/connexion",
  "/calendrier/",
] as const;

export const absoluteUrl = (path: string) =>
  `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/** Pages publiques statiques référencées dans le sitemap. */
export const STATIC_PAGES = [
  "/",
  "/comment-ca-marche",
  "/garanties",
  "/a-propos",
  "/pro",
  "/faq",
  "/contact",
  "/criteres-de-classement",
  "/mentions-legales",
  "/cgu",
  "/cgv-artisans",
  "/confidentialite",
  "/cookies",
] as const;
