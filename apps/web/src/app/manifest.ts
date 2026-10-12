import { colors } from "@menao/ui-tokens";
import type { MetadataRoute } from "next";
import { fr } from "@/i18n/fr";

/**
 * Manifeste web : nom, couleurs et icônes de MENAO quand le site est ajouté à l'écran d'accueil.
 * Affichage « browser » : le site garde la barre du navigateur (paiements, liens reçus par e-mail),
 * l'application native viendra avec Expo.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: fr.meta.title,
    short_name: fr.meta.name,
    description: fr.meta.description,
    lang: "fr",
    start_url: "/",
    display: "browser",
    background_color: colors.background,
    theme_color: colors.primary,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
