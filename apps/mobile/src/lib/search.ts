/** Longueur maximale d'une description de projet, comme sur le site. */
export const MAX_DESCRIPTION_LENGTH = 5000;

/**
 * Adresse de la recherche du site, pré-remplie avec la description et le métier (mêmes
 * paramètres que l'accueil du site : `q` et `metier`). Étape provisoire : la recherche native
 * (analyse, critères, artisans) la remplacera (ADR 0055).
 */
export function webSearchUrl(siteUrl: string, description: string, trade?: string | null): string {
  const params = new URLSearchParams();
  const text = description.trim().slice(0, MAX_DESCRIPTION_LENGTH);
  if (text) params.set("q", text);
  if (trade) params.set("metier", trade);
  const query = params.toString();
  return `${siteUrl}/recherche${query ? `?${query}` : ""}`;
}
