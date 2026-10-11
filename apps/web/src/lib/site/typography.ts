// Espace insécable (U+00A0), écrite par son code pour rester visible dans le source.
const NBSP = String.fromCharCode(0xa0);

/**
 * Typographie française pour les titres du site : espace insécable avant « ? ! : ; » et à
 * l'intérieur des guillemets, pour qu'aucune ligne ne commence par une ponctuation.
 */
export function frenchSpacing(text: string): string {
  return text.replace(/ ([?!:;»])/g, `${NBSP}$1`).replace(/« /g, `«${NBSP}`);
}
