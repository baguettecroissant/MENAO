import { encodeLotSelection, type LotSelection } from "@menao/validation";

/**
 * Page d'envoi de la demande, avec les artisans choisis (et le jeton de transfert éventuel). Un
 * chantier à plusieurs métiers ajoute ceux des lots (`lot=<lot>.<artisan>`, ADR 0170).
 */
export function sendPagePath(
  projectId: string,
  artisanIds: string[],
  token?: string,
  lots: LotSelection = [],
): string {
  const params = new URLSearchParams();
  for (const id of artisanIds) params.append("artisan", id);
  for (const value of encodeLotSelection(lots)) params.append("lot", value);
  if (token) params.set("transfert", token);
  return `/recherche/${projectId}/envoyer?${params}`;
}

/**
 * « Redemander un devis » (F-12, ADR 0040) : recherche pour un artisan d'un chantier précédent,
 * depuis l'espace client (ADR 0042).
 * Le nom ne sert qu'au bandeau ; analyze-need vérifie le chantier commun.
 */
export function rehirePath(artisanId: string, chantierId: string, artisanName: string): string {
  const params = new URLSearchParams({ artisan: artisanId, depuis: chantierId, nom: artisanName });
  return `/mon-espace/nouvelle-demande?${params}`;
}
