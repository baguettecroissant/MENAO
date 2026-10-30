import { colors } from "@menao/ui-tokens";
import type { MetadataRoute } from "next";
import { fr } from "@/i18n/fr";

// Fichier statique, généré au build (spec §4.4) : aucune fonction appelée.
export const dynamic = "force-static";

/**
 * Manifeste de l'espace commercial (ADR 0211) : ajouté à l'écran d'accueil depuis /commercial, il
 * s'ouvre directement sur l'espace, en plein écran. Portée « / » : connexion, page d'attente et
 * démo restent dans la même fenêtre. Le reste du site garde le manifeste général (manifest.ts).
 */
export function GET() {
  const manifest: MetadataRoute.Manifest = {
    id: "/commercial",
    name: fr.commercialSpace.homeScreen.name,
    short_name: fr.meta.name,
    lang: "fr",
    start_url: "/commercial",
    scope: "/",
    display: "standalone",
    background_color: colors.background,
    theme_color: colors.primary,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return Response.json(manifest, {
    headers: { "content-type": "application/manifest+json" },
  });
}
