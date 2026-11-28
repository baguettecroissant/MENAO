// Notifications sur le téléphone depuis le navigateur (web push, ADR 0396) : chiffrement et
// signature VAPID par la bibliothèque web-push. Clés dans les secrets de la fonction
// (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT) ; sans elles, rien n'est envoyé.
// @ts-types="npm:@types/web-push@3.6.4"
import webpush from "npm:web-push@3.6.7";
import { env } from "./env.ts";

export type WebPushSubscription = { endpoint: string; p256dh: string; auth: string };
export type WebPushResult = { ok: boolean; gone: boolean; retry: boolean };

let configured: boolean | null = null;

function configure(): boolean {
  if (configured !== null) return configured;
  const publicKey = env("VAPID_PUBLIC_KEY");
  const privateKey = env("VAPID_PRIVATE_KEY");
  if (!publicKey || !privateKey) return (configured = false);
  webpush.setVapidDetails(env("VAPID_SUBJECT") || "mailto:contact@menao.fr", publicKey, privateKey);
  return (configured = true);
}

export const webPushEnabled = () => configure();

/** Envoie un message à un abonnement ; `gone` : abonnement à oublier (404, 410). */
export async function sendWebPush(
  sub: WebPushSubscription,
  payload: { title: string; body: string; link: string },
): Promise<WebPushResult> {
  if (!configure()) return { ok: false, gone: false, retry: false };
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 86_400, urgency: "normal" },
    );
    return { ok: true, gone: false, retry: false };
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode ?? 0;
    return {
      ok: false,
      gone: status === 404 || status === 410,
      retry: status === 429 || status >= 500,
    };
  }
}
