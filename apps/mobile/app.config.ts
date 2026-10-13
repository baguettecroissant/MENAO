import type { ExpoConfig } from "expo/config";

/**
 * Application native MENAO (phase 6, ADR 0054) : une seule app pour les particuliers et les
 * artisans, l'espace dépend du rôle. Identifiant des stores à confirmer avant la publication.
 */
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
};

export default config;
