/**
 * Contrôle aléatoire des dossiers (ADR 0121), demandé par le cahier des charges « Inscription et
 * vérification des artisans » : chaque mois, revérification de 5 % des artisans validés (appel à
 * l'assureur en cas de doute). Le tirage est fait par la base (app.draw_spot_checks).
 */

/** Part des artisans validés contrôlée chaque mois (miroir de app.spot_check_target). */
export const SPOT_CHECK_RATE = 0.05;

/** Nombre de dossiers à contrôler dans le mois : 5 % arrondis au supérieur, 1 au moins. */
export function spotCheckTarget(validatedArtisans: number): number {
  if (validatedArtisans <= 0) return 0;
  return Math.ceil(validatedArtisans * SPOT_CHECK_RATE);
}

/** Mois d'un contrôle (premier jour, AAAA-MM-01), d'après une date AAAA-MM-JJ (Paris). */
export function spotCheckPeriod(parisDay: string): string {
  return `${parisDay.slice(0, 7)}-01`;
}
