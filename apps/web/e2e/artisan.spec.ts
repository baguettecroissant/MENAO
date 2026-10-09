import { expect, test } from "@playwright/test";
import { fakeSiret, mockGeocoding } from "./fixtures";
import { authLinkFor } from "./mailpit";

// Données fictives uniquement (domaine .test, tranche ARCEP fiction, SIRET du faux serveur Sirene).
const password = "mot-de-passe-e2e-artisan";

test.beforeEach(async ({ page }) => {
  await mockGeocoding(page);
});

test("inscription artisan puis onboarding : entreprise, métiers, zone", async ({
  page,
  request,
}) => {
  const email = `e2e-pro-${Date.now()}@example.test`;
  const nextYear = `${new Date().getFullYear() + 1}-06-30`;

  await page.goto("/pro");
  await page.getByRole("link", { name: "Créer mon compte pro" }).click();
  await expect(page).toHaveURL(/\/pro\/inscription$/);
  await page.getByLabel("Prénom").fill("Dominique");
  await page.getByLabel("Nom", { exact: true }).fill("Exemple");
  await page.getByLabel("Numéro SIRET").fill(fakeSiret("active"));
  await page.getByLabel("Téléphone").fill("06 39 98 00 04");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByLabel(/J'accepte les conditions générales d'utilisation/).check();
  await page.getByLabel(/J'accepte les conditions générales de vente/).check();
  await page.getByRole("button", { name: "Créer mon compte pro" }).click();
  await expect(page).toHaveURL(/\/verifier-email$/);

  await page.goto(await authLinkFor(request, email));
  await expect(page).toHaveURL(/\/pro\/onboarding\/entreprise$/);

  // Étape 1 — entreprise
  await page.getByRole("button", { name: "Vérifier mon SIRET auprès de l'INSEE" }).click();
  await expect(page.getByRole("main").getByRole("status")).toHaveText(
    "Entreprise trouvée et active.",
  );
  await expect(page.getByText("MENUISERIE EXEMPLE")).toBeVisible();
  await expect(page.getByText("SARL")).toBeVisible();
  await page.getByLabel("Oui").check();
  await expect(page.getByText(/^FR\d{11}$/)).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer et continuer" }).click();
  await expect(page).toHaveURL(/\/pro\/onboarding\/metiers$/);

  // Étape 2 — certification puis métiers
  await page.getByLabel("Type").selectOption("rge");
  await page.getByLabel("Numéro", { exact: true }).fill("E-00000");
  await page.getByLabel("Date de fin de validité").fill(nextYear);
  await page.getByRole("button", { name: "Ajouter la certification" }).click();
  await expect(page.getByText(/RGE · E-00000 · valable jusqu'au 30 juin/)).toBeVisible();

  await page.getByLabel("Menuisier").check();
  await page.getByLabel("Fenêtres").check();
  await page.getByLabel("Années d'expérience").fill("8");
  await page.getByRole("button", { name: "Enregistrer et continuer" }).click();
  await expect(page).toHaveURL(/\/pro\/onboarding\/zone$/);

  // Étape 3 — zone en rayon
  await page.getByRole("combobox", { name: "Adresse de départ" }).fill("1 rue de l'exemple");
  await page.getByRole("option", { name: "1 Rue de l'Exemple 06000 Nice" }).click();
  await page.getByLabel("Rayon d'intervention").selectOption("30");
  await page.getByRole("button", { name: "Enregistrer et continuer" }).click();

  await expect(page).toHaveURL(/\/pro\/onboarding$/);
  await expect(page.getByRole("main").getByRole("status")).toContainText("arrivent très bientôt");
  const stepper = page.getByRole("navigation", { name: "Étapes de l'inscription" });
  for (const step of ["Entreprise", "Métiers", "Zone d'intervention"]) {
    await expect(
      stepper.getByRole("link", { name: new RegExp(`${step}.*terminée`) }),
    ).toBeVisible();
  }

  // Zone en communes, puis retour au rayon conservé côté serveur
  await page.goto("/pro/onboarding/zone");
  await page.getByLabel("Une liste de communes").check();
  await page.getByRole("combobox", { name: "Ajouter une commune" }).fill("nic");
  await page.getByRole("option", { name: "Nice (06000)" }).click();
  await page.getByRole("combobox", { name: "Ajouter une commune" }).fill("ant");
  await page.getByRole("option", { name: "Antibes (06600)" }).click();
  await expect(page.getByRole("list", { name: "Communes" }).getByRole("listitem")).toHaveCount(2);
  await page.getByRole("button", { name: "Retirer Nice" }).click();
  await page.getByRole("button", { name: "Enregistrer et continuer" }).click();
  await expect(page).toHaveURL(/\/pro\/onboarding$/);
});

test("SIRET inconnu ou entreprise fermée : message clair (compte artisan du seed)", async ({
  page,
}) => {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill("artisan@example.test");
  await page.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/\/pro\/onboarding\/entreprise$/);

  await page.getByLabel("Numéro SIRET").fill("00000003400017");
  await page.getByRole("button", { name: "Modifier le SIRET" }).click();
  await page.getByRole("button", { name: /Vérifier/ }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "Aucun établissement ne correspond à ce SIRET. Vérifiez votre saisie.",
  );

  await page.getByLabel("Numéro SIRET").fill(fakeSiret("fermee"));
  await page.getByRole("button", { name: "Modifier le SIRET" }).click();
  await page.getByRole("button", { name: /Vérifier/ }).click();
  await expect(page.getByRole("main").getByRole("alert").first()).toContainText("fermée");
  await expect(page.getByRole("button", { name: "Enregistrer et continuer" })).toHaveCount(0);
});

test("un particulier n'accède pas à l'onboarding artisan", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill("particulier@example.test");
  await page.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/\/mon-espace$/);
  await page.goto("/pro/onboarding/entreprise");
  await expect(page).toHaveURL(/\/mon-espace$/);
});
