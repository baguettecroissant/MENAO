import { expect, test } from "@playwright/test";

// Augmenter ses prix en un geste (F-149, ADR 0312) : le plombier de Nice du seed augmente ses
// ouvrages à prix fixé de 5 % aux 10 centimes, vérifie le nouveau prix, puis annule la hausse
// depuis la bibliothèque (l'ouvrage retrouve son prix). Données fictives.
test("hausse en un geste : appliquée, visible, puis annulée", async ({ page }) => {
  test.setTimeout(90_000);
  const work = "Remplacement mitigeur fictif";
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill("plombier-nice@example.test");
  await page.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/\/pro\/tableau-de-bord$/);

  await page.goto("/pro/bibliotheque/augmenter");
  await expect(page.getByRole("heading", { name: "Augmenter mes prix", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "+ 5 %" }).click();
  await expect(page.getByLabel("Hausse")).toHaveValue("+ 5 %");
  await expect(page.getByRole("heading", { name: /^\+ 5 % sur \d+ ouvrages?$/ })).toBeVisible();
  await page.getByRole("button", { name: "Appliquer la hausse" }).click();

  await expect(page).toHaveURL(/\/pro\/bibliotheque$/, { timeout: 30_000 });
  await expect(page.getByText(/Hausse de 5 % appliquée/)).toBeVisible();
  await page.goto(`/pro/bibliotheque?q=${encodeURIComponent(work)}`);
  // 165,00 € + 5 % = 173,25 €, arrondi aux 10 centimes.
  await expect(
    page.getByRole("row", { name: new RegExp(work) }).getByText(/^173,30\s€$/),
  ).toBeVisible();

  await page.getByRole("button", { name: "Annuler la hausse" }).click();
  await expect(page).toHaveURL(/\/pro\/bibliotheque\?annule=\d+/, { timeout: 30_000 });
  await expect(page.getByText(/Hausse annulée/)).toBeVisible();
  await page.goto(`/pro/bibliotheque?q=${encodeURIComponent(work)}`);
  await expect(
    page.getByRole("row", { name: new RegExp(work) }).getByText(/^165,00\s€$/),
  ).toBeVisible();
});
