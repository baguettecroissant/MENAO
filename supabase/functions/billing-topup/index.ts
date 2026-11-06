// Edge Function billing-topup (F-84, ADR 0233) : ouvre une session Stripe Checkout de paiement
// unique pour recharger des minutes de voix, pour l'artisan connecté dont la formule le permet
// (Premium et Entreprise). Web uniquement (CLAUDE.md règle 10). Les minutes sont créditées par
// stripe-webhook, une seule fois par session. Aucune donnée personnelle journalisée.
import { parseAiAgents } from "../../../packages/core/src/ai-agents.ts";
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

  const body = (await req.json().catch(() => ({}))) as { offer?: string; origin?: string };
  const { data: allowed } = await admin.rpc("consume_rate_limit", {
    p_key: `billing-topup:${user.id}`,
    p_max: 10,
    p_window_seconds: 3600,
  });
  if (allowed !== true) return json({ status: "rate_limited" }, 429);

  const { data: rights } = await admin.rpc("voice_artisan_agents", { p_artisan_id: artisan.id });
  if (!parseAiAgents(rights).agents.topUps) return json({ status: "non_inclus" }, 403);

  const { data: offer } = await admin
    .from("voice_topup_offers")
    .select("code, minutes, validite_mois, stripe_lookup_key, active")
    .eq("code", body.offer ?? "recharge_100")
    .maybeSingle();
  if (!offer?.active) return json({ status: "unavailable" }, 400);

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
      lookup_keys: [offer.stripe_lookup_key],
      active: true,
      limit: 1,
    });
    const price = prices.data[0];
    if (!price) {
      console.error(`billing-topup : prix introuvable (${offer.stripe_lookup_key})`);
      return json({ status: "unavailable" }, 503);
    }
    const metadata = { menao_kind: "recharge_minutes", artisan_id: artisan.id, offer: offer.code };
    const origin = returnOrigin(body.origin);
    const taxRate = env("STRIPE_TAX_RATE_ID");
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      client_reference_id: artisan.id,
      line_items: [{ price: price.id, quantity: 1, ...(taxRate ? { tax_rates: [taxRate] } : {}) }],
      metadata,
      payment_intent_data: { metadata },
      invoice_creation: { enabled: true, invoice_data: { metadata } },
      allowed_payment_method_types: ["card"],
      custom_text: {
        submit: {
          message: `${offer.minutes} minutes de voix valables ${offer.validite_mois} mois. Paiement unique, sans abonnement.`,
        },
      },
      locale: "fr",
      success_url: `${origin}/pro/onboarding/formule?recharge=ok#agents`,
      cancel_url: `${origin}/pro/onboarding/formule#agents`,
    });
    return json({ status: "ok", url: session.url });
  } catch (error) {
    logStripeError("billing-topup", error);
    return json({ status: "unavailable" }, 503);
  }
});
