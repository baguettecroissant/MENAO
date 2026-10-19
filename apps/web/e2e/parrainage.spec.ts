import { expect, test } from "./test";

// Parrainage entre artisans (F-60, ADR 0137). Compte fictif du seed : valide@example.test.
test("parrainage : lien d'un artisan validé, code appliqué à l'inscription d'un confrère", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill("valide@example.test");
  await page.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/\/pro\/tableau-de-bord$/);

  await page.goto("/pro/mon-profil");
  const card = page.getByRole("region", { name: "Parrainez un confrère" });
  await expect(card).toBeVisible();
  await expect(
    card.getByText("Un mois offert pour vous deux dès son premier paiement."),
  ).toBeVisible();
  const link = await card.getByLabel("Votre lien de parrainage").inputValue();
  expect(link).toMatch(/\/p\/[a-z0-9]{8}\/pro$/);
  const code = link.split("/").at(-2) ?? "";
  await expect(card.getByText(new RegExp(`votre code ${code}`))).toBeVisible();
  await expect(card.getByText("Aucun confrère inscrit pour l'instant")).toBeVisible();

  // Le confrère suit le lien : le code l'accompagne jusqu'à la création du compte, sans cookie.
  const visitor = await browser.newContext();
  const guest = await visitor.newPage();
  await guest.goto(new URL(link).pathname);
  await expect(guest).toHaveURL(new RegExp(`/pro/inscription\\?p=${code}$`));
  const cookies = await visitor.cookies();
  expect(cookies.filter((c) => `${c.name}${c.value}`.includes(code))).toEqual([]);
  await visitor.close();
});
