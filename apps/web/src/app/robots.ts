import type { MetadataRoute } from "next";
import {
  AI_CRAWLERS,
  PRIVATE_PATHS,
  SITE_URL,
  indexingAllowed,
  prelaunchIndexing,
} from "@/lib/site/seo";

/**
 * robots.txt (F-02, ADR 0134) : espaces privés jamais explorés ; robots des IA autorisés sur le
 * site public ; hors production, tout est fermé. En pré-lancement, seule la page d'attente (« / »)
 * est ouverte : Google retient la règle la plus précise, « Allow: /$ ».
 */
export default function robots(): MetadataRoute.Robots {
  if (prelaunchIndexing) return { rules: { userAgent: "*", allow: "/$", disallow: "/" } };
  if (!indexingAllowed) return { rules: { userAgent: "*", disallow: "/" } };
  const rule = { allow: "/", disallow: [...PRIVATE_PATHS] };
  return {
    rules: [
      { userAgent: "*", ...rule },
      // Groupe explicite : un robot nommé ignore le groupe « * », d'où les mêmes exclusions.
      { userAgent: [...AI_CRAWLERS], ...rule },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
