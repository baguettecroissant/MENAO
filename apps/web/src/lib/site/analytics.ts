import { PRODUCTION_SITE_URLS, SITE_URL } from "./seo";

/**
 * Mesure d'audience Umami Cloud, région UE (F-189, ADR 0388) : sans cookie, sans donnée
 * personnelle (CLAUDE.md règle 11), sur le site public seulement. L'identifiant du site n'est pas
 * un secret : il figure dans chaque page.
 */
export const UMAMI_WEBSITE_ID: string | null = "2e14ebef-45f9-4683-bc59-6a503c3ca7db";
export const UMAMI_SCRIPT_URL = "https://cloud.umami.is/script.js";

/** Production de menao.fr uniquement : ni aperçus, ni staging, ni développement. */
export const analyticsEnabled =
  UMAMI_WEBSITE_ID !== null &&
  process.env.VERCEL_ENV === "production" &&
  PRODUCTION_SITE_URLS.includes(SITE_URL);
