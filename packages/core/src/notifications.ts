/**
 * Centre de notifications et préférences (F-41). Seules les notifications facultatives se
 * désactivent par e-mail (activité du chantier, rappels) ; les notifications transactionnelles
 * (devis, paiements, réception, litiges, avis reçus…) sont toujours envoyées. Mêmes règles en base
 * (app.notification_category, app.email_wanted). ADR 0033.
 */

export const OPTIONAL_NOTIFICATIONS = {
  activite: ["chantier_nouveautes", "nouveaux_messages"],
  rappels: ["rdv_rappel", "avis_relance", "levee_relance", "acompte_relance"],
} as const;
export type EmailPreferenceKey = keyof typeof OPTIONAL_NOTIFICATIONS;
export type EmailPreferences = Record<EmailPreferenceKey, boolean>;

/** Catégorie d'une notification : facultative (activité, rappels) ou transactionnelle. */
export function notificationCategory(type: string): EmailPreferenceKey | "transactionnel" {
  for (const key of Object.keys(OPTIONAL_NOTIFICATIONS) as EmailPreferenceKey[]) {
    if ((OPTIONAL_NOTIFICATIONS[key] as readonly string[]).includes(type)) return key;
  }
  return "transactionnel";
}

/** Préférences d'e-mail lues dans profiles.notification_preferences (tout activé par défaut). */
export function emailPreferences(value: unknown): EmailPreferences {
  const email =
    value && typeof value === "object" && "email" in value
      ? (value as { email: unknown }).email
      : null;
  const read = (key: EmailPreferenceKey) =>
    email &&
    typeof email === "object" &&
    typeof (email as Record<string, unknown>)[key] === "boolean"
      ? ((email as Record<string, unknown>)[key] as boolean)
      : true;
  return { activite: read("activite"), rappels: read("rappels") };
}
