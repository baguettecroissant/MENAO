import { expect, test } from "@playwright/test";
import { authLinkFor } from "./mailpit";

test("mot de passe oublié : lien e-mail, nouveau mot de passe, reconnexion", async ({
  page,
  request,
}) => {
  const email = "admin@example.test";
  const newPassword = `nouveau-mot-de-passe-${Date.now()}`;

  await page.goto("/connexion");
  await page.getByRole("link", { name: "Mot de passe oublié ?" }).click();
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByRole("button", { name: "Recevoir le lien" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("Si un compte existe");

  await page.goto(await authLinkFor(request, email));
  await expect(page).toHaveURL(/\/nouveau-mot-de-passe$/);
  await page.getByLabel("Nouveau mot de passe").fill(newPassword);
  await page.getByRole("button", { name: "Enregistrer mon mot de passe" }).click();
  await expect(page).toHaveURL(/\/mon-espace$/);

  await page.getByRole("button", { name: "Me déconnecter" }).click();
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(newPassword);
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/\/mon-espace$/);
});
