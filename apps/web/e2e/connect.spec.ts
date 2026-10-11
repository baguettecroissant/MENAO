import { expect, test } from "@playwright/test";
import { signedStripeEvent } from "./stripe";

// Seed : paiement@example.test (validé, en essai, compte Connect acct_seed_paiement inactif).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const CONNECT_SECRET = process.env.STRIPE_CONNECT_WEBHOOK_SECRET ?? "whsec_menao_connect_ci";

test("paiements Stripe Connect : configuration, compte actif, artisan visible", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill("paiement@example.test");
  await page.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/\/pro\/tableau-de-bord$/);
  await expect(
    page.getByText("Votre profil n'est pas encore visible des particuliers"),
  ).toBeVisible();
  await page.goto("/pro/onboarding");
  // Contenu de la page (le menu latéral répète l'état de visibilité, ADR 0035).
  const main = page.getByRole("main");
  await expect(main.getByText("un compte de paiement actif")).toBeVisible();
  await expect(main.getByText("un abonnement actif")).toHaveCount(0);

  // Reprise de la configuration : redirection vers Stripe (simulée)
  await page.goto("/pro/onboarding/paiements");
  await expect(page.getByText("ne touche jamais l'argent de vos chantiers")).toBeVisible();
  const external: string[] = [];
  await page.route(
    (url) => url.hostname !== "localhost",
    (route) => {
      external.push(route.request().url());
      return route.fulfill({ contentType: "text/html", body: "<h1>Stripe (simulé)</h1>" });
    },
  );
  await page.getByRole("button", { name: "Reprendre la configuration Stripe" }).click();
  await expect
    .poll(() => external.some((u) => /(^|\.)stripe\.(com|me)$/.test(new URL(u).hostname)))
    .toBe(true);
  await page.unrouteAll();

  // Stripe signale le compte actif (webhook Connect signé)
  const now = Math.floor(Date.now() / 1000);
  const event = {
    id: `evt_connect_${now}`,
    object: "event",
    type: "account.updated",
    api_version: "2026-09-30.endive",
    created: now,
    livemode: false,
    account: "acct_seed_paiement",
    data: {
      object: {
        id: "acct_seed_paiement",
        object: "account",
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
        metadata: {},
      },
    },
  };
  const signed = signedStripeEvent(event, CONNECT_SECRET);
  const res = await request.post(`${SUPABASE_URL}/functions/v1/stripe-webhook`, {
    data: signed.payload,
    headers: { "Stripe-Signature": signed.header, "Content-Type": "application/json" },
  });
  expect(res.status()).toBe(200);

  await page.goto("/pro/onboarding/paiements");
  await expect(page.getByText("Votre compte de paiement est actif")).toBeVisible();
  await page.goto("/pro/onboarding");
  await expect(page.getByText("Votre profil est visible des particuliers")).toBeVisible();
});
