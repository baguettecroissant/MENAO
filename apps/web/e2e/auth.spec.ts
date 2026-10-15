import { expect, test } from "./test";
import { authLinkFor } from "./mailpit";

// Données fictives uniquement (domaine réservé .test).
const password = "mot-de-passe-e2e-local";

test("inscription, confirmation de l'e-mail, déconnexion puis connexion", async ({
  page,
  request,
}) => {
  const email = `e2e-${Date.now()}@example.test`;

  await page.goto("/inscription");
  await page.getByLabel("Prénom").fill("Camille");
  await page.getByLabel("Nom", { exact: true }).fill("Exemple");
  await page.getByLabel("Téléphone (optionnel)").fill("06 39 98 00 01");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByLabel(/J'accepte les conditions/).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL(/\/verifier-email$/);

  // Sans confirmation, la connexion est refusée.
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Confirmez d'abord votre adresse e-mail",
  );

  await page.goto(await authLinkFor(request, email));
  await expect(page).toHaveURL(/\/mon-espace$/);
  await expect(page.getByRole("heading", { level: 1, name: "Mes chantiers" })).toBeVisible();
  // Coque de l'application (ADR 0034) : rôle et déconnexion dans le menu du compte.
  await page.getByRole("button", { name: "Mon compte" }).click();
  await expect(page.getByText("Particulier", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Me déconnecter" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/\/mon-espace$/);
  await expect(page.getByRole("heading", { level: 1, name: "Mes chantiers" })).toBeVisible();
});

test("connexion par lien magique d'un compte existant (seed)", async ({ page, request }) => {
  await page.goto("/connexion/lien-magique");
  await page.getByLabel("Adresse e-mail").fill("particulier@example.test");
  await page.getByRole("button", { name: "Recevoir mon lien" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("Si un compte existe");

  await page.goto(await authLinkFor(request, "particulier@example.test"));
  await expect(page).toHaveURL(/\/mon-espace$/);
  // Type de compte affiché dans le menu du compte (ADR 0034).
  await page.getByRole("button", { name: "Mon compte" }).click();
  await expect(page.getByText("Particulier", { exact: true })).toBeVisible();
});

test("le lien magique ne crée pas de compte et ne révèle rien", async ({ page }) => {
  await page.goto("/connexion/lien-magique");
  await page.getByLabel("Adresse e-mail").fill(`inconnu-${Date.now()}@example.test`);
  await page.getByRole("button", { name: "Recevoir mon lien" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("Si un compte existe");
});

test("connexion du compte particulier du seed et retour vers la page demandée", async ({
  page,
}) => {
  await page.goto("/mon-espace");
  await expect(page).toHaveURL(/\/connexion\?next=%2Fmon-espace$/);

  await page.getByLabel("Adresse e-mail").fill("particulier@example.test");
  await page.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/\/mon-espace$/);
  await expect(page.getByRole("heading", { level: 1, name: "Mes chantiers" })).toBeVisible();
});

test("mauvais mot de passe : message générique", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill("particulier@example.test");
  await page.getByLabel("Mot de passe").fill("pas-le-bon-mot-de-passe");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "Adresse e-mail ou mot de passe incorrect.",
  );
});

test("redirection ouverte refusée après connexion", async ({ page }) => {
  await page.goto("/connexion?next=//exemple.test");
  await page.getByLabel("Adresse e-mail").fill("particulier@example.test");
  await page.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/localhost:3000\/mon-espace$/);
});
