import { expect, test } from "./test";
import { totp } from "./totp";

// Parrainage entre artisans (F-60, ADR 0137, 0143 et 0154). Comptes fictifs du seed : valide@example.test,
// admin5@example.test.
test("parrainage : lien d'un artisan validé, code appliqué à l'inscription, suivi dans le back-office", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill("valide@example.test");
  await page.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/\/pro\/tableau-de-bord$/);

  await page.goto("/pro/mon-profil");
  const card = page.getByRole("region", { name: "Parrainez un confrère" });
  await expect(card).toBeVisible();
  await expect(
    card.getByText(
      "Un mois offert pour vous dès son premier paiement, jusqu'à 12 par an. Votre confrère reçoit un cadeau de bienvenue.",
    ),
  ).toBeVisible();
  // Inscrit sans parrain : aucun cadeau de bienvenue à choisir.
  await expect(page.getByRole("region", { name: "Votre cadeau de bienvenue" })).toHaveCount(0);
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

  // Back-office : la rubrique « Parrainages » et le code de l'artisan sur sa fiche (ADR 0143).
  const staff = await browser.newContext();
  const admin = await staff.newPage();
  await admin.goto("/connexion");
  await admin.getByLabel("Adresse e-mail").fill("admin5@example.test");
  await admin.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await admin.getByRole("button", { name: "Me connecter" }).click();
  await expect(admin).toHaveURL(/\/admin\/mfa\/activer$/);
  const secret = (await admin.getByTestId("totp-secret").textContent())?.trim() ?? "";
  await admin.getByLabel("Code à 6 chiffres").fill(totp(secret));
  await admin.getByRole("button", { name: "Vérifier" }).click();
  await expect(admin).toHaveURL(/\/admin$/);

  await admin
    .getByRole("navigation", { name: "Navigation du back-office" })
    .getByRole("link", { name: "Parrainages" })
    .click();
  await expect(admin.getByRole("heading", { name: "Parrainages", level: 1 })).toBeVisible();
  await expect(admin.getByText("Mois offerts posés")).toBeVisible();
  await expect(admin.getByText("Cadeaux à envoyer")).toBeVisible();
  await admin.getByRole("link", { name: /^Annulés/ }).click();
  await expect(admin).toHaveURL(/\/admin\/parrainages\?statut=annule$/);

  await admin.goto("/admin/artisans?statut=valide");
  await admin.getByRole("link", { name: "VALIDE EXEMPLE" }).click();
  const section = admin.getByRole("region", { name: "Parrainage" });
  await expect(section.getByText(code, { exact: true })).toBeVisible();
  await expect(section.getByText(link, { exact: true })).toBeVisible();
  await expect(section.getByText("Inscrit sans parrain")).toBeVisible();
  await expect(section.getByText("Aucun filleul pour l'instant")).toBeVisible();
  await staff.close();
});
