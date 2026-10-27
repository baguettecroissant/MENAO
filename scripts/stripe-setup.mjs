#!/usr/bin/env node
// Mise en place Stripe de MENAO (F-15), idempotente. Aucune dépendance.
// Lit les formules dans Supabase (table plans), puis crée ou met à jour dans Stripe :
// produits + prix HT au mois et à l'année (lookup_key, ADR 0200), taux de TVA 20 %, portail client,
// webhooks (abonnements et Connect). Écrit les identifiants dans le fichier d'environnement donné, sans
// jamais afficher le secret du webhook.
//
// Usage :
//   set -a; . ./.env.staging; set +a
//   SUPABASE_URL=… SUPABASE_PUBLISHABLE_KEY=… node scripts/stripe-setup.mjs \
//     --env-file .env.staging --webhook-url https://<ref>.supabase.co/functions/v1/stripe-webhook
import { readFileSync, writeFileSync } from "node:fs";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .reduce(
      (acc, cur, i, all) => (cur.startsWith("--") ? [...acc, [cur.slice(2), all[i + 1]]] : acc),
      [],
    ),
);
const { STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = process.env;
if (!STRIPE_SECRET_KEY?.startsWith("sk_")) throw new Error("STRIPE_SECRET_KEY manquante");
if (!STRIPE_SECRET_KEY.startsWith("sk_test_") && args.live !== "oui") {
  throw new Error("Clé de production : relancer avec --live oui après vérification");
}
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY)
  throw new Error("SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY manquantes");
const envFile = args["env-file"];
const webhookUrl = args["webhook-url"];
if (!envFile || !webhookUrl) throw new Error("--env-file et --webhook-url requis");

const API_VERSION = "2026-09-30.endive";
const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  // Premier paiement réel après l'essai : prime des prescripteurs (F-59).
  "invoice.paid",
];

function encode(params, prefix = "") {
  return Object.entries(params).flatMap(([key, value]) => {
    const name = prefix ? `${prefix}[${key}]` : key;
    if (value === undefined) return [];
    if (Array.isArray(value)) {
      return value.flatMap((v, i) =>
        typeof v === "object" ? encode(v, `${name}[${i}]`) : [[`${name}[]`, String(v)]],
      );
    }
    if (typeof value === "object") return encode(value, name);
    return [[name, String(value)]];
  });
}

async function stripe(method, path, params = {}) {
  const body = new URLSearchParams(encode(params));
  const url = `https://api.stripe.com/v1/${path}${method === "GET" && body.size ? `?${body}` : ""}`;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}`, "Stripe-Version": API_VERSION },
    body: method === "GET" ? undefined : body,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Stripe ${method} ${path} : ${json.error?.message ?? res.status}`);
  return json;
}

