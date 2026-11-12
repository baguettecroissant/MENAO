import { expect, test } from "@playwright/test";

// Bibliothèque d'ouvrages et marge (F-141, ADR 0293) : la carreleuse du seed règle son chiffrage,
// ajoute une fourniture, compose un ouvrage (fourniture + heures) et voit son prix et sa marge ;
// une fourniture utilisée ne peut pas être supprimée. Données fictives.
test("bibliothèque : réglages, fourniture, ouvrage composé, prix et marge", async ({ page }) => {
  test.setTimeout(90_000);
  const run = `${test.info().retry}`;
  const supply = `Bâti-support fictif E2E ${run}`;
  const work = `Pose WC fictive E2E ${run}`;

  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill("carreleur-nice@example.test");
  await page.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/\/pro\/tableau-de-bord$/);

  // Onglet « Bibliothèque » d'Argent, remplie avec les anciens devis.
  await page.goto("/pro/devis");
  await page
    .getByRole("navigation", { name: "Argent" })
    .getByRole("link", { name: "Bibliothèque" })
    .click();
  await expect(page).toHaveURL(/\/pro\/bibliotheque$/);
  await expect(page.getByRole("heading", { name: "Mes réglages de chiffrage" })).toBeVisible();

  // Réglages : heure à 35 € de coût et 55 € de vente, coefficient 1,30, pas de seuil.
  await page.getByLabel("Coût d'une heure").fill("35");
  await page.getByLabel("Prix de vente de l'heure").fill("55");
  await page.getByLabel("Coefficient fournitures").fill("1,30");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Réglages enregistrés.")).toBeVisible();

  // Une fourniture.
  await page.getByRole("link", { name: /^Fournitures/ }).click();
  await expect(page).toHaveURL(/vue=fournitures/);
  const add = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("button", { name: "Ajouter une fourniture" }) });
  await add.getByLabel("Désignation : Désignation").fill(supply);
  await add.getByLabel("Prix d'achat HT : Désignation").fill("180");
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST" && r.ok()),
    add.getByRole("button", { name: "Ajouter une fourniture" }).click(),
  ]);
  await page.reload();
  await expect(page.getByLabel(`Désignation : ${supply}`)).toHaveValue(supply);

  // Ouvrage composé : la fourniture et 3 h. Coût 180 + 105 = 285 € ; prix 234 + 165 = 399 €.
  await page.goto("/pro/bibliotheque/nouveau");
  await page.getByLabel("Désignation").fill(work);
  await page.getByRole("button", { name: "Une fourniture" }).click();
  const option = await page.locator("option", { hasText: supply }).first().getAttribute("value");
  await page.getByLabel("Élément : Fourniture").selectOption(option ?? "");
  await page.getByRole("button", { name: "Des heures" }).click();
  await page.getByLabel("Quantité : Main d'œuvre").fill("3");
  await expect(page.getByText(/^399,00\s€$/)).toBeVisible();
  await expect(page.getByText(/^Marge 114,00\s€$/)).toBeVisible();
  await expect(page.getByText("28,6 % du prix")).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page).toHaveURL(/\/pro\/bibliotheque\/[0-9a-f-]{36}\?enregistre=1/);
  await expect(page.getByText("Ouvrage enregistré.")).toBeVisible();

  // Dans la liste : prix, coût, marge en euros et en taux de marque.
  await page.goto(`/pro/bibliotheque?q=${encodeURIComponent(work)}`);
  const row = page.getByRole("row", { name: new RegExp(work) });
  await expect(row.getByText(/^399,00\s€$/)).toBeVisible();
  await expect(row.getByText(/114,00\s€ · 28,6 %/)).toBeVisible();
  await expect(row.getByText("Composé")).toBeVisible();

  // Fourniture utilisée : non supprimable.
  await page.goto("/pro/bibliotheque?vue=fournitures");
  await page.getByRole("button", { name: `Supprimer ${supply}` }).click();
  await expect(page.getByText(/^Cette fourniture est utilisée dans un ouvrage/)).toBeVisible();
});
