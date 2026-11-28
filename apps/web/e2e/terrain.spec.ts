import { expect, test } from "./test";

// Espace des conseillers sur le terrain (F-194, lot 83, ADR 0394). Compte fictif du seed :
// commercial@example.test (Rémi) ; prospect fictif PLOMBERIE PROSPECT EXEMPLE, suivi par Rémi avec
// une relance en retard, donc proposé en tête de tournée depuis Nice.
test("terrain : bien démarrer, quiz, tournée, suite d'une visite et bilan", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill("commercial@example.test");
  await page.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await page.getByRole("button", { name: "Me connecter" }).click();

  // Bien démarrer : arrivée, numéro RSAC.
  await expect(page).toHaveURL(/\/commercial\/demarrer\?arrivee=1$/);
  await expect(page.getByRole("heading", { name: "Bienvenue, Rémi", level: 1 })).toBeVisible();
  await page.getByLabel("Numéro RSAC").fill("2027 AC 00042");
  await page.getByLabel("Greffe (facultatif)").fill("Nice");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Greffe de Nice · n° 2027 AC 00042")).toBeVisible();

  // Un module : 5 bonnes réponses, module réussi.
  await page.goto("/commercial/demarrer/formation/menao");
  const answers = [
    "3 au plus",
    "Rien : seul l'abonnement est payé, à prix fixe",
    "L'artisan seul",
    "Non : disponibilité, Score MENAO puis distance",
    "Dossier validé, formule choisie et compte Stripe ouvert",
  ];
  for (const [i, answer] of answers.entries()) {
    await page.getByRole("radio", { name: answer }).click();
    await page.getByRole("button", { name: "Valider ma réponse" }).click();
    await expect(page.getByText("Bonne réponse")).toBeVisible();
    await page
      .getByRole("button", {
        name: i === answers.length - 1 ? "Voir mon résultat" : "Question suivante",
      })
      .click();
  }
  await expect(page.getByText("Module réussi : 5/5")).toBeVisible();
  await page.getByRole("link", { name: "Retour à Bien démarrer" }).click();
  await expect(page.getByText("Quiz réussi : 5/5")).toBeVisible();

  // Tournée depuis Nice : le plombier à recontacter est proposé.
  await page
    .getByRole("navigation", { name: "Navigation de l'espace commercial" })
    .getByRole("link", { name: "Ma tournée" })
    .click();
  await expect(page.getByRole("heading", { name: "Ma tournée", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Depuis une commune" }).click();
  await page.getByRole("combobox").selectOption("NICE");
  await page.getByRole("button", { name: "Chauffagistes" }).click();
  await page.getByRole("button", { name: "Électriciens" }).click();
  await page.getByRole("button", { name: "Proposer une tournée" }).click();
  await expect(page.getByRole("heading", { name: /arrêts? proposés?/ })).toBeVisible();
  await expect(page.getByText("PLOMBERIE PROSPECT EXEMPLE")).toBeVisible();
  await page.getByRole("button", { name: "Commencer la tournée" }).click();

  // L'arrêt : intéressé, puis « Et maintenant ? ».
  await expect(
    page.getByRole("heading", { name: "PLOMBERIE PROSPECT EXEMPLE", level: 1 }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Intéressé" }).click();
  await expect(page.getByText("Noté : Intéressé")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Et maintenant ?" })).toBeVisible();

  // Fin de tournée et bilan.
  await page.getByRole("button", { name: "Terminer la tournée" }).click();
  await expect(page).toHaveURL(/\/commercial\/tournee\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Belle tournée, Rémi", level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "Bilan de la tournée" })).toContainText(
    "Intéressés",
  );

  // « Montrer à l'artisan » : le QR code d'inscription avec son code.
  await page.goto("/commercial/montrer?onglet=inscription");
  await expect(page.getByText(/\/p\/remi-06\/pro$/)).toBeVisible();
});