function setEnv(updates) {
  let text = readFileSync(envFile, "utf8");
  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${value}`;
    text = new RegExp(`^${key}=.*$`, "m").test(text)
      ? text.replace(new RegExp(`^${key}=.*$`, "m"), line)
      : `${text.replace(/\n?$/, "\n")}${line}\n`;
  }
  writeFileSync(envFile, text);
}

// 1. Formules (source : base de données)
const res = await fetch(
  `${SUPABASE_URL}/rest/v1/plans?select=code,nom,prix_mensuel_ht_centimes,stripe_lookup_key,stripe_lookup_key_annuel,ouverte&order=ordre`,
  {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
  },
);
const plans = await res.json();
if (!Array.isArray(plans) || plans.length === 0)
  throw new Error("Aucune formule lue dans Supabase");

const prices = {};
for (const plan of plans) {
  const existing = await stripe("GET", "prices", {
    lookup_keys: [plan.stripe_lookup_key],
    active: true,
    limit: 1,
  });
  let price = existing.data[0];
  if (price && price.unit_amount !== plan.prix_mensuel_ht_centimes) {
    // Prix modifié en base : nouveau prix, la lookup_key lui est transférée.
    price = await stripe("POST", "prices", {
      product: price.product,
      currency: "eur",
      unit_amount: plan.prix_mensuel_ht_centimes,
      recurring: { interval: "month" },
      tax_behavior: "exclusive",
      lookup_key: plan.stripe_lookup_key,
      transfer_lookup_key: true,
      nickname: `${plan.nom} mensuel HT`,
    });
    console.log(`Prix mis à jour : ${plan.code}`);
  } else if (!price) {
    const product = await stripe("POST", "products", {
      name: `MENAO ${plan.nom}`,
      metadata: { menao_plan: plan.code },
    });
    price = await stripe("POST", "prices", {
      product: product.id,
      currency: "eur",
      unit_amount: plan.prix_mensuel_ht_centimes,
      recurring: { interval: "month" },
      tax_behavior: "exclusive",
      lookup_key: plan.stripe_lookup_key,
      nickname: `${plan.nom} mensuel HT`,
    });
    console.log(`Formule créée : ${plan.code}`);
  } else {
    console.log(`Formule déjà en place : ${plan.code}`);
  }
  // À l'année (ADR 0200) : 12 mois payés d'avance au prix de 10 (ANNUAL_FREE_MONTHS de @menao/core).
  const annualAmount = plan.prix_mensuel_ht_centimes * 10;
  const annualExisting = await stripe("GET", "prices", {
    lookup_keys: [plan.stripe_lookup_key_annuel],
    active: true,
    limit: 1,
  });
  const annual = annualExisting.data[0];
  if (annual && annual.unit_amount === annualAmount) {
    console.log(`Prix annuel déjà en place : ${plan.code}`);
  } else {
    await stripe("POST", "prices", {
      product: price.product,
      currency: "eur",
      unit_amount: annualAmount,
      recurring: { interval: "year" },
      tax_behavior: "exclusive",
      lookup_key: plan.stripe_lookup_key_annuel,
      ...(annual ? { transfer_lookup_key: true } : {}),
      nickname: `${plan.nom} annuel HT`,
    });
    console.log(`Prix annuel ${annual ? "mis à jour" : "créé"} : ${plan.code}`);
  }
  prices[plan.code] = { price: price.id, product: price.product, ouverte: plan.ouverte };
}

// 2. TVA 20 % (TODO(legal) : à valider par l'expert-comptable)
const taxRates = await stripe("GET", "tax_rates", { active: true, limit: 100 });
let taxRate = taxRates.data.find((t) => t.metadata?.menao === "tva_20");
if (!taxRate) {
  taxRate = await stripe("POST", "tax_rates", {
    display_name: "TVA",
    description: "TVA 20 % France",
    percentage: 20,
    inclusive: false,
    country: "FR",
    jurisdiction: "FR",
    tax_type: "vat",
    metadata: { menao: "tva_20" },
  });
  console.log("Taux de TVA créé");
}

// 2 bis. Coupon du parrainage (F-60, ADR 0137) : 100 % sur une facture, posé par stripe-webhook.
// TODO(legal) : conditions du parrainage à inscrire dans les CGV artisans.
const REFERRAL_COUPON_ID = "menao-parrainage-1-mois";
const coupons = await stripe("GET", "coupons", { limit: 100 });
if (coupons.data.some((coupon) => coupon.id === REFERRAL_COUPON_ID)) {
  console.log("Coupon du parrainage : déjà en place");
} else {
  await stripe("POST", "coupons", {
    id: REFERRAL_COUPON_ID,
    name: "Parrainage MENAO : 1 mois offert",
    percent_off: 100,
    duration: "once",
    metadata: { menao: "parrainage" },
  });
  console.log("Coupon du parrainage créé");
}

// 3. Portail client
const open = Object.values(prices).filter((p) => p.ouverte);
const portalParams = {
  business_profile: { headline: "MENAO — gestion de votre abonnement" },
  features: {
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    customer_update: { enabled: true, allowed_updates: ["email", "address", "tax_id"] },
    subscription_cancel: { enabled: true, mode: "at_period_end" },
    subscription_update:
      open.length > 1
        ? {
            enabled: true,
            default_allowed_updates: ["price"],
            proration_behavior: "create_prorations",
            products: open.map((p) => ({ product: p.product, prices: [p.price] })),
          }
        : { enabled: false },
  },
  metadata: { menao: "portail" },
};
const portals = await stripe("GET", "billing_portal/configurations", { active: true, limit: 100 });
let portal = portals.data.find((p) => p.metadata?.menao === "portail");
portal = portal
  ? await stripe("POST", `billing_portal/configurations/${portal.id}`, portalParams)
  : await stripe("POST", "billing_portal/configurations", portalParams);
console.log("Portail client configuré");

// 4. Webhooks (le secret n'est lisible qu'à la création) : compte de la plateforme (abonnements)
// et comptes connectés (Connect, ADR 0011).
const envText = readFileSync(envFile, "utf8");
const updates = { STRIPE_TAX_RATE_ID: taxRate.id, STRIPE_PORTAL_CONFIGURATION_ID: portal.id };
const endpoints = await stripe("GET", "webhook_endpoints", { limit: 100 });

async function ensureEndpoint({ connect, events, envKey, description }) {
  const hasSecret = new RegExp(`^${envKey}=whsec_`, "m").test(envText);
  let endpoint = endpoints.data.find(
    (e) => e.url === webhookUrl && Boolean(e.application) === connect,
  );
  if (endpoint && hasSecret) {
    await stripe("POST", `webhook_endpoints/${endpoint.id}`, { enabled_events: events });
    console.log(`${description} : déjà en place (événements synchronisés)`);
    return;
  }
  if (endpoint) await stripe("DELETE", `webhook_endpoints/${endpoint.id}`);
  endpoint = await stripe("POST", "webhook_endpoints", {
    url: webhookUrl,
    enabled_events: events,
    api_version: API_VERSION,
    description: `MENAO — ${description}`,
    ...(connect ? { connect: true } : {}),
  });
  updates[envKey] = endpoint.secret;
  console.log(`${description} : créé (secret écrit dans le fichier d'environnement)`);
}

await ensureEndpoint({
  connect: false,
  events: WEBHOOK_EVENTS,
  envKey: "STRIPE_WEBHOOK_SECRET",
  description: "Webhook abonnements",
});
await ensureEndpoint({
  connect: true,
  // Comptes des artisans (ADR 0011) et paiements des chantiers (F-31, ADR 0023).
  events: [
    "account.updated",
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "checkout.session.async_payment_failed",
    "checkout.session.expired",
  ],
  envKey: "STRIPE_CONNECT_WEBHOOK_SECRET",
  description: "Webhook Connect",
});
setEnv(updates);
console.log(`Terminé : ${Object.keys(updates).join(", ")} → ${envFile}`);
