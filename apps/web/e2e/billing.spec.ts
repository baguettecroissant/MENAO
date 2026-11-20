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

  // Formule et carte (ADR 0383) : formule, mode de paiement, calendrier, puis deux cases.
  const base = page.getByRole("radio", { name: /^Base/ });
  await expect(page.getByText("150 € / mois")).toBeVisible();
  // Premium recommandée, cochée par défaut (ADR 0200).
  await expect(page.getByRole("radio", { name: /^Premium/ })).toBeChecked();
  await expect(page.getByText("2 mois, dès la mise en ligne de votre fiche")).toBeVisible();
  await base.check();
  await expect(page.getByText("150 € HT par mois pendant 12 mois")).toBeVisible();

  // Choix de la formule → redirection vers Stripe Checkout (page simulée)
  await page.route("https://checkout.stripe.com/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<h1>Stripe Checkout (simulé)</h1>" }),
  );
  // Case d'engagement, distincte des conditions de vente : toutes deux exigées.
  await page.getByRole("checkbox", { name: /Je m'engage pour douze mois/ }).check();
  await page.getByRole("checkbox", { name: /J'accepte les conditions générales de vente/ }).check();
  await page.getByRole("button", { name: "Enregistrer ma carte" }).click();
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
        metadata: { artisan_id: ARTISAN_ID, engagement_version: "2026-11-20" },
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
  // Engagé, fiche pas encore en ligne : l'essai attend la mise en ligne (ADR 0383).
  await expect(page.getByRole("status")).toContainText("il démarre à la mise en ligne");
  await expect(page.getByText("12 mois à partir du premier paiement")).toBeVisible();

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
  await expect(page.getByText(/^À l'année · /)).toBeVisible();
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
  await page.getByRole("button", { name: "Moyen de paiement et factures" }).click();
  await expect
    // Vrai Stripe : billing.stripe.com ; stripe-mock : *.stripe.me.
    .poll(() => external.some((u) => /(^|\.)stripe\.(com|me)$/.test(new URL(u).hostname)))
    .toBe(true);
  await page.unrouteAll({ behavior: "ignoreErrors" });

  // Arrêt dans MENAO (ADR 0383) : fiche pas encore en ligne, renoncer ne coûte rien.
  await page.goto("/pro/onboarding/formule");
  await page.getByRole("link", { name: "Arrêter mon abonnement" }).click();
  await expect(page.getByText("Vous êtes en essai gratuit")).toBeVisible();
  await expect(page.getByText("retirée tout de suite")).toBeVisible();
  await page.getByText("Trop cher").click();
  await page.getByRole("button", { name: "Renoncer sans frais" }).click();
  await expect(page.getByText("Votre demande d'arrêt est enregistrée.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Arrêter mon abonnement" })).toHaveCount(0);
});

test("avant la validation, la formule se choisit et se paie déjà (ADR 0370)", async ({ page }) => {
  await signIn(page, "artisan@example.test");
  await page.goto("/pro/onboarding/formule");
  await expect(page.getByText("0 €, rien n'est prélevé")).toBeVisible();
  // Paiement proposé sans attendre la validation ; l'ancien choix sans paiement a disparu.
  await expect(page.getByRole("button", { name: "Enregistrer ma carte" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Choisir la formule/ })).toHaveCount(0);
});
