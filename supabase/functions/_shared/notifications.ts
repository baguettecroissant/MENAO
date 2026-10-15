// NotificationProvider (ADR 0002, 0017, 0078) : l'envoi passe par une interface, pour changer de
// fournisseur sans toucher au code métier. E-mails (Resend) et push (Expo) ; les SMS (Brevo)
// s'ajouteront ici.
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
const DEFAULT_FROM = "MENAO <notifications@menao.fr>";

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

/** Notification push vers un appareil (jeton Expo) : titre, texte et page concernée. */
export type PushMessage = {
  to: string;
  title: string;
  body: string;
  /** Chemin de la page concernée sur le site : l'application ouvre l'écran correspondant. */
  link: string;
};

/**
 * Résultat par message, dans l'ordre des messages. `unregistered` : jeton refusé (application
 * désinstallée, notifications désactivées) ; `retry` : erreur passagère, à retenter plus tard.
 */
export type PushResult = { ok: true } | { ok: false; unregistered: boolean; retry: boolean };

export interface PushProvider {
  send(messages: readonly PushMessage[]): Promise<PushResult[]>;
}

/** 100 messages au plus par requête au service Expo. */
const EXPO_BATCH = 100;

/**
 * Service push d'Expo (spec §4 : Expo Notifications), qui relaie vers Apple et Google :
 * https://docs.expo.dev/push-notifications/sending-notifications/. Jeton d'accès facultatif.
 * TODO(legal) : vérifier l'accord de traitement (DPA) d'Expo et le transfert hors UE du titre et
 * de l'aperçu des notifications avant la mise en production, comme pour Resend et Brevo (F-41).
 */
export class ExpoPushProvider implements PushProvider {
  readonly #accessToken: string;

  constructor(accessToken: string) {
    this.#accessToken = accessToken;
  }

  async send(messages: readonly PushMessage[]): Promise<PushResult[]> {
    const results: PushResult[] = [];
    for (let i = 0; i < messages.length; i += EXPO_BATCH) {
      const chunk = messages.slice(i, i + EXPO_BATCH);
      results.push(...(await this.#sendChunk(chunk)));
    }
    return results;
  }

  async #sendChunk(chunk: readonly PushMessage[]): Promise<PushResult[]> {
    const retryAll = (): PushResult[] =>
      chunk.map(() => ({ ok: false, unregistered: false, retry: true }));
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(this.#accessToken ? { Authorization: `Bearer ${this.#accessToken}` } : {}),
        },
        body: JSON.stringify(
          chunk.map((m) => ({
            to: m.to,
            title: m.title,
            body: m.body,
            data: { link: m.link },
            sound: "default",
            priority: "high",
          })),
        ),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        return res.status === 429 || res.status >= 500
          ? retryAll()
          : chunk.map(() => ({ ok: false, unregistered: false, retry: false }));
      }
      const body = (await res.json().catch(() => null)) as {
        data?: { status?: string; details?: { error?: string } }[];
      } | null;
      const tickets = Array.isArray(body?.data) ? body.data : [];
      return chunk.map((_, j): PushResult => {
        const ticket = tickets[j];
        if (ticket?.status === "ok") return { ok: true };
        return {
          ok: false,
          unregistered: ticket?.details?.error === "DeviceNotRegistered",
          retry: ticket === undefined,
        };
      });
    } catch {
      return retryAll();
    }
  }
}

/** Service push (Expo), toujours disponible : le jeton d'accès est facultatif. */
export function pushProvider(): PushProvider {
  return new ExpoPushProvider(env("EXPO_ACCESS_TOKEN"));
}
