// Edge Function billing-portal (F-15) : portail Stripe de l'artisan (changer de formule, résilier
// en fin de période, moyen de paiement, factures).
import { adminClient, currentArtisan, json } from "../_shared/artisan.ts";
import { env } from "../_shared/env.ts";
import { returnOrigin, stripeClient } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const admin = adminClient();
  const ctx = await currentArtisan(req, admin);
  if (!ctx) return json({ status: "forbidden" }, 403);
  if (!ctx.artisan.stripe_customer_id) return json({ status: "no_customer" }, 404);

  const body = (await req.json().catch(() => ({}))) as { origin?: string };
  try {
    const configuration = env("STRIPE_PORTAL_CONFIGURATION_ID");
    const session = await stripeClient().billingPortal.sessions.create({
      customer: ctx.artisan.stripe_customer_id,
      return_url: `${returnOrigin(body.origin)}/pro/onboarding/formule`,
      locale: "fr",
      ...(configuration ? { configuration } : {}),
    });
    return json({ status: "ok", url: session.url });
  } catch (error) {
    console.error("billing-portal : erreur Stripe", error instanceof Error ? error.name : "");
    return json({ status: "unavailable" }, 503);
  }
});
