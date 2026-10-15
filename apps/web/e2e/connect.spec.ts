import { type APIRequestContext, expect, test } from "./test";
import { signedStripeEvent } from "./stripe";

// Seed : paiement@example.test (validé, en essai, compte Connect acct_seed_paiement inactif).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const CONNECT_SECRET = process.env.STRIPE_CONNECT_WEBHOOK_SECRET ?? "whsec_menao_connect_ci";
const longDay = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });

/** Webhook Connect « account.updated » signé, pour le compte du seed. */
async function accountUpdated(
  request: APIRequestContext,
  name: string,
  account: Record<string, unknown>,
) {
  const now = Math.floor(Date.now() / 1000);
  const event = {
    id: `evt_connect_${name}_${now}`,
    object: "event",
    type: "account.updated",
    api_version: "2026-09-30.endive",
    created: now,
    livemode: false,
    account: "acct_seed_paiement",
    data: { object: { id: "acct_seed_paiement", object: "account", metadata: {}, ...account } },
  };
  const signed = signedStripeEvent(event, CONNECT_SECRET);
  const res = await request.post(`${SUPABASE_URL}/functions/v1/stripe-webhook`, {
    data: signed.payload,
    headers: { "Stripe-Signature": signed.header, "Content-Type": "application/json" },
  });
  expect(res.status()).toBe(200);
}

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

  // Stripe attend encore des informations : rubriques lisibles et date limite (F-14).
  const deadline = Math.floor(Date.now() / 1000) + 10 * 86_400;
  await accountUpdated(request, "a_completer", {
    charges_enabled: false,
    payouts_enabled: false,
    details_submitted: true,
    requirements: {
      currently_due: ["external_account", "individual.verification.document"],
      past_due: [],
      pending_verification: [],
      disabled_reason: "requirements.past_due",
      current_deadline: deadline,
    },
  });
  await page.goto("/pro/onboarding/paiements");
  await expect(
    main.getByText("Stripe attend encore quelques informations pour activer vos paiements :"),
  ).toBeVisible();
  await expect(
    main.getByText("Coordonnées bancaires (IBAN) pour recevoir vos paiements"),
  ).toBeVisible();
  await expect(main.getByText("Pièce d'identité du représentant légal")).toBeVisible();
  await expect(
    main.getByText(`À fournir avant le ${longDay.format(new Date(deadline * 1000))}.`),
  ).toBeVisible();
  await expect(
    main.getByRole("button", { name: "Compléter mes informations sur Stripe" }),
  ).toBeVisible();

  // Informations transmises : Stripe les vérifie, rien à faire en attendant.
  await accountUpdated(request, "verification", {
    charges_enabled: false,
    payouts_enabled: false,
    details_submitted: true,
    requirements: {
      currently_due: [],
      past_due: [],
      pending_verification: ["individual.verification.document"],
      disabled_reason: "requirements.pending_verification",
    },
  });
  await page.goto("/pro/onboarding/paiements");
  await expect(
    main.getByText("Stripe vérifie les informations transmises.", { exact: false }),
  ).toBeVisible();
  await expect(main.getByText("Pièce d'identité du représentant légal")).toBeVisible();
  await expect(main.getByRole("link", { name: "Actualiser l'état de mon compte" })).toHaveAttribute(
    "href",
    "/pro/onboarding/paiements?retour=1",
  );
  await expect(main.getByRole("button", { name: /Stripe/ })).toHaveCount(0);

  // Stripe signale le compte actif (webhook Connect signé)
  await accountUpdated(request, "actif", {
    charges_enabled: true,
    payouts_enabled: true,
    details_submitted: true,
  });

  await page.goto("/pro/onboarding/paiements");
  await expect(page.getByText("Votre compte de paiement est actif")).toBeVisible();
  await expect(main.getByText("Stripe attend encore", { exact: false })).toHaveCount(0);
  await page.goto("/pro/onboarding");
  await expect(page.getByText("Votre profil est visible des particuliers")).toBeVisible();
});
