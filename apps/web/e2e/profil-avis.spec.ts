import { expect, test } from "./test";

// « Ma fiche publique » et « Mes avis » (F-10, F-28). Compte fictif du seed : valide@example.test
// (Lou, électricien validé, sans photo ni avis).
test("aperçu de la fiche publique et page « Mes avis »", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill("valide@example.test");
  await page.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/\/pro\/tableau-de-bord$/);
  const nav = page.getByRole("navigation", { name: "Navigation de l'espace pro" });

  // Fiche telle que la voient les particuliers, avec les conseils pour la compléter.
  await nav.getByRole("link", { name: "Ma fiche publique" }).click();
  await expect(page).toHaveURL(/\/pro\/profil$/);
  await expect(page.getByRole("heading", { name: "Ma fiche publique", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lou - Électricien", level: 2 })).toBeVisible();
  const tips = page.getByRole("region", { name: "Pour une fiche plus convaincante" });
  await expect(tips.getByRole("link", { name: "Ajouter ma photo" })).toBeVisible();
  await expect(tips.getByRole("link", { name: "Compléter ma présentation" })).toHaveAttribute(
    "href",
    "/pro/onboarding/profil",
  );
  await expect(page.getByRole("region", { name: "À propos de Lou" })).toContainText(
    "Électricien validé du jeu de données",
  );
  // Ni SIRET, ni adresse : rien de plus que la fiche publique.
  expect(await page.getByRole("main").innerText()).not.toMatch(/SIRET|00000007500010/);

  // « Mes avis » : pas encore d'avis, score à venir, fonctionnement expliqué.
  await nav.getByRole("link", { name: "Avis", exact: true }).click();
  await expect(page).toHaveURL(/\/pro\/avis$/);
  await expect(page.getByRole("heading", { name: "Mes avis", level: 1 })).toBeVisible();
  await expect(page.getByText("Aucun avis pour le moment.")).toBeVisible();
  await expect(
    page.getByText("Votre score apparaîtra avec votre premier avis publié."),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "Comment ça marche" })).toBeVisible();
  await page.getByRole("link", { name: "Voir ma fiche publique" }).click();
  await expect(page).toHaveURL(/\/pro\/profil$/);

  // Mobile (ADR 0043) : messages dans la barre du haut, menu latéral en tiroir ; plus d'onglets.
  const viewport = page.viewportSize();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("link", { name: /^Messages/ })).toHaveAttribute(
    "href",
    "/pro/messages",
  );
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await page
    .getByRole("dialog", { name: "Navigation de l'espace pro" })
    .getByRole("link", { name: "Avis", exact: true })
    .click();
  await expect(page).toHaveURL(/\/pro\/avis$/);
  if (viewport) await page.setViewportSize(viewport);
});
