import { expect, test } from "@playwright/test";
import { files } from "./fixtures";

// Logo des documents (ADR 0038) depuis « Mon dossier → Entreprise ». Compte fictif du seed :
// valide@example.test (Lou, électricien validé, sans logo).
test("logo des documents : dépôt, remplacement, retrait", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill("valide@example.test");
  await page.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/\/pro\/tableau-de-bord$/);

  await page.goto("/pro/onboarding/entreprise");
  const logo = page.getByRole("region", { name: "Logo sur vos documents (facultatif)" });
  await expect(
    logo.getByText("Les documents déjà envoyés gardent le logo qu'ils avaient.", { exact: false }),
  ).toBeVisible();
  await expect(logo.getByRole("img")).toHaveCount(0);

  // Dépôt : redimensionné dans le navigateur (PNG gardé en PNG), vérifié puis rangé par le serveur.
  await logo.getByLabel("Fichier du logo").setInputFiles(files.logo);
  await logo.getByRole("button", { name: "Envoyer mon logo" }).click();
  await expect(logo.getByText("Fichier enregistré.")).toBeVisible();
  const current = logo.getByRole("img", { name: "Votre logo actuel" });
  await expect(current).toBeVisible();
  await expect(current).toHaveAttribute("src", /\/storage\/v1\/object\/sign\/artisan-logos\//);
  const first = await current.getAttribute("src");

  // Remplacement : nouveau fichier, ancien effacé (repris dans aucun devis envoyé).
  await logo.getByLabel("Fichier du logo").setInputFiles(files.logo);
  await logo.getByRole("button", { name: "Remplacer mon logo" }).click();
  await expect(logo.getByText("Fichier enregistré.")).toBeVisible();
  await expect(current).toBeVisible();
  await expect
    .poll(async () => (await current.getAttribute("src"))?.split("?")[0])
    .not.toBe(first?.split("?")[0]);

  // Retrait : plus de logo sur les prochains documents.
  await logo.getByRole("button", { name: "Retirer le logo" }).click();
  await expect(logo.getByRole("img")).toHaveCount(0);
  await expect(logo.getByRole("button", { name: "Envoyer mon logo" })).toBeVisible();
});
