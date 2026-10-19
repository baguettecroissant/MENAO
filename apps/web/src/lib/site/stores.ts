import { env } from "@/env";

/**
 * Fiches de l'application dans les stores (ADR 0150), affichées sur le site avant même la
 * publication, à la demande de l'utilisateur : elles répondent dès que l'application est en ligne.
 * NEXT_PUBLIC_APP_STORE_URL et NEXT_PUBLIC_PLAY_STORE_URL les remplacent au besoin.
 */
export const APP_STORE_URL =
  env.NEXT_PUBLIC_APP_STORE_URL ?? "https://apps.apple.com/fr/app/id6823851192";
export const PLAY_STORE_URL =
  env.NEXT_PUBLIC_PLAY_STORE_URL ?? "https://play.google.com/store/apps/details?id=fr.menao.app";

/**
 * Badges officiels, sans modification (règles d'Apple et de Google), dans public/images/stores.
 * Le PNG de Google a une marge transparente en haut et en bas (29 px sur 250) : à hauteur égale de
 * badge visible, il est affiché plus haut, avec une marge négative.
 */
export const STORE_BADGES = {
  appStore: { src: "/images/stores/app-store-fr.svg", width: 127, height: 40 },
  playStore: { src: "/images/stores/google-play-fr.png", width: 135, height: 52 },
} as const;
