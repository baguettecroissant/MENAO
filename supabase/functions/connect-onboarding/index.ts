// Edge Function connect-onboarding (F-14 étape 6) : compte Stripe Connect de l'artisan validé.
// Paiements directs sur le compte de l'artisan, qui est le marchand et paie les frais Stripe ;
// Stripe porte le risque de pertes ; MENAO ne détient aucun fonds (ADR 0011).
// action « link » : crée le compte si besoin et renvoie le lien d'inscription Stripe ;
// action « refresh » : relit l'état du compte (au retour de Stripe, sans attendre le webhook).
import { connectAccountFromStripe } from "../../../packages/core/src/connect.ts";
import { adminClient, currentArtisan, json } from "../_shared/artisan.ts";
import { saveConnectAccount } from "../_shared/connect.ts";
import { logStripeError, returnOrigin, stripeClient } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const admin = adminClient();
  const ctx = await currentArtisan(req, admin);
  if (!ctx) return json({ status: "forbidden" }, 403);
  const { user, artisan } = ctx;
  if (artisan.status !== "valide" && artisan.status !== "suspendu")
    return json({ status: "not_validated" }, 403);

  const body = (await req.json().catch(() => ({}))) as { action?: string; origin?: string };
  const { data: allowed } = await admin.rpc("consume_rate_limit", {
    p_key: `connect-onboarding:${user.id}`,
    p_max: 30,
    p_window_seconds: 3600,
  });
  if (allowed !== true) return json({ status: "rate_limited" }, 429);

  const { data: row } = await admin
    .from("artisans")
    .select("stripe_account_id")
    .eq("id", artisan.id)
    .single();
  let accountId: string | null = row?.stripe_account_id ?? null;

  try {
    const stripe = stripeClient();
    if (body.action === "refresh") {
      if (!accountId) return json({ status: "no_account" }, 404);
      const snapshot = connectAccountFromStripe(await stripe.accounts.retrieve(accountId));
      if (snapshot) await saveConnectAccount(admin, snapshot);
      return json({ status: "ok", chargesEnabled: snapshot?.chargesEnabled ?? false });
    }

    if (!accountId) {
      const account = await stripe.accounts.create({
        country: "FR",
        email: user.email,
        controller: {
          fees: { payer: "account" },
          losses: { payments: "stripe" },
          stripe_dashboard: { type: "full" },
          requirement_collection: "stripe",
        },
        business_profile: {
          name: artisan.raison_sociale ?? undefined,
          mcc: "1520", // Entrepreneurs généraux du bâtiment
        },
        metadata: { artisan_id: artisan.id },
      });
      accountId = account.id;
      const { error } = await admin
        .from("artisans")
        .update({ stripe_account_id: accountId })
        .eq("id", artisan.id);
      if (error) throw error;
    }

    const origin = returnOrigin(body.origin);
    const link = await stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      refresh_url: `${origin}/pro/onboarding/paiements?lien=expire`,
      return_url: `${origin}/pro/onboarding/paiements?retour=1`,
    });
    return json({ status: "ok", url: link.url });
  } catch (error) {
    logStripeError("connect-onboarding", error);
    return json({ status: "unavailable" }, 503);
  }
});
