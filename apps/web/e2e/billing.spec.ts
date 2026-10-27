import { expect, test, type Page } from "./test";
import { signedStripeEvent } from "./stripe";

// Stripe est remplacé par stripe-mock en CI ; les webhooks sont simulés et signés ici.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_menao_ci";
const ARTISAN_ID = "b0000000-0000-4000-8000-000000000009"; // seed : abonnement@example.test

async function signIn(page: Page, email: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await page.getByRole("button", { name: "Me connecter" }).click();
  // Artisan validé : tableau de bord ; dossier en cours : inscription.
  await expect(page).toHaveURL(/\/pro\/(tableau-de-bord|onboarding)/);
}

test("abonnement : Checkout, webhook signé et idempotent, portail", async ({ page, request }) => {
  test.setTimeout(90_000);
  await signIn(page, "abonnement@example.test");
  await page.goto("/pro/onboarding/formule");

  const base = page.getByRole("region", { name: "Base" });
  await expect(base.getByText("150 €")).toBeVisible();
  await expect(base.getByText("2 mois offerts", { exact: true })).toBeVisible();
  // Trois formules ouvertes, Premium recommandée (ADR 0200).
  await expect(page.getByRole("region", { name: "Premium" }).getByText("Recommandé")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Entreprise" }).getByRole("button", {
      name: "Choisir Entreprise au mois",
    }),
  ).toBeVisible();

  // Choix de la formule → redirection vers Stripe Checkout (page simulée)
  await page.route("https://checkout.stripe.com/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<h1>Stripe Checkout (simulé)</h1>" }),
  );
  // Au mois ou à l'année (ADR 0200) : engagement et premier paiement annoncés avant de payer.
  await expect(page.getByText(/^À l'année : 12 mois payés d'avance, 2 mois offerts/)).toBeVisible();
  await base.getByRole("button", { name: "Choisir Base au mois" }).click();
  await expect(page).toHaveURL(/^https:\/\/checkout\.stripe\.com\//);

  // Stripe confirme l'abonnement en essai : webhook signé
  const now = Math.floor(Date.now() / 1000);
  const trialEnd = now + 60 * 86_400;
  const event = {
    id: `evt_e2e_${now}`,
    object: "event",
    type: "customer.subscription.created",
    api_version: "2026-09-30.endive",
    created: now,
    livemode: false,
    data: {
      object: {
        id: `sub_e2e_${now}`,
        object: "subscription",
        customer: "cus_e2e",
        status: "trialing",
        cancel_at_period_end: false,
        trial_end: trialEnd,
        metadata: { artisan_id: ARTISAN_ID },
        items: {
          object: "list",
          data: [
            {
              current_period_end: trialEnd,
              price: { id: "price_e2e", lookup_key: "menao_base_mensuel" },
            },
          ],
        },
      },
    },
  };
  const url = `${SUPABASE_URL}/functions/v1/stripe-webhook`;
  const signed = signedStripeEvent(event, WEBHOOK_SECRET);
  const first = await request.post(url, {
    data: signed.payload,
    headers: { "Stripe-Signature": signed.header, "Content-Type": "application/json" },
  });
  expect(first.status()).toBe(200);
  expect(await first.json()).toEqual({ received: true });

  const again = signedStripeEvent(event, WEBHOOK_SECRET);
  const duplicate = await request.post(url, {
    data: again.payload,
    headers: { "Stripe-Signature": again.header, "Content-Type": "application/json" },
  });
  expect(await duplicate.json()).toEqual({ received: true, duplicate: true });

  const forged = signedStripeEvent({ ...event, id: `evt_forge_${now}` }, "whsec_mauvais_secret");
  const rejected = await request.post(url, {
    data: forged.payload,
    headers: { "Stripe-Signature": forged.header, "Content-Type": "application/json" },
  });
  expect(rejected.status()).toBe(400);

  // L'artisan voit son abonnement et ouvre le portail
  await page.goto("/pro/onboarding/formule");
  await expect(page.getByRole("heading", { name: "Votre abonnement : Base" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Période d'essai jusqu'au");

  // Passage au prix annuel (portail ou nouvel abonnement) : périodicité enregistrée par le webhook.
  const yearly = {
    ...event,
    id: `evt_e2e_annuel_${now}`,
    type: "customer.subscription.updated",
    data: {
      object: {
        ...event.data.object,
        items: {
          object: "list",
          data: [
            {
              current_period_end: trialEnd,
              price: {
                id: "price_e2e_annuel",
                lookup_key: "menao_base_annuel",
                recurring: { interval: "year" },
              },
            },
          ],
        },
      },
    },
  };
  const yearlySigned = signedStripeEvent(yearly, WEBHOOK_SECRET);
  const yearlyResponse = await request.post(url, {
    data: yearlySigned.payload,
    headers: { "Stripe-Signature": yearlySigned.header, "Content-Type": "application/json" },
  });
  expect(yearlyResponse.status()).toBe(200);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Votre abonnement : Base" })).toBeVisible();
  await expect(
    page.getByText(/^Paiement à l'année : engagement de 12 mois à partir du/),
  ).toBeVisible();
  await page.goto("/pro/onboarding");
  await expect(page.getByRole("link", { name: /Choisir votre formule.*Fait/ })).toBeVisible();
  await page.goto("/pro/onboarding/formule");

  // URL du portail fournie par Stripe (stripe-mock en CI) : toute navigation externe est simulée.
  const external: string[] = [];
  await page.route(
    (url) => url.hostname !== "localhost",
    (route) => {
      external.push(route.request().url());
      return route.fulfill({ contentType: "text/html", body: "<h1>Portail Stripe (simulé)</h1>" });
    },
  );
  await page.getByRole("button", { name: "Gérer mon abonnement" }).click();
  await expect
    // Vrai Stripe : billing.stripe.com ; stripe-mock : *.stripe.me.
    .poll(() => external.some((u) => /(^|\.)stripe\.(com|me)$/.test(new URL(u).hostname)))
    .toBe(true);
});

test("abonnement indisponible tant que le dossier n'est pas validé", async ({ page }) => {
  await signIn(page, "artisan@example.test");
  await page.goto("/pro/onboarding/formule");
  await expect(page.getByText("dès que l'équipe MENAO aura validé votre dossier")).toBeVisible();
  await expect(page.getByRole("button", { name: /Choisir la formule/ })).toHaveCount(0);
});
