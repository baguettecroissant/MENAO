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

/** Demande d'accès au micro sur iPhone (dictée du projet). */
const MICROPHONE_PERMISSION =
  "MENAO utilise le micro pour dicter la description de votre projet, qui est ensuite transcrite en texte.";

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
    // « Se connecter avec Apple » (ADR 0108) : fr.menao.app est l'identifiant principal du Services ID
    // du site. Déclaré ici, EAS garde la fonction activée chez Apple au lieu de tenter de la retirer
    // (refusé par Apple, et le bouton cesserait de fonctionner).
    usesAppleSignIn: true,
    infoPlist: {
      // Chiffrement standard seulement (HTTPS, trousseau de l'iPhone) : exempté des règles
      // d'exportation, aucune déclaration à chaque build ni à la soumission.
      ITSAppUsesNonExemptEncryption: false,
    },
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
      // d'accès sur iPhone (le micro sert à la dictée, jamais aux vidéos).
      "expo-image-picker",
      {
        photosPermission:
          "MENAO accède à vos photos pour les joindre au suivi de vos chantiers, à vos messages et à vos signalements.",
        cameraPermission:
          "MENAO utilise l'appareil photo pour photographier vos chantiers et joindre ces photos au suivi, à vos messages ou à vos signalements.",
        // Même texte que la dictée : le micro sert à dicter le projet, jamais aux vidéos.
        microphonePermission: MICROPHONE_PERMISSION,
      },
    ],
    [
      // Dictée du projet (F-05, ADR 0081) : capture du micro en PCM, iPhone et Android.
      "expo-audio",
      // Ni lecture ni enregistrement en arrière-plan : pas de mode audio permanent sur iPhone ni de
      // service au premier plan sur Android.
      {
        microphonePermission: MICROPHONE_PERMISSION,
        recordAudioAndroid: true,
        enableBackgroundPlayback: false,
        enableBackgroundRecording: false,
      },
    ],
    [
      // Notifications push (F-41, ADR 0079) : couleur sur Android ; environnement APNs de
      // production pour les versions distribuées (preview, production), de test sinon.
      "expo-notifications",
      {
        // Icône de la barre d'état Android : logo blanc sur fond transparent (96 × 96, ADR 0097).
        icon: "./assets/notification-icon.png",
        color: "#4869f6",
        mode:
          process.env.EAS_BUILD_PROFILE && process.env.EAS_BUILD_PROFILE !== "development"
            ? "production"
            : "development",
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
