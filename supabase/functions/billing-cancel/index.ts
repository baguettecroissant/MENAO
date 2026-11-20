// Edge Function billing-cancel (F-184, ADR 0383) : l'artisan arrête son abonnement depuis son espace
// MENAO (CGV, articles 5 et 8), plus depuis le portail Stripe. Pendant l'essai : sans frais (tout
// de suite si la fiche n'est pas encore en ligne, sinon à la fin de l'essai). Engagé : à l'échéance
// de la période en cours, ou à la suivante si la date limite (3 mois avant) est passée ; aucune
// sortie en cours de période. Abonnement souscrit avant l'engagement : fin de la période payée.
import {
  addEngagementDays,
  cancellationPlan,
  parisDay,
  parisMidnight,
} from "../../../packages/core/src/subscription-term.ts";
import { adminClient, currentArtisan, json } from "../_shared/artisan.ts";
import { logStripeError, stripeClient } from "../_shared/stripe.ts";

const REASONS = ["demandes", "prix", "activite", "autre"] as const;
const OPEN_STATUSES = ["trialing", "active", "past_due"];

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const admin = adminClient();
  const ctx = await currentArtisan(req, admin);
  if (!ctx) return json({ status: "forbidden" }, 403);

  const body = (await req.json().catch(() => ({}))) as { motif?: string };
  const motif = (REASONS as readonly string[]).includes(body.motif ?? "") ? body.motif : null;

  const { data: sub } = await admin
    .from("subscriptions")
    .select(
      "id, stripe_subscription_id, status, trial_end, current_period_end, cancel_at, cancel_at_period_end, engagement_version, essai_demarre_le, arret_demande_le",
    )
    .eq("artisan_id", ctx.artisan.id)
    .maybeSingle();
  if (!sub || !OPEN_STATUSES.includes(sub.status)) return json({ status: "no_subscription" }, 404);
  if (sub.arret_demande_le || sub.cancel_at || sub.cancel_at_period_end) {
    return json({ status: "already_requested" }, 409);
  }

  const { data: allowed } = await admin.rpc("consume_rate_limit", {
    p_key: `billing-cancel:${ctx.user.id}`,
    p_max: 10,
    p_window_seconds: 3600,
  });
  if (allowed !== true) return json({ status: "rate_limited" }, 429);

  const engaged = Boolean(sub.engagement_version);
  const today = parisDay(new Date());
  const firstPaymentDay = sub.trial_end ? parisDay(sub.trial_end) : null;
  const plan = cancellationPlan({ engaged, firstPaymentDay, today });
  const periodEndDay = sub.current_period_end ? parisDay(sub.current_period_end) : null;

  let lastDay: string;
  try {
    const stripe = stripeClient();
    if (plan.kind === "trial" && engaged && !sub.essai_demarre_le) {
      // Fiche pas encore en ligne : l'essai n'a pas commencé, l'abonnement s'arrête tout de suite.
      await stripe.subscriptions.cancel(sub.stripe_subscription_id);
      lastDay = today;
    } else if (plan.kind === "trial" || plan.kind === "periodEnd") {
      // Fin de l'essai (rien n'est prélevé) ou de la période déjà payée.
      await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: true });
      const end = plan.kind === "trial" ? firstPaymentDay : periodEndDay;
      lastDay = end ? addEngagementDays(end, -1) : today;
    } else if (periodEndDay === plan.cancelAt) {
      // L'échéance tombe à la fin de la période en cours (paiement à l'année).
      await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: true });
      lastDay = plan.lastDay;
    } else {
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at: Math.floor(parisMidnight(plan.cancelAt).getTime() / 1000),
        proration_behavior: "none",
      });
      lastDay = plan.lastDay;
    }
  } catch (error) {
    logStripeError("billing-cancel", error);
    return json({ status: "unavailable" }, 503);
  }

  // La confirmation par e-mail part de la base (déclencheur sur arret_demande_le).
  const { error } = await admin
    .from("subscriptions")
    .update({
      arret_demande_le: new Date().toISOString(),
      arret_effet_le: lastDay,
      motif_arret: motif,
    })
    .eq("id", sub.id);
  if (error) {
    console.error("billing-cancel : enregistrement de la demande impossible");
    return json({ status: "unavailable" }, 503);
  }
  return json({ status: "ok", lastDay, kind: plan.kind });
});
