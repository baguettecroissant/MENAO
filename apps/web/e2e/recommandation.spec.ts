import { expect, test } from "./test";
import { authLinkFor } from "./mailpit";

// « Recommander un partenaire » (ADR 0174) : le client contacte seulement la plombière ; elle lui
// recommande sa carreleuse (sa filleule) pour l'autre métier du chantier, et le client la
// retrouve, signalée comme recommandée, dans la section du carrelage. Seed : Inès (plombière à
// Nice et Antibes) a parrainé Lina (carreleuse à Antibes).
const UUID = "[0-9a-f-]{36}";

test("la plombière recommande sa carreleuse pour l'autre métier du chantier", async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(180_000);
  const email = `recommandation-${Date.now()}@example.test`;

  await page.goto("/recherche");
  await page
    .getByLabel("Décrivez votre projet")
    .fill(
      "Je veux refaire entièrement la salle de bains de mon appartement à Antibes : douche et faïence.",
    );
  await page.getByRole("button", { name: "Trouver mon artisan" }).click();
  await expect(page).toHaveURL(new RegExp(`/recherche/${UUID}$`), { timeout: 30_000 });
  const lots = page.getByRole("region", { name: "Autres métiers du chantier" });
  await lots.getByLabel("Carreleur").check();
  await expect(lots.getByLabel("Carreleur")).toBeEnabled();
  await page.getByRole("button", { name: "Trouver l'artisan idéal" }).click();
  await expect(page).toHaveURL(new RegExp(`/recherche/${UUID}/artisans$`));
  const results = page.url();

  // Seulement la plombière ; compte créé en chemin.
  await page.getByLabel("Sélectionner Inès").check();
  await page.getByRole("button", { name: /^Envoyer ma demande/ }).click();
  await page.getByLabel("Prénom").fill("Maëlle");
  await page.getByLabel("Nom", { exact: true }).fill("Test");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill("mot-de-passe-de-test-e2e");
  await page.getByLabel(/J'accepte les conditions générales/).check();
  await page.getByRole("button", { name: "Créer mon espace et continuer" }).click();
  await expect(
    page.getByText("Nous venons de vous envoyer un e-mail de confirmation"),
  ).toBeVisible();
  await page.goto(await authLinkFor(request, email));
  await expect(
    page.getByRole("heading", { name: "Envoyez votre demande de chantier à Inès" }),
  ).toBeVisible();
  await page.getByLabel("Téléphone").fill("06 12 34 56 77");
  await page.getByRole("button", { name: /^Envoyer ma demande/ }).click();
  await expect(page).toHaveURL(new RegExp(`/recherche/${UUID}/envoyee$`));

  // La plombière recommande sa carreleuse pour l'autre métier.
  const pro = await browser.newContext();
  const proPage = await pro.newPage();
  await proPage.goto("/connexion");
  await proPage.getByLabel("Adresse e-mail").fill("plombier-dispo@example.test");
  await proPage.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await proPage.getByRole("button", { name: "Me connecter" }).click();
  await expect(proPage).toHaveURL(/\/pro\/tableau-de-bord$/);
  await proPage
    .getByRole("navigation", { name: "Navigation de l'espace pro" })
    .getByRole("link", { name: /^Demandes/ })
    .click();
  await proPage
    .getByRole("link", { name: /Maëlle/ })
    .first()
    .click();
  const partners = proPage.getByRole("region", { name: "Recommander un partenaire" });
  await expect(partners.getByText("Pour un autre métier du chantier")).toBeVisible();
  await partners.getByRole("button", { name: "Recommander Lina" }).click();
  await expect(partners.getByText("Recommandation envoyée à Maëlle.")).toBeVisible();
  await pro.close();

  // Le client la retrouve, recommandée, dans la section du carrelage.
  await page.goto(results);
  const tiling = page.getByRole("region", { name: "Carreleur" });
  await expect(tiling.getByText("Recommandé par Inès, son partenaire")).toBeVisible();
  await expect(tiling.getByLabel("Sélectionner Lina, Carreleur")).toBeVisible();
});
