import { expect, test } from "@playwright/test";

// Import du catalogue (F-148, ADR 0309-0310) : le plombier du seed dépose un CSV avec ses propres
// titres ; colonnes reconnues, deux lignes à corriger, deux ouvrages importés au prix du fichier.
// Données fictives.
test("import du catalogue : CSV déposé, colonnes reconnues, lignes vérifiées, ouvrages importés", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const run = `${test.info().retry}`;
  const wc = `Pose WC suspendu fictive E2E ${run}`;
  const csv = [
    "Libellé;U;PU HT;Tx TVA;Famille",
    `${wc};u;665,50;10%;Plomberie`,
    `Remplacement mitigeur fictif E2E ${run};u;165;10 %;Plomberie`,
    `Robinet fictif E2E ${run};u;sur devis;10%;Plomberie`,
    `Purge fictive E2E ${run};pot;45;10%;Chauffage`,
  ].join("\n");

  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill("plombier-dispo@example.test");
  await page.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/\/pro\/tableau-de-bord$/);

  // Étape 1 : un fichier d'ouvrages, CSV.
  await page.goto("/pro/bibliotheque/importer");
  await expect(page.getByRole("heading", { name: "Que contient votre fichier ?" })).toBeVisible();
  await page.getByLabel("Fichier du catalogue").setInputFiles({
    name: "catalogue-fictif.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv, "utf8"),
  });

  // Étape 2 : 4 colonnes sur 5 reconnues par leurs titres, la famille ignorée.
  await expect(page.getByText("4 colonnes reconnues sur 5.")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel("Rôle de la colonne C")).toHaveValue("price");
  await expect(page.getByLabel("Rôle de la colonne E")).toHaveValue("ignore");
  await page.getByRole("button", { name: "Continuer" }).click();

  // Étape 3 : deux nouveaux ouvrages, deux lignes écartées avec leur raison.
  await expect(page.getByText("2 lignes ne seront pas importées")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Prix illisible : « sur devis »")).toBeVisible();
  await expect(page.getByText("Unité inconnue : « pot »")).toBeVisible();
  await page.getByRole("button", { name: "Importer 2 ouvrages" }).click();

  // Retour à la bibliothèque : bilan, ouvrage au prix du fichier, origine « Importé ».
  await expect(page).toHaveURL(/\/pro\/bibliotheque\?importe=2&maj=0/, { timeout: 30_000 });
  await expect(page.getByText("2 ouvrages importés.")).toBeVisible();
  await page.goto(`/pro/bibliotheque?q=${encodeURIComponent(wc)}`);
  const row = page.getByRole("row", { name: new RegExp(wc) });
  await expect(row.getByText(/^665,50\s€$/)).toBeVisible();
  await expect(row.getByText("Importé")).toBeVisible();
});
