import { expect, test } from "@playwright/test";
import { dates, files, mockGeocoding } from "./fixtures";

// Recherche IA (F-05 à F-07) en session anonyme. L'Edge Function analyze-need interroge le faux
// OpenRouter (e2e/mock-ai.mjs) : « fuite » → plombier à Nice ; « hésitant » → repli sur le modèle
// de secours ; « panne » → réponse invalide.

// Micro simulé par Chromium (son de test) pour la dictée.
test.use({
  launchOptions: {
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
  },
  permissions: ["microphone"],
});

const UUID = "[0-9a-f-]{36}";

test("saisie, analyse, vérification des critères et lancement de la recherche", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  await mockGeocoding(page);
  await page.goto("/");

  const submit = page.getByRole("button", { name: "Trouver mon artisan du BTP idéal" });
  await expect(submit).toBeDisabled();

  // Dictée : le texte transcrit est inséré dans le champ.
  await page.getByRole("button", { name: "Dicter mon projet" }).click();
  await expect(page.getByText(/Écoute…/)).toBeVisible();
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: /Écoute…/ }).click();
  const description = page.getByLabel("Décrivez votre projet");
  await expect(description).toHaveValue("Fuite sous l'évier de la cuisine à Nice.");
  await expect(page.getByText("Afin d'obtenir de meilleurs résultats")).toBeVisible();

  await description.fill(
    "Fuite sous l'évier de la cuisine de mon appartement à Nice, à réparer rapidement. Rappelez-moi au 06 00 00 00 00.",
  );
  await expect(page.getByText("nous avons de quoi trouver votre artisan idéal")).toBeVisible();
  await page.getByLabel("Ajouter des photos").setInputFiles(files.png);
  await expect(page.getByRole("button", { name: "Retirer la photo 1" })).toBeVisible();

  await submit.click();
  await expect(page).toHaveURL(new RegExp(`/recherche/${UUID}$`), { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: "Vérifiez vos critères de recherche" }),
  ).toBeVisible();

  const trade = page.getByRole("region", { name: "Artisan recherché" });
  await expect(trade.getByText("Plombier")).toBeVisible();
  const site = page.getByRole("region", { name: "Informations sur le chantier" });
  await expect(
    site.getByText(/Appartement · Cuisine · Recherche et réparation de fuite/),
  ).toBeVisible();
  const address = page.getByRole("region", { name: "Adresse" });
  await expect(address.getByText("Nice (06000)")).toBeVisible();
  const photos = page.getByRole("region", { name: "Photos supplémentaires" });
  await expect(photos.getByRole("img", { name: "Photo 1 du chantier" })).toBeVisible();

  // Adresse exacte, proposée parmi les adresses de la ville choisie.
  await address.getByRole("button", { name: "Modifier : Adresse" }).click();
  await address.getByLabel("Adresse exacte (facultatif)").fill("1 rue de l'Exemple");
  await address.getByRole("option", { name: "1 Rue de l'Exemple 06000 Nice" }).click();
  await address.getByRole("button", { name: "Enregistrer" }).click();
  await expect(address.getByText("Nice (06000) — 1 Rue de l'Exemple 06000 Nice")).toBeVisible();

  // Date : passée refusée, future acceptée.
  const date = page.getByRole("region", { name: "Date de début souhaitée" });
  await expect(date.getByText("Dès que possible")).toBeVisible(); // urgence détectée
  await date.getByRole("button", { name: "Modifier : Date de début souhaitée" }).click();
  await date.getByLabel("Préciser une date").check();
  await date.getByLabel("Date de début").fill(dates.yesterday);
  await date.getByRole("button", { name: "Enregistrer" }).click();
  await expect(date.getByText("La date de début ne peut pas être passée.")).toBeVisible();
  await date.getByLabel("Date de début").fill(dates.inTwoWeeks);
  await date.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Critères enregistrés.")).toBeVisible();

  // Le changement de métier retire les travaux d'un autre métier.
  await trade.getByRole("button", { name: "Modifier : Artisan recherché" }).click();
  await trade.getByLabel("Métier").selectOption("carreleur");
  await trade.getByRole("button", { name: "Enregistrer" }).click();
  await expect(site.getByText("Appartement · Cuisine · Moins de 10 m²")).toBeVisible();

  // Un autre visiteur ne voit pas ce projet.
  const projectUrl = page.url();
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto(projectUrl);
  await expect(otherPage).toHaveURL(/\/$/);
  await other.close();

  await photos.getByRole("button", { name: /Supprimer/ }).click();
  await expect(photos.getByText("Aucune photo.")).toBeVisible();

  await page.getByRole("button", { name: "Trouver l'artisan idéal" }).click();
  await expect(page).toHaveURL(new RegExp(`/recherche/${UUID}/artisans$`));
  await expect(page.getByRole("heading", { name: "Vos critères sont enregistrés" })).toBeVisible();
});

test("repli : modèle de secours si l'analyse est peu sûre, formulaire vide si elle échoue", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await page
    .getByLabel("Décrivez votre projet")
    .fill("Je suis hésitant, il faudrait rafraîchir le salon.");
  await page.getByRole("button", { name: "Trouver mon artisan du BTP idéal" }).click();
  await expect(page).toHaveURL(new RegExp(`/recherche/${UUID}$`), { timeout: 30_000 });
  await expect(
    page.getByRole("region", { name: "Artisan recherché" }).getByText("Peintre"),
  ).toBeVisible();
  // Ville inconnue : la recherche ne peut pas encore être lancée.
  await expect(page.getByRole("button", { name: "Trouver l'artisan idéal" })).toBeDisabled();

  await page.goto("/");
  await page.getByLabel("Décrivez votre projet").fill("Panne de chaudière.");
  await page.getByRole("button", { name: "Plombier", exact: true }).click();
  await page.getByRole("button", { name: "Trouver mon artisan du BTP idéal" }).click();
  await expect(page).toHaveURL(new RegExp(`/recherche/${UUID}$`), { timeout: 30_000 });
  await expect(page.getByText("Nous n'avons pas pu analyser votre description")).toBeVisible();
  // Le métier choisi avec les puces est conservé.
  await expect(
    page.getByRole("region", { name: "Artisan recherché" }).getByText("Plombier"),
  ).toBeVisible();
});

test("une session anonyme n'ouvre pas l'espace client", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Décrivez votre projet").fill("Fuite dans la cuisine à Nice.");
  await page.getByRole("button", { name: "Trouver mon artisan du BTP idéal" }).click();
  await expect(page).toHaveURL(new RegExp(`/recherche/${UUID}$`), { timeout: 30_000 });
  await page.goto("/mon-espace");
  await expect(page).toHaveURL(/\/connexion/);
  await expect(page.getByRole("heading", { name: "Me connecter" })).toBeVisible();
});
