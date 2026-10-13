import type { ExpoConfig } from "expo/config";

/**
 * Application native MENAO (phase 6, ADR 0054) : une seule app pour les particuliers et les
 * artisans, l'espace dépend du rôle. Identifiant des stores à confirmer avant la publication.
 */
/**
 * Projet Expo (expo.dev) de l'application : Expo Go n'ouvre que les projets rattachés à un compte.
 * L'identifiant est lu dans le fichier .env, hors du dépôt public.
 */
const easProjectId = process.env.EAS_PROJECT_ID;

const config: ExpoConfig = {
  name: "MENAO",
  slug: "menao",
  scheme: "menao",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  ios: {
    bundleIdentifier: "fr.menao.app",
    supportsTablet: false,
  },
  android: {
    package: "fr.menao.app",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#4869f6",
    },
  },
  web: {
    bundler: "metro",
    output: "single",
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-font",
    [
      // Photos du journal, des messages et des signalements (ADR 0069) : textes des demandes
      // d'accès sur iPhone ; pas de vidéo, donc pas d'accès au micro.
      "expo-image-picker",
      {
        photosPermission:
          "MENAO accède à vos photos pour les joindre au suivi de vos chantiers, à vos messages et à vos signalements.",
        cameraPermission:
          "MENAO utilise l'appareil photo pour photographier vos chantiers et joindre ces photos au suivi, à vos messages ou à vos signalements.",
        microphonePermission: false,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        imageWidth: 160,
        resizeMode: "contain",
        backgroundColor: "#4869f6",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  ...(easProjectId ? { extra: { eas: { projectId: easProjectId } } } : {}),
};

export default config;
