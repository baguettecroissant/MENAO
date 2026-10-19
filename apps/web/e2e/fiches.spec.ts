import { expect, test } from "./test";

// Fiches artisans publiques (F-61, ADR 0144). Seed : Noé Plomberie (25 km autour de Nice) et
// Inès, PLOMBERIE DISPO EXEMPLE (plombier-dispo@example.test, Nice et Antibes).

test("fiche publique : lien depuis la page ville, données structurées, badge, sans coordonnées", async ({
  page,
  request,
}) => {
  await page.goto("/plombier/nice");
  await page.getByRole("link", { name: "Voir le profil de Noé" }).click();

  await expect(page).toHaveURL(/\/artisans\/noe-plomberie-nice$/);
  await expect(page).toHaveTitle("Noé Plomberie, plombier à Nice — MENAO");
  await expect(
    page.getByRole("heading", { name: "Noé Plomberie - Plombier", level: 1 }),
  ).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/artisans\/noe-plomberie-nice$/,
  );
  const jsonLd = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(
    "\n",
  );
  expect(jsonLd).toContain('"@type":"HomeAndConstructionBusiness"');
  expect(jsonLd).toContain('"name":"Noé Plomberie"');
  const main = await page.getByRole("main").innerText();
  expect(main).not.toMatch(/@|\+33|Rue de l'Exemple|SIRET/i);
  await expect(
    page.getByRole("main").getByRole("link", { name: "Décrire mon projet" }),
  ).toHaveAttribute("href", "/recherche?metier=plombier");
  await expect(
    page
      .getByRole("navigation", { name: "Trouver un plombier près de chez vous" })
      .getByRole("link", { name: "Tous les artisans plombiers vérifiés" }),
  ).toBeVisible();

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/artisans/noe-plomberie-nice</loc>");

  // Badge pour le site de l'artisan : vérifié tant que ses documents sont à jour.
  const badge = await request.get("/badge/noe-plomberie-nice.svg");
  expect(badge.status()).toBe(200);
  expect(badge.headers()["content-type"]).toContain("image/svg+xml");
  expect(await badge.text()).toContain("Assuré et vérifié");
  expect((await request.get("/badge/inconnue.svg")).status()).toBe(404);
  expect((await page.goto("/artisans/inconnue"))?.status()).toBe(404);
});

test("fiche publique : l'artisan la retire de Google, puis l'y remet", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill("plombier-dispo@example.test");
  await page.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/\/pro\/tableau-de-bord$/);

  // Hors production, toutes les pages sont déjà en « noindex, nofollow » ; une fiche retirée de
  // Google passe en « noindex, follow » (ses liens restent suivis).
  const robots = page.locator('meta[name="robots"]');
  const setGoogle = async (on: boolean) => {
    await page.goto("/pro/profil");
    const section = page.getByRole("region", { name: "Votre fiche sur internet" });
    await expect(section.getByLabel("Adresse de votre fiche")).toHaveValue(
      /\/artisans\/plomberie-dispo-exemple$/,
    );
    await section.getByLabel("Afficher ma fiche dans Google").setChecked(on);
    await section.getByRole("button", { name: "Enregistrer" }).click();
    await expect(section.getByText("Choix enregistré.")).toBeVisible();
    await page.goto("/artisans/plomberie-dispo-exemple");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "PLOMBERIE DISPO EXEMPLE - Plombier",
    );
  };

  await setGoogle(false);
  await expect(robots).toHaveAttribute("content", "noindex, follow");
  await setGoogle(true);
  await expect(robots).toHaveAttribute("content", "noindex, nofollow");
});
