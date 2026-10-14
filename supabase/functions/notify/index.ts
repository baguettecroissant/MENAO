// Edge Function notify (F-41) : envoie les notifications en attente, par e-mail (Resend) et en
// push vers l'application (Expo). Appelée chaque minute par la base (pg_cron + pg_net) avec un
// secret partagé ; aucune donnée personnelle journalisée (CLAUDE.md règle 11). ADR 0017, 0078.
import { notificationContent } from "../../../packages/emails/src/content.ts";
import { renderNotification, type NotificationType } from "../../../packages/emails/src/index.ts";
import { adminClient, json } from "../_shared/artisan.ts";
import { env } from "../_shared/env.ts";
import { notificationProvider, pushProvider, type PushMessage } from "../_shared/notifications.ts";

const BATCH_SIZE = 20;
const PUSH_BATCH_SIZE = 50;

type Claimed = {
  id: string;
  type: NotificationType;
  data: Record<string, unknown> | null;
  email: string | null;
  first_name: string | null;
};

type ClaimedPush = {
  id: string;
  type: NotificationType;
  data: Record<string, unknown> | null;
  tokens: string[] | null;
};

/**
 * Pushes en attente : mêmes textes que le centre de notifications (objet, aperçu et page de
 * l'e-mail), vers chaque appareil du destinataire. Une notification est envoyée dès qu'un appareil
 * l'a reçue ; les jetons refusés par le service sont oubliés.
 */
async function sendPushes(admin: ReturnType<typeof adminClient>) {
  const { data, error } = await admin.rpc("claim_push_notifications", { p_limit: PUSH_BATCH_SIZE });
  if (error) return { pushed: 0, pushFailed: 0 };
  const claimed = (data ?? []) as ClaimedPush[];
  const messages: { id: string; message: PushMessage }[] = claimed.flatMap((n) => {
    const content = notificationContent(n.type, n.data ?? {}, { siteUrl: "", firstName: null });
    return (n.tokens ?? []).map((to) => ({
      id: n.id,
      message: { to, title: content.subject, body: content.preview, link: content.cta.url || "/" },
    }));
  });
  const results = messages.length ? await pushProvider().send(messages.map((m) => m.message)) : [];
  const outcome = new Map<string, { sent: boolean; retry: boolean }>();
  const forgotten: string[] = [];
  messages.forEach((m, i) => {
    const result = results[i] ?? { ok: false, unregistered: false, retry: true };
    const current = outcome.get(m.id) ?? { sent: false, retry: false };
    if (result.ok) current.sent = true;
    else {
      if (result.unregistered) forgotten.push(m.message.to);
      if (result.retry) current.retry = true;
    }
    outcome.set(m.id, current);
  });
  if (forgotten.length) await admin.rpc("forget_push_tokens", { p_tokens: forgotten });
  let pushed = 0;
  let pushFailed = 0;
  for (const n of claimed) {
    const result = outcome.get(n.id) ?? { sent: false, retry: false };
    await admin.rpc("complete_push_notification", {
      p_id: n.id,
      p_sent: result.sent,
      p_retry: !result.sent && result.retry,
    });
    if (result.sent) pushed++;
    else pushFailed++;
  }
  return { pushed, pushFailed };
}

/** Comparaison à temps constant du secret partagé. */
function sameSecret(received: string, expected: string): boolean {
  const a = new TextEncoder().encode(received);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const secret = env("NOTIFY_SECRET");
  if (!secret || !sameSecret(req.headers.get("x-menao-secret") ?? "", secret)) {
    return json({ error: "non autorisé" }, 401);
  }
  const admin = adminClient();
  // E-mails : seulement si l'envoi est configuré (Resend) ; le push n'en dépend pas.
  const provider = notificationProvider();
  const { data, error } = provider
    ? await admin.rpc("claim_notifications", { p_limit: BATCH_SIZE })
    : { data: [], error: null };
  if (error) return json({ error: "indisponible" }, 503);

  // Liens des e-mails : première origine autorisée du site (staging, puis production).
  const siteUrl = (env("SITE_URLS").split(",")[0] ?? "").trim();
  let sent = 0;
  let failed = 0;
  for (const n of (provider ? (data ?? []) : []) as Claimed[]) {
    const email = renderNotification(n.type, n.data ?? {}, { siteUrl, firstName: n.first_name });
    const result =
      n.email && provider
        ? await provider.sendEmail({ to: n.email, ...email, idempotencyKey: n.id })
        : { ok: false as const, error: "adresse absente", retry: false };
    await admin.rpc("complete_notification", {
      p_id: n.id,
      p_sent: result.ok,
      p_error: result.ok ? null : result.error,
      p_retry: !result.ok && result.retry,
    });
    if (result.ok) sent++;
    else failed++;
  }
  const { pushed, pushFailed } = await sendPushes(admin);
  // Comptes seulement : ni adresse, ni contenu, ni jeton.
  console.log(JSON.stringify({ sent, failed, pushed, pushFailed }));
  return json({ sent, failed, pushed, pushFailed });
});
