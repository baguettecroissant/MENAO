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
  // Liens partenaires (F-59) : simples redirections.
  "/p/",
  // Espace partenaire par lien privé (ADR 0139) : jamais exploré, en plus du noindex de la page.
  "/espace-partenaire/",
  // Espace commercial (ADR 0205) : réservé aux comptes commerciaux.
  "/commercial",
] as const;

export const absoluteUrl = (path: string) =>
  `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/** Pages publiques statiques référencées dans le sitemap. */
/**
 * Seuil d'indexation des pages métier × ville (ADR 0134, 0268) : en dessous, la page reste utile
 * mais n'est ni indexée ni dans le plan du site. Validé à 1 le 9 novembre 2026 ; à relever avec
 * le nombre d'artisans.
 */
export const CITY_INDEX_MIN_ARTISANS = 1;

export const STATIC_PAGES = [
  "/",
  "/comment-ca-marche",
  "/garanties",
  "/a-propos",
  // Pages carrefour (ADR 0264).
  "/metiers",
  "/villes",
  "/partenaires",
  "/pro",
  "/pro/formules",
  // Pages par fonction (ADR 0267).
  "/pro/logiciel-devis",
  "/pro/secretaire-telephonique",
  "/pro/acompte-en-ligne",
  "/pro/facturation",
  "/pro/faq",
  "/faq",
  "/contact",
  "/criteres-de-classement",
  "/mentions-legales",
  "/cgu",
  "/cgv-artisans",
  "/confidentialite",
  "/cookies",
] as const;
