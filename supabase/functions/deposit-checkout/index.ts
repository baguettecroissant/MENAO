// Edge Function deposit-checkout (F-31, F-32) : paiement de l'acompte, ou du solde une fois le
// chantier réceptionné, avec Stripe Checkout créé directement sur le compte Stripe de l'artisan
// (charge directe, ADR 0011). Aucune commission ni application_fee : MENAO ne prend jamais
// d'argent sur les chantiers (CLAUDE.md règle 12). particulier_start_deposit et
// particulier_start_balance, appelées au nom du client, décident de l'accès et du montant
// (échéancier figé, solde calculé). Depuis l'application (`app: true`), la fin du paiement passe
// par la page de retour du site, qui rouvre l'application (ADR 0060). Aucune donnée personnelle
// journalisée. ADR 0023, 0029.
import { createClient } from "@supabase/supabase-js";
import { appReturnUrl, type AppReturn } from "../../../packages/core/src/app-return.ts";
import { adminClient, json } from "../_shared/artisan.ts";
import { env } from "../_shared/env.ts";
import { logStripeError, returnOrigin, stripeClient } from "../_shared/stripe.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type Started = {
  payment_id: string;
  quote_id?: string;
  amount_cents: number;
  stripe_account_id: string;
  previous_session_id: string | null;
  numero: string;
  client_email: string | null;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const authorization = req.headers.get("Authorization") ?? "";
  if (!/^Bearer\s+\S+$/i.test(authorization)) return json({ status: "forbidden" }, 401);

  const body = (await req.json().catch(() => null)) as {
    quoteId?: unknown;
    chantierId?: unknown;
    origin?: unknown;
    app?: unknown;
  } | null;
  // Acompte : devis signé ; solde : chantier réceptionné.
  const chantierId = typeof body?.chantierId === "string" ? body.chantierId : "";
  const balance = UUID.test(chantierId);
  const requestedQuote = typeof body?.quoteId === "string" ? body.quoteId : "";
  if (!balance && !UUID.test(requestedQuote)) return json({ status: "invalid" }, 400);

  // Client au nom de l'utilisateur : auth.uid() et ses droits s'appliquent en base.
  const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = adminClient();
  const { data: user } = await admin.auth.getUser(authorization.replace(/^Bearer\s+/i, ""));
  if (!user.user) return json({ status: "forbidden" }, 401);
  const { data: allowed } = await admin.rpc("consume_rate_limit", {
    p_key: `deposit-checkout:${user.user.id}`,
    p_max: 20,
    p_window_seconds: 3600,
  });
  if (allowed !== true) return json({ status: "rate_limited" }, 429);

  const { data: start, error } = balance
    ? await supabase.rpc("particulier_start_balance", { p_chantier_id: chantierId })
    : await supabase.rpc("particulier_start_deposit", { p_quote_id: requestedQuote });
  if (error) {
    return error.code === "22023"
      ? json({ status: "refused", message: error.message }, 409)
      : json({ status: "forbidden" }, 403);
  }
  const started = start as Started;
  const stripeAccount = started.stripe_account_id;
  const quoteId = started.quote_id ?? requestedQuote;

  try {
    const stripe = stripeClient();
    // Une seule session payable à la fois : l'ancienne est expirée avant d'en ouvrir une nouvelle.
    if (started.previous_session_id) {
      await stripe.checkout.sessions
        .expire(started.previous_session_id, {}, { stripeAccount })
        .catch(() => undefined);
    }
    const origin = returnOrigin(body?.origin);
    // Application : retour par la page du site qui rouvre l'écran d'origine (paiement ou abandon).
    const appTarget: Omit<AppReturn, "state"> | null =
      body?.app === true
        ? balance
          ? { screen: "chantier", id: chantierId }
          : { screen: "devis", id: quoteId }
        : null;
    const label = `${balance ? "Solde" : "Acompte"} du devis ${started.numero}`;
    const metadata = { menao_quote_id: quoteId, menao_kind: balance ? "solde" : "acompte" };
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        locale: "fr",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "eur",
              unit_amount: started.amount_cents,
              product_data: { name: label },
            },
          },
        ],
        ...(started.client_email ? { customer_email: started.client_email } : {}),
        metadata,
        payment_intent_data: { description: label, metadata },
        success_url: appTarget
          ? appReturnUrl(origin, { ...appTarget, state: "paiement" })
          : balance
            ? `${origin}/mon-espace/chantiers/${chantierId}?paiement=termine`
            : `${origin}/mon-espace/devis/${quoteId}?paiement=termine`,
        cancel_url: appTarget
          ? appReturnUrl(origin, { ...appTarget, state: "annule" })
          : balance
            ? `${origin}/mon-espace/chantiers/${chantierId}/solde`
            : `${origin}/mon-espace/devis/${quoteId}/acompte`,
      },
      { stripeAccount },
    );
    const { error: updateError } = await admin
      .from("payments")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", started.payment_id)
      .eq("status", "en_attente");
    if (updateError) throw new Error(updateError.message);
    return json({ status: "ok", url: session.url });
  } catch (e) {
    logStripeError("deposit-checkout", e);
    return json({ status: "unavailable" }, 503);
  }
});
