import { expect, test } from "./test";

// Artisan validé inscrit avant la charte qualité (ADR 0109) : compte fictif du seed
// charte@example.test, sans charte signée (les autres artisans du seed l'ont signée).
test("artisan déjà inscrit : charte demandée à l'entrée de l'espace pro, puis accès", async ({
  page,
}) => {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill("charte@example.test");
  await page.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/\/pro\/charte$/);
  await expect(page.getByText("Nouveau : la charte qualité MENAO.")).toBeVisible();

  // Toute page de l'espace pro ramène à la charte tant qu'elle n'est pas signée.
  await page.goto("/pro/demandes");
  await expect(page).toHaveURL(/\/pro\/charte$/);

  // Même lecture et même signature qu'à l'inscription (ADR 0104).
  const rules = page.getByRole("checkbox", { name: /^Règle R\d+\.\d+ :/ });
  await expect(rules).toHaveCount(25);
  for (const rule of await rules.all()) await rule.click();
  await expect(page.getByLabel("Entreprise")).toHaveValue("CHARTE EXEMPLE");
  await page.getByLabel("N° SIRET").fill("00000001800010");
  const pad = page.getByLabel("Zone de signature : signe avec le doigt ou la souris");
  await pad.scrollIntoViewIfNeeded();
  const box = await pad.boundingBox();
  if (!box) throw new Error("zone de signature introuvable");
  await page.mouse.move(box.x + 30, box.y + 90);
  await page.mouse.down();
  await page.mouse.move(box.x + 150, box.y + 40, { steps: 8 });
  await page.mouse.move(box.x + 280, box.y + 100, { steps: 8 });
  await page.mouse.up();
  // Engagement de l'artisan (ADR 0117), certifié avec la même signature.
  await page.getByRole("checkbox", { name: /certifie sur l'honneur/ }).click();
  await page.getByRole("checkbox", { name: /accepte la Charte qualité Menao/ }).click();
  await page.getByRole("button", { name: /Signer et rejoindre MENAO/ }).click();

  await expect(page.getByRole("heading", { name: /Tu fais partie de Menao/ })).toBeVisible();
  await page.getByRole("link", { name: /Accéder à mon espace pro/ }).click();
  await expect(page).toHaveURL(/\/pro\/tableau-de-bord$/);

  // Charte signée : l'espace pro reste ouvert, la charte se relit.
  await page.goto("/pro/demandes");
  await expect(page).toHaveURL(/\/pro\/demandes$/);
  await page.goto("/pro/charte?relire=1");
  await expect(page.getByText("Validé").first()).toBeVisible();
});
