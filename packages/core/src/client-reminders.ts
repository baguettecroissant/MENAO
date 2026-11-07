/**
 * Rappels aux clients par SMS (F-88, ADR 0239), lot 6 des agents IA : lecture défensive de
 * `my_client_reminders` (droit de la formule, SMS du mois, réglages de l'artisan).
 */

export const CLIENT_REMINDER_KINDS = ["rdv", "demarrage", "acompte", "avis"] as const;
export type ClientReminderKind = (typeof CLIENT_REMINDER_KINDS)[number];

export type ClientRemindersState = {
  included: boolean;
  smsIncluded: number;
  smsUsed: number;
  enabled: Record<ClientReminderKind, boolean>;
};

/** Réglages par défaut : rendez-vous et démarrage activés, acompte et avis à activer. */
export const CLIENT_REMINDER_DEFAULTS: Record<ClientReminderKind, boolean> = {
  rdv: true,
  demarrage: true,
  acompte: false,
  avis: false,
};

const int = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;

export function parseClientReminders(raw: unknown): ClientRemindersState {
  const r =
    raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const enabled = { ...CLIENT_REMINDER_DEFAULTS };
  for (const kind of CLIENT_REMINDER_KINDS) {
    if (typeof r[kind] === "boolean") enabled[kind] = r[kind] as boolean;
  }
  return {
    included: r.inclus === true,
    smsIncluded: int(r.sms_inclus),
    smsUsed: int(r.sms_utilises),
    enabled,
  };
}
