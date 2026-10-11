import { expect, test, type Page } from "@playwright/test";
import { totp } from "./totp";

// Comptes fictifs du seed : admin@example.test et dossier@example.test (dossier envoyé).
async function signIn(page: Page, email: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await page.getByRole("button", { name: "Me connecter" }).click();
}

test("admin : double authentification obligatoire puis validation d'un dossier", async ({
  page,
}) => {
  test.setTimeout(90_000);

  // Sans second facteur, le back-office renvoie vers l'activation du TOTP.
  await signIn(page, "admin@example.test");
  await expect(page).toHaveURL(/\/admin\/mfa\/activer$/);
  await expect(page.getByRole("img", { name: /QR code/ })).toBeVisible();
  const secret = (await page.getByTestId("totp-secret").textContent())?.trim() ?? "";
  await page.getByLabel("Code à 6 chiffres").fill("000000");
  await page.getByRole("button", { name: "Vérifier" }).click();
  await expect(page.getByText("Code incorrect ou expiré")).toBeVisible();
  await page.getByLabel("Code à 6 chiffres").fill(totp(secret));
  await page.getByRole("button", { name: "Vérifier" }).click();
  await expect(page).toHaveURL(/\/admin\/artisans$/);

  // File d'attente → dossier
  await page.getByRole("link", { name: "Ouvrir le dossier de PEINTURE DOSSIER EXEMPLE" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("PEINTURE DOSSIER EXEMPLE");
  const validate = page.getByRole("button", { name: "Valider le dossier" });
  await expect(validate).toBeDisabled();

  // Un message est exigé pour refuser un document
  const kbis = page.getByRole("listitem", { name: "Kbis ou extrait INSEE/RNE de moins de 3 mois" });
  await kbis.getByRole("button", { name: "Refuser le document" }).click();
  await expect(kbis.getByRole("alert")).toBeVisible();

  for (const doc of [
    "Kbis ou extrait INSEE/RNE de moins de 3 mois",
    "Attestation d'assurance décennale",
    "Attestation de responsabilité civile professionnelle",
    "Pièce d'identité du dirigeant",
  ]) {
    const item = page.getByRole("listitem", { name: doc });
    await item.getByRole("button", { name: "Valider le document" }).click();
    await expect(item.getByText("Vérifié", { exact: true })).toBeVisible();
  }

  await page.getByRole("button", { name: "Marquer comme vérifiée" }).click();
  await expect(page.getByText("✓ Vérifiée")).toBeVisible();

  await expect(validate).toBeEnabled();
  await validate.click();
  await expect(page.getByText("Ce dossier n'est pas en attente de vérification.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Historique des décisions" })).toContainText(
    "Dossier validé",
  );

  // Côté artisan : dossier validé. Déconnexion depuis le menu du compte (ADR 0035).
  await page.getByRole("button", { name: "Mon compte" }).click();
  await page.getByRole("button", { name: "Me déconnecter" }).click();
  await expect(page).toHaveURL("/");
  await signIn(page, "dossier@example.test");
  await expect(page).toHaveURL(/\/pro\/tableau-de-bord$/);
  await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
  await page.getByRole("link", { name: "Mon dossier", exact: true }).click();
  await expect(page).toHaveURL(/\/pro\/onboarding$/);
  await expect(page.getByRole("main").getByRole("status").first()).toHaveText(
    "Votre dossier est validé.",
  );
});

test("un artisan n'accède pas au back-office", async ({ page }) => {
  await signIn(page, "artisan@example.test");
  await expect(page).toHaveURL(/\/pro\/onboarding/);
  await page.goto("/admin/artisans");
  await expect(page).toHaveURL(/\/pro\/onboarding/);
});
