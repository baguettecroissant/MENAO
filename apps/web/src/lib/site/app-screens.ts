/**
 * Écrans réels de l'application (natifs et web), capturés avec des personnes et des données
 * fictives, pour les mockups du site (ADR 0147). WebP précompressés dans public/images/app, sans
 * optimisation Vercel. `top` et `bottom` prolongent l'écran sous la barre d'état et l'indicateur
 * d'accueil du téléphone ; `darkTop` : barre d'état en texte blanc.
 */
export type AppScreen = { src: string; top: string; bottom: string; darkTop?: boolean };

const BEIGE = "#f8f7f1";

export const APP_SCREENS = {
  clientAccueil: {
    src: "/images/app/client-accueil.webp",
    top: "#4869f6",
    bottom: "#ffffff",
    darkTop: true,
  },
  clientRecherche: { src: "/images/app/client-recherche.webp", top: BEIGE, bottom: BEIGE },
  clientArtisans: { src: "/images/app/client-artisans.webp", top: "#ffffff", bottom: "#ffffff" },
  clientFiche: { src: "/images/app/client-fiche.webp", top: BEIGE, bottom: BEIGE },
  clientRdv: { src: "/images/app/client-rdv.webp", top: BEIGE, bottom: BEIGE },
  clientDevis: { src: "/images/app/client-devis.webp", top: BEIGE, bottom: "#ffffff" },
  clientAcompte: { src: "/images/app/client-acompte.webp", top: "#ffffff", bottom: BEIGE },
  clientSuivi: { src: "/images/app/client-suivi.webp", top: BEIGE, bottom: BEIGE },
  clientAvis: { src: "/images/app/client-avis.webp", top: "#486af7", bottom: BEIGE, darkTop: true },
  proAccueil: { src: "/images/app/pro-accueil.webp", top: BEIGE, bottom: "#ffffff" },
} satisfies Record<string, AppScreen>;

export type AppScreenKey = keyof typeof APP_SCREENS;

/** Écran web (ordinateur), 1 600 × 1 000. */
export const WEB_SCREENS = { pro: "/images/app/web-pro.webp" } as const;
