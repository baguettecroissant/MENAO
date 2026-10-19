import { createHash } from "node:crypto";

/**
 * Mode pré-lancement (ADR 0101) : tant que PRELAUNCH_ACCESS_CODE est défini au build, toute adresse
 * du site affiche la page d'attente, sauf pour qui a saisi le code (cookie de 30 jours). Le filtre
 * est une réécriture de next.config : aucune fonction n'est déclenchée pour les visiteurs, et les
 * pages restent statiques (spec §4.4). Le mode se retire en supprimant la variable, puis en redéployant.
 */
export const PRELAUNCH_COOKIE = "menao_acces";
export const PRELAUNCH_PAGE = "/bientot";
export const PRELAUNCH_MAX_AGE = 60 * 60 * 24 * 30;

/** Valeur du cookie : empreinte du code, qui change avec lui (les anciens accès tombent). */
export function prelaunchToken(code: string): string {
  return createHash("sha256").update(`menao-acces:${code}`).digest("hex");
}

// Toujours servis : page d'attente, fichiers statiques et icônes, flux d'agenda (lus par les
// calendriers, sans cookie), vérifications de domaine.
const OPEN = [
  "bientot",
  "_next",
  "images",
  "videos",
  "icons",
  "calendrier",
  // Espace partenaire par lien privé (ADR 0139) : utilisable avant le lancement.
  "espace-partenaire",
  // Bannières du kit (ADR 0141) : aperçus de l'espace partenaire et images déjà collées.
  "bannieres",
  // Badge des artisans (ADR 0144) : image déjà collée sur leur site.
  "badge",
  "\\.well-known",
  "favicon\\.ico",
  "icon\\.svg",
  "apple-icon\\.png",
  "manifest\\.webmanifest",
  "robots\\.txt",
];

/** Réécritures « beforeFiles » de next.config : aucune si le mode est désactivé. */
export function prelaunchRewrites(code: string | undefined) {
  if (!code) return [];
  const missing = [{ type: "cookie" as const, key: PRELAUNCH_COOKIE, value: prelaunchToken(code) }];
  return [
    { source: "/", missing, destination: PRELAUNCH_PAGE },
    { source: `/:path((?!(?:${OPEN.join("|")})(?:/|$)).+)`, missing, destination: PRELAUNCH_PAGE },
  ];
}
