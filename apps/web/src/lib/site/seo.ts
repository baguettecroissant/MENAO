import { env } from "@/env";

export const SITE_URL = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

/**
 * Indexation par les moteurs de recherche : fermée par défaut (staging, aperçus Vercel), ouverte
 * seulement en production avec ALLOW_INDEXING=true (lu au build).
 */
export const indexingAllowed = process.env.ALLOW_INDEXING === "true";

export const absoluteUrl = (path: string) =>
  `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/** Pages publiques statiques référencées dans le sitemap. */
export const STATIC_PAGES = [
  "/",
  "/comment-ca-marche",
  "/garanties",
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
