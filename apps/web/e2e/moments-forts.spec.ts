import { expect, test } from "./test";

// Moments forts des conseillers (F-196, lot 85, ADR 0396). Compte fictif du seed :
// commercial@example.test (Rémi).
test("moments forts : préférences des notifications et « Aujourd'hui »", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill("commercial@example.test");
  await page.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/\/commercial\/demarrer\?arrivee=1$/);

  // L'étape « Notifications sur ce téléphone » de Bien démarrer mène aux préférences.
  await expect(page.getByText("Notifications sur ce téléphone")).toBeVisible();
  await page.goto("/commercial/notifications");
  await expect(
    page.getByRole("heading", { name: "Être prévenu au bon moment", level: 1 }),
  ).toBeVisible();
  const lien = page.getByRole("switch", { name: "Un lien préparé n'est pas ouvert" });
  await expect(lien).toHaveAttribute("aria-checked", "true");
  await lien.click();
  await expect(lien).toHaveAttribute("aria-checked", "false");
  await page.waitForTimeout(500);
  await page.reload();
  await expect(
    page.getByRole("switch", { name: "Un lien préparé n'est pas ouvert" }),
  ).toHaveAttribute("aria-checked", "false");

  // « Aujourd'hui » s'affiche (sans artisan à relancer dans le seed).
  await page.goto("/commercial/journee");
  await expect(page.getByRole("heading", { name: "Aujourd'hui", level: 1 })).toBeVisible();
});
