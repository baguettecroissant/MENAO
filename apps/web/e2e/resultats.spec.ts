import { expect, test } from "@playwright/test";

// Résultats (F-09) et fiche artisan (F-10). Seed : Noé (plombier, 25 km autour de Nice, disponible)
// et Inès (plombière à Nice et Antibes, disponible dans deux semaines).
const UUID = "[0-9a-f-]{36}";

test("résultats classés, fiche artisan sans coordonnées, critères de classement", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await page
    .getByLabel("Décrivez votre projet")
    .fill("Fuite sous l'évier de la cuisine de mon appartement à Nice, à réparer rapidement.");
  await page.getByRole("button", { name: "Trouver mon artisan du BTP idéal" }).click();
  await expect(page).toHaveURL(new RegExp(`/recherche/${UUID}$`), { timeout: 30_000 });
  await page.getByRole("button", { name: "Trouver l'artisan idéal" }).click();

  await expect(page).toHaveURL(new RegExp(`/recherche/${UUID}/artisans$`));
  await expect(
    page.getByRole("heading", { name: "Sélectionnez votre artisan idéal" }),
  ).toBeVisible();
  await expect(page.getByText("Nous avons trouvé 2 artisans vérifiés")).toBeVisible();
  const cards = page
    .getByRole("main")
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading") });
  await expect(cards).toHaveCount(2);
  // Disponible tout de suite en premier.
  await expect(cards.nth(0).getByRole("heading")).toHaveText("Noé");
  await expect(cards.nth(0).getByText("Dispo immédiate")).toBeVisible();
  await expect(cards.nth(0).getByText("Recherche et réparation de fuite")).toBeVisible();
  await expect(cards.nth(0).getByText("+1")).toBeVisible();
  await expect(cards.nth(1).getByRole("heading")).toHaveText("Inès");
  await expect(cards.nth(1).getByText(/Disponible à partir du/)).toBeVisible();

  await page.getByRole("link", { name: "Voir le profil de Noé" }).click();
  await expect(page.getByRole("heading", { name: "Noé", level: 1 })).toBeVisible();
  await expect(
    page.getByText(/Assurance décennale vérifiée par MENAO, valable jusqu'au/),
  ).toBeVisible();
  await expect(page.getByText(/Qualibat n° Q-11111/)).toBeVisible();
  await expect(page.getByText("25 km autour de Nice")).toBeVisible();
  // Ni téléphone, ni e-mail, ni SIRET, ni adresse de base.
  const body = await page.getByRole("main").innerText();
  expect(body).not.toMatch(/@|\+33|\b0[1-9](\s?\d{2}){4}\b|Rue de l'Exemple|SIRET/i);

  await page.getByRole("link", { name: "Sélection d'artisan" }).click();
  await page.getByRole("link", { name: "Comment les artisans sont-ils classés ?" }).click();
  await expect(
    page.getByRole("heading", { name: "Critères de classement des artisans" }),
  ).toBeVisible();
  await expect(page.getByText(/Aucune\. Le classement ne dépend ni de la formule/)).toBeVisible();
});
