/** Page d'envoi de la demande, avec les artisans choisis (et le jeton de transfert éventuel). */
export function sendPagePath(projectId: string, artisanIds: string[], token?: string): string {
  const params = new URLSearchParams();
  for (const id of artisanIds) params.append("artisan", id);
  if (token) params.set("transfert", token);
  return `/recherche/${projectId}/envoyer?${params}`;
}
