// Edge Function billing-checkout (F-15) : ouvre une session Stripe Checkout d'abonnement pour
// l'artisan connecté, dont le dossier est validé. Web uniquement (CLAUDE.md règle 10).
import {
  TRIAL_DAYS,
  subscriptionGrantsAccess,
  type SubscriptionStatus,
} from "../../../packages/core/src/billing.ts";
import { adminClient, currentArtisan, json } from "../_shared/artisan.ts";
import { env } from "../_shared/env.ts";
import { logStripeError, returnOrigin, stripeClient } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const admin = adminClient();
  const ctx = await currentArtisan(req, admin);
  if (!ctx) return json({ status: "forbidden" }, 403);
  const { user, artisan } = ctx;
  if (artisan.status !== "valide") return json({ status: "not_validated" }, 403);

  const body = (await req.json().catch(() => ({}))) as { plan?: string; origin?: string };
  const { data: allowed } = await admin.rpc("consume_rate_limit", {
    p_key: `billing-checkout:${user.id}`,
    p_max: 20,
    p_window_seconds: 3600,
  });
  if (allowed !== true) return json({ status: "rate_limited" }, 429);

  const { data: plan } = await admin
    .from("plans")
    .select("code, stripe_lookup_key, ouverte")
    .eq("code", body.plan ?? "")
    .maybeSingle();
  if (!plan?.ouverte) return json({ status: "plan_unavailable" }, 400);

  const { data: existing } = await admin
    .from("subscriptions")
    .select("status")
    .eq("artisan_id", artisan.id)
    .maybeSingle();
  if (existing && subscriptionGrantsAccess(existing.status as SubscriptionStatus)) {
    return json({ status: "already_subscribed" }, 409);
  }

  try {
    const stripe = stripeClient();
    let customerId = artisan.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: artisan.raison_sociale ?? undefined,
        preferred_locales: ["fr"],
        metadata: { artisan_id: artisan.id },
      });
      customerId = customer.id;
      const { error } = await admin
        .from("artisans")
        .update({ stripe_customer_id: customerId })
        .eq("id", artisan.id);
      if (error) throw error;
    }

    const prices = await stripe.prices.list({
      lookup_keys: [plan.stripe_lookup_key],
      active: true,
      limit: 1,
    });
    const price = prices.data[0];
    if (!price) {
      console.error(`billing-checkout : prix introuvable (${plan.stripe_lookup_key})`);
      return json({ status: "unavailable" }, 503);
    }

    const origin = returnOrigin(body.origin);
    const taxRate = env("STRIPE_TAX_RATE_ID");
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: artisan.id,
      line_items: [{ price: price.id, quantity: 1 }],
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: { artisan_id: artisan.id },
        ...(taxRate ? { default_tax_rates: [taxRate] } : {}),
      },
      allowed_payment_method_types: ["card", "sepa_debit"],
      allow_promotion_codes: true,
      locale: "fr",
      success_url: `${origin}/pro/onboarding/formule?paiement=ok`,
      cancel_url: `${origin}/pro/onboarding/formule`,
    });
    return json({ status: "ok", url: session.url });
  } catch (error) {
    logStripeError("billing-checkout", error);
    return json({ status: "unavailable" }, 503);
  }
});
