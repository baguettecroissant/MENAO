/**
 * Image de la fiche d'un artisan (ADR 0355, 0357) : quand c'est un logo, son fichier porte un
 * préfixe. Tous les écrans qui montrent l'image (listes, messages, menus) reconnaissent ainsi un
 * logo à son seul chemin, sans colonne de plus dans chaque requête, et le montrent en entier au
 * lieu de le rogner en rond. Sans import : utilisé par les Edge Functions.
 */
export const LOGO_IMAGE_PREFIX = "logo-";

/** Nom de fichier d'un logo utilisé comme image de la fiche. */
export function logoImageName(fileName: string): string {
  return `${LOGO_IMAGE_PREFIX}${fileName}`;
}

/** Vrai si ce chemin de stockage, ou cette adresse publique, désigne un logo. */
export function isLogoImagePath(path: string | null | undefined): boolean {
  if (!path) return false;
  const file = path.split(/[?#]/)[0]?.split("/").pop() ?? "";
  return file.startsWith(LOGO_IMAGE_PREFIX);
}
