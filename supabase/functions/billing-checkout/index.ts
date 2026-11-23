// Edge Function billing-checkout (F-15) : ouvre une session Stripe Checkout d'abonnement pour
// l'artisan connecté, dès le début de son dossier (ADR 0370). Web uniquement (CLAUDE.md règle 10).
// Engagement d'un an (ADR 0383) : la case d'engagement et les conditions de vente sont exigées ;
// leur acceptation est conservée avant la page de paiement. L'essai démarre à la mise en ligne de
// la fiche (billing-go-live) : d'ici là, la fin d'essai posée ici n'est qu'une borne provisoire.
import {
  subscriptionGrantsAccess,
  type SubscriptionStatus,
} from "../../../packages/core/src/billing.ts";
import { subscriptionCheckoutOpen } from "../../../packages/core/src/connect.ts";
import {
  BILLING_PERIODS,
  annualPriceCents,
  checkoutNotice,
  type BillingPeriod,
} from "../../../packages/core/src/plans.ts";
import {
  CGV_VERSION,
  TERM_CHECKBOX_TEXT,
  TERM_TEXT_VERSION,
} from "../../../packages/core/src/subscription-term.ts";
import { adminClient, currentArtisan, json } from "../_shared/artisan.ts";
import { env } from "../_shared/env.ts";
import { logStripeError, returnOrigin, stripeClient } from "../_shared/stripe.ts";
import { paymentsClosed, paymentsOpen } from "../_shared/launch.ts";

/**
 * Fin d'essai provisoire, avant la mise en ligne : billing-go-live la ramène à 60 jours après la mise
 * en ligne. Assez longue pour qu'aucun prélèvement n'ait lieu pendant la vérification du dossier.
 */
const PROVISIONAL_TRIAL_DAYS = 365;

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  // Paiements fermés jusqu'au lancement (ADR 0387).
  if (!paymentsOpen) return paymentsClosed();
  const admin = adminClient();
  const ctx = await currentArtisan(req, admin);
  if (!ctx) return json({ status: "forbidden" }, 403);
  const { user, artisan } = ctx;
  // Sans attendre la validation (ADR 0370) : rien n'est prélevé pendant l'essai.
  if (!subscriptionCheckoutOpen(artisan.status)) return json({ status: "not_validated" }, 403);

  const body = (await req.json().catch(() => ({}))) as {
    plan?: string;
    periodicite?: string;
    engagement?: boolean;
    cgv?: boolean;
    origin?: string;
  };
  // Case d'engagement distincte des conditions de vente (CGV, article 6) : les deux sont exigées.
  if (body.engagement !== true) return json({ status: "engagement_required" }, 400);
  if (body.cgv !== true) return json({ status: "cgv_required" }, 400);
  const period: BillingPeriod = (BILLING_PERIODS as readonly string[]).includes(
    body.periodicite ?? "",
  )
    ? (body.periodicite as BillingPeriod)
    : "mensuel";
  const { data: allowed } = await admin.rpc("consume_rate_limit", {
    p_key: `billing-checkout:${user.id}`,
    p_max: 20,
    p_window_seconds: 3600,
  });
  if (allowed !== true) return json({ status: "rate_limited" }, 429);

  const { data: plan } = await admin
    .from("plans")
    .select("code, stripe_lookup_key, stripe_lookup_key_annuel, prix_mensuel_ht_centimes, ouverte")
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

    const lookupKey = period === "annuel" ? plan.stripe_lookup_key_annuel : plan.stripe_lookup_key;
    const prices = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
    const price = prices.data[0];
    if (!price) {
      console.error(`billing-checkout : prix introuvable (${lookupKey})`);
      return json({ status: "unavailable" }, 503);
    }
    const euros = (cents: number) =>
      new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }).format(cents / 100);
    const notice = checkoutNotice(period, {
      annualPrice: euros(annualPriceCents(plan.prix_mensuel_ht_centimes)),
      monthlyPrice: euros(plan.prix_mensuel_ht_centimes),
    });

    // Preuve d'acceptation (date, heure, texte exact, version), puis les conditions de vente.
    const { error: proofError } = await admin.from("subscription_term_acceptances").insert({
      artisan_id: artisan.id,
      user_id: user.id,
      version: TERM_TEXT_VERSION,
      texte: TERM_CHECKBOX_TEXT,
      cgv_version: CGV_VERSION,
      plan_code: plan.code,
      periodicite: period,
    });
    if (proofError) throw proofError;
    const { error: legalError } = await admin
      .from("legal_acceptances")
      .upsert(
        { user_id: user.id, document: "cgv_artisan", version: CGV_VERSION },
        { onConflict: "user_id,document,version", ignoreDuplicates: true },
      );
    if (legalError) throw legalError;

    const origin = returnOrigin(body.origin);
    const taxRate = env("STRIPE_TAX_RATE_ID");
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: artisan.id,
      line_items: [{ price: price.id, quantity: 1 }],
      subscription_data: {
        trial_period_days: PROVISIONAL_TRIAL_DAYS,
        metadata: {
          artisan_id: artisan.id,
          periodicite: period,
          engagement_version: TERM_TEXT_VERSION,
        },
        ...(taxRate ? { default_tax_rates: [taxRate] } : {}),
      },
      allowed_payment_method_types: ["card", "sepa_debit"],
      allow_promotion_codes: true,
      custom_text: { submit: { message: notice } },
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
