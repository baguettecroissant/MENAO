import { expect, type Page } from "@playwright/test";

/** Règles de chaque partie de la charte V5, dans l'ordre. */
const RULES_PER_PART = [5, 5, 4, 6, 3, 2];

/** Bouton du bas : « Lire la suite » fait défiler jusqu'à la fin, puis le bouton change. */
async function readThenClick(page: Page, name: string | RegExp) {
  const button = page.getByRole("button", { name });
  const more = page.getByRole("button", { name: "Lire la suite" });
  await expect(async () => {
    if (await more.isVisible()) await more.click();
    await expect(button).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await button.click();
}

/**
 * Charte lue partie par partie (ADR 0373) : les six parties acceptées, ce que MENAO promet, puis
 * l'engagement de l'artisan. S'arrête sur l'écran de signature.
 */
export async function acceptCharterParts(page: Page) {
  for (const [index, count] of RULES_PER_PART.entries()) {
    await expect(page.getByText(new RegExp(`^Partie ${index + 1} sur 9 · `))).toBeVisible();
    await expect(page.getByText(new RegExp(`^R${index + 1}\\.${count}$`))).toBeVisible();
    await readThenClick(page, `J’accepte ces ${count} règles`);
  }
  await expect(page.getByText("Partie 7 sur 9 · Promesses")).toBeVisible();
  await readThenClick(page, "Continuer");
  // Engagement de l'artisan (ADR 0117) : le bouton porte la phrase certifiée.
  await expect(page.getByText("Partie 8 sur 9 · Engagement")).toBeVisible();
  await readThenClick(page, /certifie sur l'honneur/);
  await expect(page.getByRole("heading", { name: "Signature de la charte" })).toBeVisible();
}

/** Tracé de signature à la souris. */
export async function drawSignature(page: Page) {
  const pad = page.getByLabel("Zone de signature : signe avec le doigt ou la souris");
  await pad.scrollIntoViewIfNeeded();
  const box = await pad.boundingBox();
  if (!box) throw new Error("zone de signature introuvable");
  await page.mouse.move(box.x + 30, box.y + 90);
  await page.mouse.down();
  await page.mouse.move(box.x + 150, box.y + 40, { steps: 8 });
  await page.mouse.move(box.x + 280, box.y + 100, { steps: 8 });
  await page.mouse.up();
}
