// Edge Function connect-overview (ADR 0152) : aperçu du compte Stripe de l'artisan connecté, en
// lecture seule (solde, virements, calendrier, compte bancaire, frais du mois). Les paiements des
// chantiers sont faits directement sur son compte (ADR 0011) : MENAO lit, ne déplace rien. Les
// virements, remboursements et coordonnées bancaires se gèrent dans son tableau de bord Stripe.
import {
  connectOverviewFromStripe,
  parisMonthStart,
} from "../../../packages/core/src/connect-overview.ts";
import { adminClient, currentArtisan, json } from "../_shared/artisan.ts";
import { logStripeError, stripeClient } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const admin = adminClient();
  const ctx = await currentArtisan(req, admin);
  if (!ctx) return json({ status: "forbidden" }, 403);
  const { user, artisan } = ctx;

  const { data: allowed } = await admin.rpc("consume_rate_limit", {
    p_key: `connect-overview:${user.id}`,
    p_max: 120,
    p_window_seconds: 3600,
  });
  if (allowed !== true) return json({ status: "rate_limited" }, 429);

  const { data: row } = await admin
    .from("artisans")
    .select("stripe_account_id, connect_charges_enabled")
    .eq("id", artisan.id)
    .single();
  const accountId: string | null = row?.stripe_account_id ?? null;
  if (!accountId || !row?.connect_charges_enabled) return json({ status: "no_account" }, 404);

  try {
    const stripe = stripeClient();
    const onAccount = { stripeAccount: accountId };
    const [balance, payouts, account, transactions] = await Promise.all([
      stripe.balance.retrieve({}, onAccount),
      stripe.payouts.list({ limit: 10 }, onAccount),
      stripe.accounts.retrieve(accountId),
      stripe.balanceTransactions.list(
        { created: { gte: parisMonthStart(new Date()) }, limit: 100 },
        onAccount,
      ),
    ]);
    return json({
      status: "ok",
      overview: connectOverviewFromStripe({ balance, payouts, account, transactions }),
    });
  } catch (error) {
    logStripeError("connect-overview", error);
    return json({ status: "unavailable" }, 503);
  }
});
