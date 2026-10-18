/** Suivi des échéances des documents et certifications d'un artisan validé (F-51). */

/**
 * Documents dont l'expiration est surveillée après validation (le Kbis ne l'est pas).
 * L'attestation URSSAF expire 6 mois après son émission (date de fin calculée en base, ADR 0115).
 */
export const MONITORED_DOCUMENT_TYPES = ["decennale", "rc_pro", "identite", "urssaf"] as const;
export type MonitoredDocumentType = (typeof MONITORED_DOCUMENT_TYPES)[number];

/** Alertes à J-30 puis J-7 (spec F-41 : « Document expirant J-30, J-7 »). */
export const EXPIRY_WARNING_DAYS = 30;
export const EXPIRY_URGENT_DAYS = 7;

/**
 * Relances de l'artisan avant l'expiration de chaque document : J-30, J-15 et J-7 (cahier des
 * charges du CEO, ADR 0122). Une seule relance par seuil ; miroir de app.remind_expiring_documents.
 */
export const EXPIRY_REMINDER_DAYS = [30, 15, 7] as const;

/** Seuil de relance atteint à ce nombre de jours restants (le plus proche), ou null. */
export function reminderThreshold(daysLeft: number): (typeof EXPIRY_REMINDER_DAYS)[number] | null {
  if (daysLeft < 0 || daysLeft > EXPIRY_REMINDER_DAYS[0]) return null;
  return [...EXPIRY_REMINDER_DAYS].reverse().find((t) => daysLeft <= t) ?? null;
}

export type ExpiryStatus = "ok" | "bientot" | "urgent" | "expire";

const DAY_MS = 86_400_000;

/** Jours restants jusqu'à la date de fin (AAAA-MM-JJ, incluse) ; négatif si dépassée. */
export function daysUntil(dateFin: string, today: Date = new Date()): number {
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((Date.parse(`${dateFin}T00:00:00Z`) - start) / DAY_MS);
}

export function expiryStatus(dateFin: string | null, today: Date = new Date()): ExpiryStatus {
  if (dateFin === null) return "ok";
  const days = daysUntil(dateFin, today);
  if (days < 0) return "expire";
  if (days <= EXPIRY_URGENT_DAYS) return "urgent";
  if (days <= EXPIRY_WARNING_DAYS) return "bientot";
  return "ok";
}

/**
 * Documents surveillés à renouveler (F-51) : un document validé arrive à échéance (30 jours) ou
 * est expiré, sans renouvellement déposé. Même règle sur le site et dans l'application.
 */
export function documentsToRenew(
  documents: readonly { type: string; status: string; date_fin: string | null }[],
  today: Date = new Date(),
): MonitoredDocumentType[] {
  return MONITORED_DOCUMENT_TYPES.filter((type) => {
    const current = documents.find((d) => d.type === type && d.status === "valide");
    const pending = documents.some((d) => d.type === type && d.status === "en_attente");
    return current !== undefined && !pending && expiryStatus(current.date_fin, today) !== "ok";
  });
}

/** Date limite (AAAA-MM-JJ) des échéances à surveiller : aujourd'hui + 30 jours. */
export function expiryWatchLimit(today: Date = new Date()): string {
  return new Date(today.getTime() + EXPIRY_WARNING_DAYS * DAY_MS).toISOString().slice(0, 10);
}
