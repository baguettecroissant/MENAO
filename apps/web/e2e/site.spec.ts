import { expect, test } from "@playwright/test";

// Site public (F-01 à F-03). Seed : Noé (plombier, 25 km autour de Nice) et Inès (plombière à
// Nice et Antibes).

test("pages métier × ville : artisans de la commune, données structurées, sans coordonnées", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("region", { name: "Métiers du bâtiment" })
    .getByRole("link", { name: "Plombier" })
    .click();
  await expect(page).toHaveURL(/\/plombier$/);
  await expect(
    page.getByRole("heading", { name: "Plombier dans les Alpes-Maritimes" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Plombier à Nice" }).click();

  await expect(page).toHaveURL(/\/plombier\/nice$/);
  await expect(page).toHaveTitle("Plombier à Nice (06) : artisans vérifiés — MENAO");
  await expect(page.getByRole("heading", { name: "Plombier à Nice", level: 1 })).toBeVisible();
  await expect(page.getByText("2 artisans vérifiés interviennent dans cette ville.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Noé", level: 3 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Inès", level: 3 })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/plombier\/nice$/);
  const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
  expect(jsonLd).toContain('"@type":"Service"');
  expect(jsonLd).toContain('"name":"Noé"');
  const main = await page.getByRole("main").innerText();
  expect(main).not.toMatch(/@|\+33|Rue de l'Exemple|SIRET/i);

  // Grasse est hors du rayon de Noé, et hors des communes d'Inès.
  await page
    .getByRole("navigation", { name: "Plombier dans d'autres villes" })
    .getByRole("link", { name: "Grasse" })
    .click();
  await expect(
    page.getByText(/Aucun artisan plombier vérifié n'intervient encore à Grasse/),
  ).toBeVisible();

  const missing = await page.goto("/astronaute/nice");
  expect(missing?.status()).toBe(404);
});

test("robots.txt fermé hors production, sitemap, pages statiques et contact", async ({
  page,
  request,
}) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/plombier/nice</loc>");
  expect(sitemap).toContain("/comment-ca-marche</loc>");

  // Favicon, icône d'écran d'accueil et manifeste, déclarés dans l'en-tête de chaque page.
  for (const icon of ["/favicon.ico", "/icon.svg", "/apple-icon.png", "/icons/icon-512.png"]) {
    expect((await request.get(icon)).ok(), icon).toBe(true);
  }
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ short_name: "MENAO", theme_color: "#4869f6" });

  await page.goto("/");
  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveCount(1);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  await page.getByRole("link", { name: "Mentions légales" }).click();
  await expect(page.getByRole("heading", { name: "Mentions légales" })).toBeVisible();
  await page.getByRole("link", { name: "Questions fréquentes" }).click();
  await expect(page.getByRole("heading", { name: "Questions fréquentes" })).toBeVisible();

  await page.goto("/pro");
  // Vidéo de démonstration (ADR 0058) : chargée seulement à la lecture, aperçu et sous-titres servis.
  const video = page.getByRole("region", { name: "MENAO en 80 secondes" }).locator("video");
  await expect(video).toHaveAttribute("preload", "none");
  for (const file of ["/videos/menao-demo.webp", "/videos/menao-demo.vtt"]) {
    expect((await page.request.get(file)).status()).toBe(200);
  }
  const plans = page.getByRole("region", { name: "Un abonnement fixe, aucune commission." });
  // Intl sépare le montant et « € » par une espace fine insécable.
  await expect(plans.getByText(/^150\s€$/)).toBeVisible();
  await expect(plans.getByText("3 mois offerts", { exact: true })).toBeVisible();
  await expect(plans.getByText("Bientôt disponible")).toHaveCount(2);
  // Simulation de commission (F-03) : 15 % de 8 000 € comparés à l'abonnement Base.
  await expect(page.getByText(/Vous gardez 1\s050\s€ de plus chaque mois/)).toBeVisible();

  await page.goto("/contact");
  await page.getByLabel("Votre adresse e-mail").fill(`contact-${Date.now()}@example.test`);
  await page.getByLabel("Votre message").fill("Bonjour, une question sur MENAO.");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByText("Votre message est envoyé")).toBeVisible();
});
