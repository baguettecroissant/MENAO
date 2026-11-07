/** Appel pris par la secrétaire dédiée (F-83, ADR 0232) : message ou rendez-vous. */
export type SecretaryMessage = {
  id: string;
  kind: string;
  caller_name: string;
  caller_phone: string;
  city: string | null;
  reason: string;
  urgent: boolean;
  appointment_at: string | null;
  done_at: string | null;
  created_at: string;
};
