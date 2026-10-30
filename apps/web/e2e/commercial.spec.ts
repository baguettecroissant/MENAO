import { capture } from "./fixtures";
import { expect, test } from "./test";

// Espace commercial (F-65, ADR 0205). Compte fictif du seed : commercial@example.test (code remi-06),
// un artisan inscrit avec ce code.
test("espace commercial : code, QR code, inscrits, guide terrain et cartes", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill("commercial@example.test");
  await page.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/\/commercial$/);

  await expect(page.getByRole("heading", { name: "Bonjour Rémi", level: 1 })).toBeVisible();
  const code = page.getByRole("region", { name: "Votre code" });
  // Le code figure aussi dans la fenêtre du QR code (fermée) : le premier, sur la carte.
  await expect(code.getByText("remi-06", { exact: true }).first()).toBeVisible();
  await expect(code.getByText(/\/p\/remi-06\/pro$/)).toBeVisible();

  // QR code agrandi pour être scanné par l'artisan.
  await code.getByRole("button", { name: /QR code de votre lien d'inscription MENAO/ }).click();
  const dialog = page.getByRole("dialog", { name: "Inscription avec votre code" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Fermer" }).click();
  await expect(dialog).toBeHidden();

  // Ses inscrits : l'artisan du seed, à l'étape « En cours ».
  const signups = page.getByRole("list", { name: "Artisans inscrits avec votre code" });
  await expect(signups.getByRole("listitem")).toHaveCount(1);
  await expect(signups.getByText("En cours")).toBeVisible();
  await capture(page, "commercial-accueil");

  // Écran d'accueil du téléphone (ADR 0211) : manifeste propre à l'espace, ouvert en plein écran.
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/commercial.webmanifest",
  );
  await expect(page.locator('meta[name="mobile-web-app-capable"]')).toHaveAttribute(
    "content",
    "yes",
  );
  const manifest = await (await page.request.get("/commercial.webmanifest")).json();
  expect(manifest).toMatchObject({ start_url: "/commercial", display: "standalone", scope: "/" });

  // Guide terrain : liste des rubriques, puis une rubrique.
  await page
    .getByRole("navigation", { name: "Navigation de l'espace commercial" })
    .getByRole("link", { name: "Guide terrain" })
    .click();
  await expect(page.getByRole("heading", { name: "Guide terrain", level: 1 })).toBeVisible();
  const sections = page.getByRole("list", { name: "Rubriques du guide" }).getByRole("link");
  await expect(sections.first()).toBeVisible();
  const first = (await sections.first().textContent())?.trim() ?? "";
  await sections.first().click();
  await expect(page).toHaveURL(/\/commercial\/guide\/[a-z-]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(first.length).toBeGreaterThan(0);
  await capture(page, "commercial-guide");

  // Mes résultats (lot 3) : l'inscrit du seed, primes non réglées (règle 15).
  await page
    .getByRole("navigation", { name: "Navigation de l'espace commercial" })
    .getByRole("link", { name: "Mes résultats" })
    .click();
  await expect(page.getByRole("heading", { name: "Mes résultats", level: 1 })).toBeVisible();
  await expect(page.getByText("1 au total").first()).toBeVisible();
  await expect(
    page.getByText("Les montants des primes ne sont pas encore fixés par l'équipe MENAO."),
  ).toBeVisible();

  // Cartes à imprimer, hors de la coque.
  await page.goto("/commercial/cartes");
  await expect(page.getByRole("heading", { name: "Cartes à imprimer", level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Imprimer la planche" })).toBeVisible();
  await expect(page.getByText("Code : remi-06").first()).toBeVisible();

  // Le back-office et l'espace pro lui restent fermés.
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/commercial$/);
  await page.goto("/pro/tableau-de-bord");
  await expect(page).not.toHaveURL(/\/pro\/tableau-de-bord$/);
});
