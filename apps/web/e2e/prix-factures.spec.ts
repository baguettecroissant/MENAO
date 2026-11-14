import { expect, test } from "@playwright/test";

// Prix d'achat repérés dans les factures (F-149, ADR 0311, lot 44) : la facture fictive du seed, déjà lue
// dans Dépenses, reprend une fourniture de la plombière (même référence, +10 %) et un article
// inconnu. Le prix est mis à jour, l'article ajouté ; plus rien n'est proposé ensuite.
test("prix des factures : fourniture reconnue mise à jour, article inconnu ajouté", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill("plombier-dispo@example.test");
  await page.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/\/pro\/tableau-de-bord$/);

  // Fiche de la facture (lot 44) : la carte annonce le prix changé et mène à la vérification.
  await page.goto("/pro/depenses/c1490000-0000-4000-8000-000000000002");
  await expect(page.getByRole("heading", { name: "1 prix d'achat a changé" })).toBeVisible();
  await expect(
    page.getByText(
      "Le prix de Flexible inox fictif 50 cm a augmenté par rapport à vos fournitures.",
    ),
  ).toBeVisible();
  await page.getByRole("link", { name: "Vérifier mes prix" }).click();
  await expect(page).toHaveURL(/\/pro\/bibliotheque\/prix-factures$/);
  await expect(page.getByRole("heading", { name: "Mes prix d'achat à jour" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "1 prix d'achat a changé" })).toBeVisible();
  await expect(page.getByText("Reconnue : Réf. FLX-50")).toBeVisible();
  await expect(page.getByText("+10 %")).toBeVisible();
  // Écart de 10 % : cochée par défaut ; l'article inconnu ne l'est pas.
  await expect(
    page.getByLabel("Mettre à jour le prix de Flexible inox fictif 50 cm"),
  ).toBeChecked();
  const joint = page.getByLabel("Ajouter Joint fibre fictif 15x21 à mes fournitures");
  await expect(joint).not.toBeChecked();
  await joint.check({ force: true });
  await page.getByRole("button", { name: "Mettre à jour 1 prix, ajouter 1" }).click();

  await expect(page).toHaveURL(/\/pro\/bibliotheque\?vue=fournitures&factures=1&ajouts=1/, {
    timeout: 30_000,
  });
  // Lignes passées en revue : plus rien à proposer.
  await page.goto("/pro/bibliotheque/prix-factures");
  await expect(page.getByText(/Aucun prix d'achat n'a changé/)).toBeVisible();
});
