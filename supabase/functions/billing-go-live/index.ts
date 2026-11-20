// Edge Function billing-go-live (F-184, ADR 0383) : l'essai gratuit de 60 jours démarre à la mise en
// ligne de la fiche, pas au paiement. Appelée par la base toutes les 5 minutes (pg_cron + pg_net,
// secret partagé de notify) quand une fiche engagée vient de devenir visible : la fin d'essai
// provisoire posée au paiement est ramenée à 60 jours après la mise en ligne, sans prorata.
import { trialEndAfterGoLive } from "../../../packages/core/src/subscription-term.ts";
import { adminClient } from "../_shared/artisan.ts";
import { env } from "../_shared/env.ts";
import { logStripeError, stripeClient } from "../_shared/stripe.ts";

function reply(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
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
    return reply({ status: "forbidden" }, 403);
  }

  const admin = adminClient();
  const { data: candidates, error } = await admin.rpc("subscription_trial_start_candidates", {
    p_limit: 50,
  });
  if (error) {
    console.error("billing-go-live : lecture des candidats impossible");
    return reply({ status: "error" }, 500);
  }

  const stripe = stripeClient();
  let started = 0;
  for (const c of (candidates ?? []) as {
    subscription_id: string;
    stripe_subscription_id: string;
  }[]) {
    const goLive = new Date();
    const trialEnd = trialEndAfterGoLive(goLive);
    try {
      await stripe.subscriptions.update(c.stripe_subscription_id, {
        trial_end: Math.floor(trialEnd.getTime() / 1000),
        proration_behavior: "none",
      });
    } catch (e) {
      logStripeError("billing-go-live", e);
      continue;
    }
    const { error: updateError } = await admin
      .from("subscriptions")
      .update({ essai_demarre_le: goLive.toISOString(), trial_end: trialEnd.toISOString() })
      .eq("id", c.subscription_id)
      .is("essai_demarre_le", null);
    if (updateError) console.error("billing-go-live : enregistrement du début d'essai impossible");
    else started += 1;
  }
  return reply({ status: "ok", started });
});
