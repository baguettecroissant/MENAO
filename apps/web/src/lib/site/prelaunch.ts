import { createHash } from "node:crypto";
// Chemin relatif : ce fichier est lu par next.config, hors de la compilation de l'application.
import { SITE_OPEN } from "../../../../../packages/core/src/launch";
import { COMMERCIAL_DEMO_COOKIE } from "../commercial/demo-cookie";

/**
 * Mode pré-lancement (ADR 0101) : tant que PRELAUNCH_ACCESS_CODE est défini au build, toute adresse
 * du site affiche la page d'attente, sauf pour qui a saisi le code (cookie de 30 jours). Le filtre
 * est une réécriture de next.config : aucune fonction n'est déclenchée pour les visiteurs, et les
 * pages restent statiques (spec §4.4). Le mode se retire en supprimant la variable, puis en redéployant.
 * Depuis l'ouverture de la vitrine (ADR 0387), `SITE_OPEN` le désactive même si la variable reste.
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
  // Santé du service (ADR 0159) : interrogée par l'outil de surveillance externe.
  "sante",
  // Espace partenaire par lien privé (ADR 0139) : utilisable avant le lancement.
  "espace-partenaire",
  // Bannières du kit (ADR 0141) : aperçus de l'espace partenaire et images déjà collées.
  "bannieres",
  // Badge des artisans (ADR 0144) : image déjà collée sur leur site.
  "badge",
  // Recrutement des conseillers (ADR 0380) : page et réservation ouvertes avant le lancement.
  "devenir-conseiller",
  // Pages intégrées à l'application (ADR 0235) : ouvertes sans cookie, la session vient de l'appli.
  "appli",
  "\\.well-known",
  "favicon\\.ico",
  "icon\\.svg",
  "apple-icon\\.png",
  "manifest\\.webmanifest",
  // Manifeste de l'espace commercial (ADR 0211) : lu par le téléphone sans cookie.
  "commercial\\.webmanifest",
  "robots\\.txt",
  // Texte de référence de l'assistant des pages Pro (ADR 0218) : lu par l'Edge Function, sans cookie.
  "assistant-pro\\.txt",
  // Texte de référence de l'assistant des particuliers (ADR 0220), lu de la même façon.
  "assistant-particulier\\.txt",
];

// Démo de l'espace commercial (ADR 0344) : le lien est toujours servi ; l'espace commercial et la
// démo artisan, avec le cookie de la démo (sa clé est revérifiée par chaque page) ou le code.
const DEMO_LINK = "commercial/demo";
const DEMO_PAGES = ["commercial", "pro/decouvrir"];

/** Réécritures « beforeFiles » de next.config : aucune si le mode est désactivé. */
export function prelaunchRewrites(code: string | undefined) {
  if (!code || SITE_OPEN) return [];
  const access = { type: "cookie" as const, key: PRELAUNCH_COOKIE, value: prelaunchToken(code) };
  const missing = [access];
  const demo = { type: "cookie" as const, key: COMMERCIAL_DEMO_COOKIE };
  const open = [...OPEN, DEMO_LINK, ...DEMO_PAGES];
  return [
    { source: "/", missing, destination: PRELAUNCH_PAGE },
    { source: `/:path((?!(?:${open.join("|")})(?:/|$)).+)`, missing, destination: PRELAUNCH_PAGE },
    // Pages de la démo : fermées sans le code ni le cookie de la démo (lien de démo exclu).
    {
      source: `/:path((?:commercial(?!/demo(?:/|$))|pro/decouvrir)(?:/.*)?)`,
      missing: [access, demo],
      destination: PRELAUNCH_PAGE,
    },
  ];
}
