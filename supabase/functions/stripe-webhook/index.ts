// Edge Function stripe-webhook (F-15, F-31) : seule écriture des abonnements et des paiements des
// chantiers (comptes connectés des artisans). Signature vérifiée, traitement idempotent (table
// webhook_events), CLAUDE.md règle 9. Aucune donnée personnelle journalisée.
import Stripe from "stripe";
import { connectAccountFromStripe } from "../../../packages/core/src/connect.ts";
import { paymentStatusFromCheckout } from "../../../packages/core/src/payment.ts";
import {
  subscriptionFromStripe,
  subscriptionGrantsAccess,
  type SubscriptionSnapshot,
  type SubscriptionStatus,
} from "../../../packages/core/src/billing.ts";
import { adminClient, json } from "../_shared/artisan.ts";
import { saveConnectAccount } from "../_shared/connect.ts";
import { env } from "../_shared/env.ts";
import { stripeClient } from "../_shared/stripe.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

const SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
]);

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const signature = req.headers.get("stripe-signature");
  const payload = await req.text();
  const stripe = stripeClient();

  // Deux points de terminaison Stripe : compte de la plateforme (abonnements) et comptes
  // connectés (Connect), chacun avec son secret de signature.
  let event: Stripe.Event | null = null;
  for (const secret of [env("STRIPE_WEBHOOK_SECRET"), env("STRIPE_CONNECT_WEBHOOK_SECRET")].filter(
    Boolean,
  )) {
    try {
      event = await stripe.webhooks.constructEventAsync(
        payload,
        signature ?? "",
        secret,
        undefined,
        Stripe.createSubtleCryptoProvider(),
      );
      break;
    } catch {
      // secret suivant
    }
  }
  if (!event) return json({ error: "signature invalide" }, 400);

  const admin = adminClient();
  const { error: insertError } = await admin
    .from("webhook_events")
    .insert({ id: event.id, type: event.type });
  if (insertError) {
    if (insertError.code !== "23505") return json({ error: "indisponible" }, 503);
    const { data: seen } = await admin
      .from("webhook_events")
      .select("processed_at")
      .eq("id", event.id)
      .single();
    if (seen?.processed_at) return json({ received: true, duplicate: true });
  }

  try {
    let subscription: unknown = null;
    if (SUBSCRIPTION_EVENTS.has(event.type)) {
      subscription = event.data.object;
    } else if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (typeof session.subscription === "string")
        subscription = await stripe.subscriptions.retrieve(session.subscription);
    }
    if (subscription) {
      const snapshot = subscriptionFromStripe(subscription);
      if (snapshot) await saveSubscription(admin, snapshot);
    }
    // Paiement d'un chantier, sur le compte connecté de l'artisan (ADR 0011, ADR 0023).
    if (event.account && event.type.startsWith("checkout.session.")) {
      await savePayment(
        admin,
        event.account,
        event.type,
        event.data.object as Stripe.Checkout.Session,
      );
    }
    if (event.type === "account.updated") {
      const account = connectAccountFromStripe(event.data.object);
      if (account && !(await saveConnectAccount(admin, account))) {
        console.error("stripe-webhook : compte connecté sans artisan correspondant");
      }
    }
    await admin
      .from("webhook_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", event.id);
    return json({ received: true });
  } catch (error) {
    // L'événement sera renvoyé par Stripe : on libère l'identifiant.
    await admin.from("webhook_events").delete().eq("id", event.id);
    console.error(
      `stripe-webhook : échec du traitement (${event.type})`,
      error instanceof Error ? error.name : "",
    );
    return json({ error: "traitement impossible" }, 500);
  }
});

/** Paiement retrouvé par les métadonnées posées à la création (devis, tranche) ; compte et montant vérifiés en base. */
async function savePayment(
  admin: SupabaseClient,
  account: string,
  type: string,
  session: Stripe.Checkout.Session,
) {
  const quoteId = session.metadata?.menao_quote_id;
  const kind = session.metadata?.menao_kind;
  const status = paymentStatusFromCheckout(type, session.payment_status);
  if (
    session.mode !== "payment" ||
    !quoteId ||
    (kind !== "acompte" && kind !== "solde") ||
    !status
  ) {
    return;
  }
  const { data: outcome, error } = await admin.rpc("record_payment", {
    p_quote_id: quoteId,
    p_kind: kind,
    p_stripe_account_id: account,
    p_session_id: session.id,
    p_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
    p_amount_cents: session.amount_total ?? 0,
    p_status: status,
  });
  if (error) throw new Error(error.message);
  if (outcome === "incoherent" || outcome === "inconnu") {
    console.error(`stripe-webhook : paiement ${outcome} (${type})`);
  }
}

async function saveSubscription(admin: SupabaseClient, s: SubscriptionSnapshot) {
  // Artisan : métadonnée posée à la création (Checkout), sinon client Stripe enregistré.
  let artisanId: string | null = null;
  if (s.artisanId) {
    const { data } = await admin.from("artisans").select("id").eq("id", s.artisanId).maybeSingle();
    artisanId = data?.id ?? null;
  }
  if (!artisanId) {
    const { data } = await admin
      .from("artisans")
      .select("id")
      .eq("stripe_customer_id", s.stripeCustomerId)
      .maybeSingle();
    artisanId = data?.id ?? null;
  }
  if (!artisanId) {
    console.error("stripe-webhook : abonnement sans artisan correspondant");
    return;
  }

  // Un événement tardif d'un ancien abonnement terminé n'écrase pas un abonnement en cours.
  const { data: current } = await admin
    .from("subscriptions")
    .select("stripe_subscription_id, status")
    .eq("artisan_id", artisanId)
    .maybeSingle();
  if (
    current &&
    current.stripe_subscription_id !== s.stripeSubscriptionId &&
    subscriptionGrantsAccess(current.status as SubscriptionStatus) &&
    !subscriptionGrantsAccess(s.status)
  ) {
    return;
  }

  const { data: plan } = s.lookupKey
    ? await admin.from("plans").select("code").eq("stripe_lookup_key", s.lookupKey).maybeSingle()
    : { data: null };

  const { error } = await admin.from("subscriptions").upsert(
    {
      artisan_id: artisanId,
      plan_code: plan?.code ?? null,
      stripe_customer_id: s.stripeCustomerId,
      stripe_subscription_id: s.stripeSubscriptionId,
      status: s.status,
      current_period_end: s.currentPeriodEnd,
      trial_end: s.trialEnd,
      cancel_at_period_end: s.cancelAtPeriodEnd,
    },
    { onConflict: "artisan_id" },
  );
  if (error) throw error;
  await admin
    .from("artisans")
    .update({ stripe_customer_id: s.stripeCustomerId })
    .eq("id", artisanId)
    .is("stripe_customer_id", null);
}
