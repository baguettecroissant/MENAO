/**
 * Notifications des services (webhooks Stripe et DocuSeal, ADR 0051).
 * Fichier autonome (aucun import) : il est aussi importé par les Edge Functions.
 */

// Un code technique : lettres, chiffres et quelques séparateurs, sans espace ni « @ ».
const CODE = /^[A-Za-z0-9_.:-]{1,80}$/;

/**
 * Code technique d'un échec de traitement, conservé pour le back-office : nom de l'erreur, type
 * et code Stripe, code SQL renvoyé par PostgREST. Jamais le message, qui pourrait contenir des
 * données personnelles (CLAUDE.md règle 11).
 */
export function webhookErrorCode(error: unknown): string {
  if (typeof error !== "object" || error === null) return "Erreur";
  const e = error as Record<string, unknown>;
  const parts: string[] = [];
  for (const value of [e.name, e.type, e.code]) {
    const code = typeof value === "number" ? String(value) : value;
    if (typeof code === "string" && CODE.test(code) && !parts.includes(code)) parts.push(code);
  }
  return parts.join(" ") || "Erreur";
}
