import { expect, test, type Page } from "@playwright/test";
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
  await expect(page).toHaveURL(/\/pro\/onboarding/);
}

test("abonnement : Checkout, webhook signé et idempotent, portail", async ({ page, request }) => {
  test.setTimeout(90_000);
  await signIn(page, "abonnement@example.test");
  await page.goto("/pro/onboarding/formule");

  const base = page.getByRole("region", { name: "Base" });
  await expect(base.getByText("150 €")).toBeVisible();
  await expect(base.getByText("3 mois offerts")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Premium" }).getByText("Bientôt disponible"),
  ).toBeVisible();

  // Choix de la formule → redirection vers Stripe Checkout (page simulée)
  await page.route("https://checkout.stripe.com/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<h1>Stripe Checkout (simulé)</h1>" }),
  );
  await base.getByRole("button", { name: "Choisir la formule Base" }).click();
  await expect(page).toHaveURL(/^https:\/\/checkout\.stripe\.com\//);

  // Stripe confirme l'abonnement en essai : webhook signé
  const now = Math.floor(Date.now() / 1000);
  const trialEnd = now + 90 * 86_400;
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
  await expect(
    page
      .getByRole("navigation", { name: "Étapes de l'inscription" })
      .getByRole("link", { name: /Formule.*terminée/ }),
  ).toBeVisible();

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
    .poll(() => external.some((u) => new URL(u).hostname.endsWith("stripe.com")))
    .toBe(true);
});

test("abonnement indisponible tant que le dossier n'est pas validé", async ({ page }) => {
  await signIn(page, "artisan@example.test");
  await page.goto("/pro/onboarding/formule");
  await expect(page.getByText("dès que l'équipe MENAO aura validé votre dossier")).toBeVisible();
  await expect(page.getByRole("button", { name: /Choisir la formule/ })).toHaveCount(0);
});
