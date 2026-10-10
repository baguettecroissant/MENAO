// Edge Function notify (F-41) : envoie les notifications en attente (e-mails via Resend).
// Appelée chaque minute par la base (pg_cron + pg_net) avec un secret partagé ; aucune donnée
// personnelle journalisée (CLAUDE.md règle 11). ADR 0017.
import { renderNotification, type NotificationType } from "../../../packages/emails/src/index.ts";
import { adminClient, json } from "../_shared/artisan.ts";
import { env } from "../_shared/env.ts";
import { notificationProvider } from "../_shared/notifications.ts";

const BATCH_SIZE = 20;

type Claimed = {
  id: string;
  type: NotificationType;
  data: Record<string, unknown> | null;
  email: string | null;
  first_name: string | null;
};

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
  const provider = notificationProvider();
  if (!provider) return json({ error: "envoi non configuré" }, 503);

  const admin = adminClient();
  const { data, error } = await admin.rpc("claim_notifications", { p_limit: BATCH_SIZE });
  if (error) return json({ error: "indisponible" }, 503);

  // Liens des e-mails : première origine autorisée du site (staging, puis production).
  const siteUrl = (env("SITE_URLS").split(",")[0] ?? "").trim();
  let sent = 0;
  let failed = 0;
  for (const n of (data ?? []) as Claimed[]) {
    const email = renderNotification(n.type, n.data ?? {}, { siteUrl, firstName: n.first_name });
    const result = n.email
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
  // Comptes seulement : ni adresse, ni contenu.
  console.log(JSON.stringify({ sent, failed }));
  return json({ sent, failed });
});
