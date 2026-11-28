import { fakeSiret, mockCompanySearch } from "./fixtures";
import { expect, test } from "./test";

// Inscription préparée par un conseiller (F-195, lot 84, ADR 0395). Compte fictif du seed :
// commercial@example.test (Rémi, code remi-06) ; entreprise fictive du faux serveur Sirene.
test("inscription préparée : le conseiller prépare, l'artisan ouvre son lien et reprend son inscription", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  const siret = fakeSiret("active");
  await mockCompanySearch(page, siret);
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill("commercial@example.test");
  await page.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/\/commercial\/demarrer\?arrivee=1$/);

  // Le conseiller prépare : entreprise, métiers, zone, contact, accord.
  await page.goto("/commercial/inscrire");
  await page.getByRole("searchbox", { name: "Nom de l'entreprise ou SIRET" }).fill("menuiserie");
  await page.getByRole("button", { name: /MENUISERIE EXEMPLE/ }).click();
  await expect(page.getByText("Trouvée au registre public des entreprises")).toBeVisible();
  await page.getByRole("button", { name: "C'est bien elle, continuer" }).click();
  await expect(page.getByRole("button", { name: "Menuisier", pressed: true })).toBeVisible();
  await page.getByLabel("E-mail professionnel").fill("menuiserie.preparee@example.test");
  await page.getByLabel("Téléphone portable").fill("06 12 34 56 78");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Préparer son lien" }).click();
  await expect(page.getByRole("heading", { name: /Le lien de .+ est prêt/ })).toBeVisible();
  const link = (await page.getByTestId("lien-prepare").textContent())?.trim() ?? "";
  expect(link).toMatch(/\/pro\/inscription\/preparee\/[a-f0-9]{32}$/);

  // Suivi : lien envoyé, pas encore ouvert.
  await page.getByRole("link", { name: "Suivre ses inscriptions" }).click();
  await expect(page.getByRole("heading", { name: "Mes inscriptions", level: 1 })).toBeVisible();
  await expect(page.getByText("MENUISERIE EXEMPLE").first()).toBeVisible();
  await expect(page.getByText(/Lien envoyé, pas encore ouvert/)).toBeVisible();

  // L'artisan ouvre son lien, sans compte, puis reprend le parcours avec le code du conseiller.
  const other = await browser.newContext();
  const artisan = await other.newPage();
  await artisan.goto(new URL(link).pathname);
  await expect(artisan.getByRole("heading", { name: /vérifiez vos informations/ })).toBeVisible();
  await expect(artisan.getByText(/MENUISERIE EXEMPLE/)).toBeVisible();
  await expect(artisan.getByText("menuiserie.preparee@example.test")).toBeVisible();
  await artisan.getByRole("button", { name: "C'est bien moi, finir mon inscription" }).click();
  await expect(artisan).toHaveURL(/\/pro\/inscription\?reprendre=1&p=remi-06$/);
  await expect(artisan.getByText("MENUISERIE EXEMPLE")).toBeVisible();
  await other.close();

  // Le conseiller voit que le lien a été ouvert.
  await page.reload();
  await expect(page.getByText("Lien ouvert : il finit son inscription")).toBeVisible();
});
