// NotificationProvider (ADR 0002, 0017) : l'envoi passe par une interface, pour changer de
// fournisseur sans toucher au code métier. Les SMS (Brevo) et le push s'ajouteront ici.
import { env } from "./env.ts";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Identifiant de la notification : jamais deux envois pour la même (24 h chez Resend). */
  idempotencyKey: string;
};

/** `retry` : erreur passagère (réseau, quota, serveur), à retenter plus tard. */
export type SendResult = { ok: true } | { ok: false; error: string; retry: boolean };

export interface NotificationProvider {
  sendEmail(message: EmailMessage): Promise<SendResult>;
}

/** Expéditeur tant que le domaine d'envoi (notifications.menao.fr) n'est pas vérifié. */
const DEFAULT_FROM = "MENAO <onboarding@resend.dev>";

/** Resend : https://resend.com/docs/api-reference/emails/send-email */
export class ResendProvider implements NotificationProvider {
  readonly #apiKey: string;
  readonly #from: string;

  constructor(apiKey: string, from: string) {
    this.#apiKey = apiKey;
    this.#from = from;
  }

  async sendEmail(message: EmailMessage): Promise<SendResult> {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.#apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": message.idempotencyKey,
        },
        body: JSON.stringify({
          from: this.#from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) return { ok: true };
      // Code et nom d'erreur seulement : le message de Resend peut citer une adresse e-mail.
      const body = (await res.json().catch(() => null)) as { name?: unknown } | null;
      const name = typeof body?.name === "string" ? body.name : "erreur";
      return {
        ok: false,
        error: `resend ${res.status} ${name}`.slice(0, 200),
        retry: res.status === 429 || res.status >= 500,
      };
    } catch {
      return { ok: false, error: "resend injoignable", retry: true };
    }
  }
}

/** Fournisseur configuré, ou null si l'envoi n'est pas configuré (local, CI). */
export function notificationProvider(): NotificationProvider | null {
  const key = env("RESEND_API_KEY");
  return key ? new ResendProvider(key, env("EMAIL_FROM") || DEFAULT_FROM) : null;
}
