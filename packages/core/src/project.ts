/** Projet de travaux d'un particulier (F-05 à F-07). */

export const LIEU_TYPES = ["appartement", "maison", "jardin", "entreprise"] as const;
export type LieuType = (typeof LIEU_TYPES)[number];

/** Tranches de surface de la spec : < 10, 10–20, 20–50, > 50 m². */
export const SURFACE_TRANCHES = ["moins_10", "10_20", "20_50", "plus_50"] as const;
export type SurfaceTranche = (typeof SURFACE_TRANCHES)[number];

export const DATE_SOUHAIT_MODES = ["des_que_possible", "date", "inconnue"] as const;
export type DateSouhaitMode = (typeof DATE_SOUHAIT_MODES)[number];

export const PROJECT_TEXT_MAX_LENGTH = 5000;
export const MAX_PROJECT_PHOTOS = 10;
/** Durée maximale d'une dictée (F-05 côté particulier ; F-19 : 2 min côté artisan). */
export const MAX_DICTATION_SECONDS = 120;

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
// Numéros français (0X XX XX XX XX, +33…, 0033…) et internationaux (+CC suivi de 6 à 14 chiffres).
const PHONE = /(?:\+|00)\d{1,3}[\s.-]?\d(?:[\s.-]?\d{2}){3,6}|\b0[1-9](?:[\s.-]?\d{2}){4}\b/g;

/**
 * Retire e-mails et numéros de téléphone d'un texte avant de l'envoyer à l'IA ou de le
 * journaliser (spec F-06, CLAUDE.md règle 11).
 */
export function scrubPersonalData(text: string): string {
  return text.replace(EMAIL, "[e-mail]").replace(PHONE, "[téléphone]");
}

/** Niveau de détail de la description, pour l'aide contextuelle sous le champ (F-05). */
export function needHelpLevel(text: string): "vide" | "insuffisant" | "suffisant" {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return "vide";
  return words < 12 ? "insuffisant" : "suffisant";
}

/** F-07 : la recherche d'artisans exige au moins un métier et une ville. */
export function canSearchArtisans(p: {
  tradeCode: string | null;
  villeCodeInsee: string | null;
}): boolean {
  return Boolean(p.tradeCode && p.villeCodeInsee);
}
