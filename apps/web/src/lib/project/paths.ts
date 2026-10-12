/** Page d'envoi de la demande, avec les artisans choisis (et le jeton de transfert éventuel). */
export function sendPagePath(projectId: string, artisanIds: string[], token?: string): string {
  const params = new URLSearchParams();
  for (const id of artisanIds) params.append("artisan", id);
  if (token) params.set("transfert", token);
  return `/recherche/${projectId}/envoyer?${params}`;
}

/**
 * « Redemander un devis » (F-12, ADR 0040) : recherche pour un artisan d'un chantier précédent.
 * Le nom ne sert qu'au bandeau ; analyze-need vérifie le chantier commun.
 */
export function rehirePath(artisanId: string, chantierId: string, artisanName: string): string {
  const params = new URLSearchParams({ artisan: artisanId, depuis: chantierId, nom: artisanName });
  return `/recherche?${params}`;
}
