/**
 * Repli de l'IA (ADR 0304) : les appels à Claude passent en direct par la clé Anthropic ; si
 * Anthropic refuse pour une raison qui ne tient pas à la requête (crédits épuisés, clé refusée,
 * limite de débit, service surchargé ou en panne), le même appel est rejoué une fois via
 * OpenRouter. Logique pure, aussi chargée par Deno.
 */

/** Ce qu'on sait de l'échec d'un appel direct : statut HTTP, message, coupure réseau. */
export type DirectFailure = {
  status?: number | null;
  message?: string | null;
  /** Connexion impossible (hors délai dépassé : rejouer doublerait l'attente). */
  connection?: boolean;
  timeout?: boolean;
};

/**
 * Rejouer via OpenRouter ? Oui pour les crédits épuisés (400 « credit balance »), la clé refusée
 * (401, 403), le paiement requis (402), la limite de débit (429), une erreur ou surcharge
 * d'Anthropic (500 et plus, 529) et une coupure réseau. Non pour une requête invalide (400, 404,
 * 413, 422 : elle échouerait aussi ailleurs) ni pour un délai dépassé.
 */
export function shouldUseBackup(failure: DirectFailure): boolean {
  if (failure.timeout) return false;
  if (failure.connection) return true;
  const status = failure.status ?? 0;
  if (status === 400) return /credit balance|billing|credits?/i.test(failure.message ?? "");
  return status === 401 || status === 402 || status === 403 || status === 429 || status >= 500;
}

/**
 * Nom du modèle chez OpenRouter : « claude-haiku-5-5 » → « anthropic/claude-haiku-5.5 »,
 * « claude-opus-5 » → « anthropic/claude-opus-5 ». Un nom déjà préfixé reste tel quel.
 */
export function openRouterModelName(model: string): string {
  if (model.includes("/")) return model;
  const m = /^claude-([a-z]+)-(\d+)(?:-(\d+))?$/.exec(model);
  if (!m) return `anthropic/${model}`;
  return `anthropic/claude-${m[1]}-${m[2]}${m[3] ? `.${m[3]}` : ""}`;
}
