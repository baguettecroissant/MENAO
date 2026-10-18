import { expect, test, type Page } from "./test";
import { dates, files } from "./fixtures";
import { totp } from "./totp";

// Comptes fictifs du seed : valide@example.test (décennale expirant dans 10 jours), admin2@example.test.
async function signIn(page: Page, email: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await page.getByRole("button", { name: "Me connecter" }).click();
}

test("renouvellement d'une assurance qui expire, validé par un admin", async ({ page }) => {
  test.setTimeout(90_000);

  // Artisan : rappel, échéance, dépôt du document à jour
  await signIn(page, "valide@example.test");
  await expect(page).toHaveURL(/\/pro\/tableau-de-bord$/);
  // Accueil « À faire maintenant » (ADR 0131) : le document à renouveler y figure.
  await expect(
    page.getByRole("link", { name: /^À renouveler, Attestation d'assurance décennale/ }),
  ).toBeVisible();
  await page.goto("/pro/onboarding/documents");
  const decennale = page.getByRole("region", { name: "Attestation d'assurance décennale" });
  await expect(decennale.getByText("Expire dans 10 jours")).toBeVisible();
  await decennale.getByLabel("Assureur").fill("Assurances Exemple");
  await decennale.getByLabel("Numéro de contrat").fill("DEC-2222");
  await decennale.getByLabel("Date de fin de validité").fill(dates.nextYear);
  await decennale.getByLabel("Couverture géographique").fill("France métropolitaine");
  await decennale.getByLabel("Fichier").setInputFiles(files.pdf);
  await decennale.getByRole("button", { name: "Déposer le document à jour" }).click();
  await expect(
    decennale.getByText("Renouvellement · Déposé, en attente de vérification"),
  ).toBeVisible();
  await expect(decennale.getByText("Document en cours · Vérifié")).toBeVisible();
  // « Mon dossier » d'un artisan validé : déconnexion depuis le menu du compte (ADR 0035).
  await page.getByRole("button", { name: "Mon compte" }).click();
  await page.getByRole("button", { name: "Me déconnecter" }).click();

  // Admin : « À surveiller », puis validation du renouvellement
  await page.context().clearCookies();
  await signIn(page, "admin2@example.test");
  await expect(page).toHaveURL(/\/admin\/mfa\/activer$/);
  const secret = (await page.getByTestId("totp-secret").textContent())?.trim() ?? "";
  await page.getByLabel("Code à 6 chiffres").fill(totp(secret));
  await page.getByRole("button", { name: "Vérifier" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  // Vue d'ensemble (ADR 0045) : le renouvellement déposé est à traiter.
  await page
    .getByRole("article", { name: /renouvelés? à vérifier$/ })
    .getByRole("link", { name: /Voir les échéances/ })
    .click();
  await expect(page).toHaveURL(/\/admin\/surveillance$/);
  const renewals = page.getByRole("region", { name: "Renouvellements à vérifier" });
  await expect(renewals.getByRole("row", { name: /VALIDE EXEMPLE.*décennale/ })).toBeVisible();
  const expiring = page.getByRole("region", { name: /arrivant à échéance/ });
  await expect(
    expiring.getByRole("row", { name: /VALIDE EXEMPLE.*décennale.*Expire dans 10 jours/ }),
  ).toBeVisible();

  await renewals.getByRole("link", { name: "VALIDE EXEMPLE" }).click();
  const item = page.getByRole("listitem", { name: "Attestation d'assurance décennale" });
  await item.getByRole("button", { name: "Valider le document" }).click();
  await expect(item.getByText(/DEC-2222/).first()).toBeVisible();
  // L'ancienne attestation passe dans l'historique du document (ADR 0120).
  await expect(item.locator("details").getByText(/DEC-1111/)).toHaveCount(1);
  await expect(item.getByRole("button", { name: "Valider le document" })).toHaveCount(0);
});
