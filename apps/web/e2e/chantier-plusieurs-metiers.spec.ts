import { expect, test } from "./test";
import { authLinkFor } from "./mailpit";

// Chantier à plusieurs métiers (ADR 0167 à 0170) : l'analyse propose le carreleur en plus du
// plombier, le client le coche, puis choisit un artisan dans chaque métier et envoie une seule
// demande (compte créé en chemin, sélection gardée). Seed : Noé et Inès (plombiers), Lina
// (carreleuse à Nice, réservée à ce test).
const UUID = "[0-9a-f-]{36}";

test("salle de bains : plombier et carreleur contactés en un seul envoi", async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(180_000);
  const email = `chantier-${Date.now()}@example.test`;

  await page.goto("/recherche");
  await page
    .getByLabel("Décrivez votre projet")
    .fill(
      "Je veux refaire entièrement la salle de bains de mon appartement à Nice : douche et faïence.",
    );
  await page.getByRole("button", { name: "Trouver mon artisan" }).click();
  await expect(page).toHaveURL(new RegExp(`/recherche/${UUID}$`), { timeout: 30_000 });

  // Autres métiers proposés, rien de coché d'office : le client coche le carreleur.
  const lots = page.getByRole("region", { name: "Autres métiers du chantier" });
  const tiler = lots.getByLabel("Carreleur");
  await expect(tiler).not.toBeChecked();
  await tiler.check();
  await expect(tiler).toBeEnabled();
  await page.getByRole("button", { name: "Trouver l'artisan idéal" }).click();
  await expect(page).toHaveURL(new RegExp(`/recherche/${UUID}/artisans$`));

  // Résultats : les plombiers, puis la section du carrelage avec sa date et ses artisans.
  const tiling = page.getByRole("region", { name: "Carreleur" });
  await expect(
    page.getByRole("heading", { name: "Les autres métiers de votre chantier" }),
  ).toBeVisible();
  await expect(
    tiling.getByText(/Début souhaité : .+ \(comme le reste du chantier\)/),
  ).toBeVisible();
  await page.getByLabel("Sélectionner Inès").check();
  await page.getByLabel("Sélectionner Lina, Carreleur").check();
  await page.getByRole("button", { name: "Envoyer ma demande aux 2 artisans" }).click();

  // Compte créé au moment de la demande : le lien de confirmation garde les deux métiers.
  await expect(page).toHaveURL(new RegExp(`/recherche/${UUID}/envoyer\\?.*lot=`));
  await page.getByLabel("Prénom").fill("Lilou");
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
    page.getByRole("heading", { name: "Envoyez votre demande de chantier à Inès et Lina" }),
  ).toBeVisible();
  await page.getByLabel("Téléphone").fill("06 12 34 56 79");
  await page.getByRole("button", { name: "Envoyer ma demande aux 2 artisans" }).click();

  // Confirmation : les deux artisans, chacun pour son métier.
  await expect(page).toHaveURL(new RegExp(`/recherche/${UUID}/envoyee\\?lot=${UUID}$`));
  await expect(
    page.getByRole("heading", { name: /^Votre demande est envoyée à (Inès et Lina|Lina et Inès)/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Suivre ma demande depuis mon espace" }).click();
  await expect(page).toHaveURL(/\/mon-espace$/);
  await expect(page.getByText(/Réponse attendue sous/)).toHaveCount(2);
  await expect(page.getByText(/^Un des métiers de votre chantier : /)).toBeVisible();

  // La carreleuse voit les autres métiers prévus, sans les coordonnées des autres artisans.
  const pro = await browser.newContext();
  const proPage = await pro.newPage();
  await proPage.goto("/connexion");
  await proPage.getByLabel("Adresse e-mail").fill("carreleur-nice@example.test");
  await proPage.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await proPage.getByRole("button", { name: "Me connecter" }).click();
  await expect(proPage).toHaveURL(/\/pro\/tableau-de-bord$/);
  await proPage
    .getByRole("navigation", { name: "Navigation de l'espace pro" })
    .getByRole("link", { name: /^Demandes/ })
    .click();
  await proPage.getByRole("link", { name: /Lilou/ }).first().click();
  await expect(proPage.getByText(/^Ce chantier prévoit aussi : Plombier\./)).toBeVisible();
  await pro.close();
});
