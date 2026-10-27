import { expect, test } from "./test";

// Résultats (F-09) et fiche artisan (F-10). Seed : Noé (plombier, 25 km autour de Nice, disponible)
// et Inès (plombière à Nice et Antibes, disponible dans deux semaines).
const UUID = "[0-9a-f-]{36}";

test("résultats classés, fiche artisan sans coordonnées, critères de classement", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/recherche");
  await page
    .getByLabel("Décrivez votre projet")
    .fill("Fuite sous l'évier de la cuisine de mon appartement à Nice, à réparer rapidement.");
  await page.getByRole("button", { name: "Trouver mon artisan" }).click();
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
  // Garanties (ADR 0119) : badge, décennale et RC Pro vérifiées, certification.
  await expect(page.getByText("Assuré et vérifié par MENAO")).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Assurance décennale vérifiée" }),
  ).toContainText(/Valable jusqu'au .* · Assurances Exemple/);
  await expect(
    page
      .getByRole("listitem")
      .filter({ hasText: "Responsabilité civile professionnelle vérifiée" }),
  ).toContainText(/Valable jusqu'au .* · Assurances Exemple/);
  await expect(page.getByText(/N° Q-11111/)).toBeVisible();
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

// Recherche lancée depuis la fiche publique d'un artisan (ADR 0173, 0198) : demande directe, à
// elle seule, présélectionnée, sans confrère ni mention « Déjà venu chez vous » (aucun chantier commun).
test("depuis la fiche d'Inès : demande directe, sans confrère", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/artisans/plomberie-dispo-exemple");
  await expect(page.getByText(/votre demande sera envoyée à Inès uniquement/)).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "Décrire mon projet" }).first().click();
  await expect(page).toHaveURL(/\/recherche\?.*fiche=/);
  await expect(page.getByText(/^Nouvelle demande pour Inès/)).toBeVisible();
  await page
    .getByLabel("Décrivez votre projet")
    .fill("Fuite sous l'évier de la cuisine de mon appartement à Nice, à réparer rapidement.");
  await page.getByRole("button", { name: "Trouver mon artisan" }).click();
  await expect(page).toHaveURL(new RegExp(`/recherche/${UUID}$`), { timeout: 30_000 });
  await page.getByRole("button", { name: "Trouver l'artisan idéal" }).click();

  await expect(page).toHaveURL(new RegExp(`/recherche/${UUID}/artisans$`));
  await expect(page.getByRole("heading", { name: "Votre demande pour Inès" })).toBeVisible();
  const cards = page
    .getByRole("main")
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading") });
  await expect(cards).toHaveCount(1);
  await expect(cards.nth(0).getByRole("heading")).toHaveText("Inès");
  await expect(page.getByLabel("Sélectionner Inès")).toBeChecked();
  await expect(page.getByLabel("Sélectionner Noé")).toHaveCount(0);
  await expect(page.getByText("Déjà venu chez vous")).toHaveCount(0);
  await expect(page.getByText("Vous ne trouvez pas votre artisan idéal ?")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Envoyer ma demande à Inès" })).toBeEnabled();
});
