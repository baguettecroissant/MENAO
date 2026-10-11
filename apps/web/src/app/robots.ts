import type { MetadataRoute } from "next";
import { SITE_URL, indexingAllowed } from "@/lib/site/seo";

/** robots.txt (F-02) : espaces privés jamais explorés ; tout est fermé hors production. */
export default function robots(): MetadataRoute.Robots {
  if (!indexingAllowed) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/recherche/",
        "/mon-espace",
        "/pro/onboarding",
        "/pro/demandes",
        "/admin",
        "/auth/",
        "/connexion",
        "/calendrier/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
