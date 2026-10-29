// Edge Function connect-onboarding (F-14 étape 6) : compte Stripe Connect de l'artisan validé.
// Paiements directs sur le compte de l'artisan, qui est le marchand et paie les frais Stripe ;
// Stripe porte le risque de pertes ; MENAO ne détient aucun fonds (ADR 0011).
// action « link » : crée le compte si besoin et renvoie le lien d'inscription Stripe ;
// action « refresh » : relit l'état du compte (au retour de Stripe, sans attendre le webhook) ;
// action « prefill » : avant la création du compte, données d'identité à transformer en jetons
// Stripe par le navigateur ou l'application, avec la clé publique (ADR 0204).
// À la création, le compte est pré-rempli avant le premier lien : profil public par le serveur,
// identité par les jetons reçus. Un pré-remplissage refusé par Stripe ne bloque jamais l'inscription.
// Depuis l'application (`app: true`), la fin de l'inscription Stripe passe par la page de retour du
// site, qui rouvre l'application sur l'écran des paiements (ADR 0060, 0124).
import type Stripe from "stripe";
import { appReturnUrl } from "../../../packages/core/src/app-return.ts";
import { connectAccountFromStripe } from "../../../packages/core/src/connect.ts";
import {
  type ConnectProfileParams,
  connectPrefill,
  isConnectToken,
  isStripePublishableKey,
} from "../../../packages/core/src/connect-prefill.ts";
import { adminClient, currentArtisan, json } from "../_shared/artisan.ts";
import { prefillSource, saveConnectAccount } from "../_shared/connect.ts";
import { env } from "../_shared/env.ts";
import { logStripeError, returnOrigin, stripeClient } from "../_shared/stripe.ts";

/**
 * Pré-remplit un compte qui vient d'être créé, avant le premier lien d'inscription. Chaque étape
 * est indépendante : une donnée refusée par Stripe sera simplement demandée à l'artisan.
 */
async function prefillAccount(
  stripe: Stripe,
  accountId: string,
  profile: ConnectProfileParams,
  tokens: { account?: string; person?: string },
) {
  const steps: [string, () => Promise<unknown>][] = [
    ["profil", () => stripe.accounts.update(accountId, profile)],
  ];
  if (tokens.account)
    steps.push([
      "entreprise",
      () => stripe.accounts.update(accountId, { account_token: tokens.account }),
    ]);
  if (tokens.person)
    steps.push([
      "dirigeant",
      () => stripe.accounts.createPerson(accountId, { person_token: tokens.person }),
    ]);
  for (const [label, step] of steps) {
    try {
      await step();
    } catch (error) {
      logStripeError(`connect-onboarding pré-remplissage ${label}`, error);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const admin = adminClient();
  const ctx = await currentArtisan(req, admin);
  if (!ctx) return json({ status: "forbidden" }, 403);
  const { user, artisan } = ctx;
  if (artisan.status !== "valide" && artisan.status !== "suspendu")
    return json({ status: "not_validated" }, 403);

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    origin?: string;
    app?: unknown;
    accountToken?: unknown;
    personToken?: unknown;
  };
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

    if (body.action === "prefill") {
      // Compte déjà créé : Stripe n'accepte plus de modification de l'identité.
      const publishableKey = env("STRIPE_PUBLISHABLE_KEY");
      if (accountId || !isStripePublishableKey(publishableKey))
        return json({ status: "ok", prefill: null });
      const { account, person } = connectPrefill(await prefillSource(admin, artisan.id, user));
      if (!account && !person) return json({ status: "ok", prefill: null });
      return json({ status: "ok", prefill: { publishableKey, account, person } });
    }

    if (!accountId) {
      const prefill = connectPrefill(await prefillSource(admin, artisan.id, user));
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
          name: prefill.name ?? undefined,
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
      await prefillAccount(stripe, accountId, prefill.profile, {
        account: isConnectToken("account", body.accountToken) ? body.accountToken : undefined,
        person: isConnectToken("person", body.personToken) ? body.personToken : undefined,
      });
    }

    const origin = returnOrigin(body.origin);
    const app = body.app === true;
    const link = await stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      refresh_url: app
        ? appReturnUrl(origin, { screen: "paiements", id: artisan.id, state: "connect_expire" })
        : `${origin}/pro/onboarding/paiements?lien=expire`,
      return_url: app
        ? appReturnUrl(origin, { screen: "paiements", id: artisan.id, state: "connect" })
        : `${origin}/pro/onboarding/paiements?retour=1`,
    });
    return json({ status: "ok", url: link.url });
  } catch (error) {
    logStripeError("connect-onboarding", error);
    return json({ status: "unavailable" }, 503);
  }
});
