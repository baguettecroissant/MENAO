import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { files } from "./fixtures";

// Appels d'offres (F-136, ADR 0287) : la carreleuse du seed passe le temps du test en formule
// Entreprise (clé serveur de l'instance locale de la CI), dépose un DPGF Excel fictif, le chiffre,
// puis télécharge le fichier au format de l'architecte et le PDF ; puis un DPGF en PDF (ADR 0288).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ARTISAN = "b0000000-0000-4000-8000-000000000017";
const DPGF = fileURLToPath(new URL("./fixtures/dpgf-exemple.xlsx", import.meta.url));

async function setPlan(plan: "base" | "entreprise") {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?artisan_id=eq.${ARTISAN}`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ plan_code: plan }),
  });
  expect(response.ok).toBe(true);
}

async function signIn(page: Page) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill("carreleur-nice@example.test");
  await page.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/\/pro\/tableau-de-bord$/);
}

test.afterAll(async () => {
  await setPlan("base");
});

test("appels d'offres : formule Entreprise, DPGF lu, chiffré, rendu en Excel et en PDF", async ({
  page,
}) => {
  test.setTimeout(120_000);
  // Nom propre à chaque essai : un nouvel essai automatique retrouve la base déjà modifiée.
  const run = `${test.info().retry}`;
  const house = `Maison fictive E2E ${run}`;
  const offices = `Bureaux fictifs E2E ${run}`;
  await signIn(page);

  // Formule Base : l'onglet présente la formule Entreprise, sans dépôt possible.
  await page.goto("/pro/demandes");
  await page
    .getByRole("navigation", { name: "Sections des demandes" })
    .getByRole("link", { name: "Appels d'offres" })
    .click();
  await expect(page).toHaveURL(/\/pro\/demandes\/appels-offres$/);
  await expect(
    page.getByRole("heading", { name: "Inclus dans la formule Entreprise" }),
  ).toBeVisible();
  await expect(page.getByLabel("DPGF de l'architecte")).toHaveCount(0);

  await setPlan("entreprise");
  await page.reload();
  await page.getByLabel("Nom du projet").fill(house);
  await page.getByLabel("Architecte ou maître d'œuvre").fill("Atelier fictif");
  await page.getByLabel("DPGF de l'architecte").setInputFiles(DPGF);
  await page.getByRole("button", { name: "Lire le DPGF" }).click();
  await expect(page).toHaveURL(/\/pro\/demandes\/appels-offres\/[0-9a-f-]{36}\?lecture=ok/, {
    timeout: 30_000,
  });
  await expect(page.getByText(/^DPGF lu : 3 postes/)).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: house })).toBeVisible();

  // Chiffrage : une quantité changée (écart avec le DPGF) et les prix des trois postes.
  const table = page.getByRole("table", { name: "Postes du DPGF" });
  await expect(table.getByText("LOT 05 CARRELAGE, FAÏENCE")).toBeVisible();
  await page.getByLabel("Votre quantité : Carrelage sol grès cérame 60 x 60, RDC").fill("77,4");
  await page.getByLabel("Prix unitaire HT : Ragréage du sol, RDC").fill("18");
  await page.getByLabel("Prix unitaire HT : Carrelage sol grès cérame 60 x 60, RDC").fill("74");
  await page.getByLabel("Prix unitaire HT : Seuils et barres de transition").fill("35");
  await expect(page.getByText("Modifications non enregistrées")).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Enregistré.")).toBeVisible();
  // 86 × 18 + 77,4 × 74 + 4 × 35 = 1 548 + 5 727,60 + 140 = 7 415,60 € HT.
  const figures = page.getByRole("region", { name: "Le DPGF en chiffres" });
  await expect(figures.getByText(/7\s415,60\s€/)).toBeVisible();
  await expect(figures.getByText(/1\s139,60\s€ HT de travaux en plus/)).toBeVisible();

  // Excel au format de l'architecte, puis PDF.
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: /Excel au format de l'architecte/ }).click(),
  ]);
  expect(download.suggestedFilename()).toBe(`DPGF-Maison-fictive-E2E-${run}.xlsx`);
  const tenderUrl = new URL(page.url());
  const pdf = await page.request.get(`${tenderUrl.pathname}/pdf`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");

  // Suivi : offre envoyée, visible dans la liste.
  await page.getByLabel("Suivi").selectOption("envoye");
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST" && r.ok()),
    page.getByRole("button", { name: "Mettre à jour" }).click(),
  ]);
  await page.goto("/pro/demandes/appels-offres");
  await expect(page.getByRole("link", { name: new RegExp(`${house}.*Envoyé`) })).toBeVisible();

  // DPGF en PDF (ADR 0288) : lu par l'IA (faux serveur en CI), à vérifier, rendu en classeur MENAO.
  await page.getByLabel("Nom du projet").fill(offices);
  await page.getByLabel("DPGF de l'architecte").setInputFiles({ ...files.pdf, name: "dpgf.pdf" });
  await page.getByRole("button", { name: "Lire le DPGF" }).click();
  await expect(page).toHaveURL(/\/pro\/demandes\/appels-offres\/[0-9a-f-]{36}\?lecture=ok/, {
    timeout: 30_000,
  });
  await expect(page.getByText(/^DPGF lu : 3 postes/)).toBeVisible();
  await expect(page.getByText(/^DPGF lu dans un PDF par l'IA/)).toBeVisible();
  const [menaoSheet] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: /Excel du DPGF chiffré/ }).click(),
  ]);
  expect(menaoSheet.suggestedFilename()).toBe(`DPGF-Bureaux-fictifs-E2E-${run}.xlsx`);
});

// DPGF depuis les plans, lot 1 (F-140, ADR 0291) : plans lus par l'IA (faux serveur en CI),
// relevé des pièces avec l'origine de chaque mesure, corrigé puis enregistré.
test("appels d'offres : plans lus, relevé des pièces corrigé et enregistré", async ({ page }) => {
  test.setTimeout(90_000);
  const project = `Maison depuis plans E2E ${test.info().retry}`;
  await signIn(page);
  await setPlan("entreprise");
  await page.goto("/pro/demandes/appels-offres");

  await page.getByLabel("J'ai seulement les plans").check();
  await page.getByLabel("Nom du projet").fill(project);
  await page.getByLabel("Plans de l'architecte").setInputFiles({ ...files.pdf, name: "plans.pdf" });
  await expect(page.getByRole("checkbox", { name: "Carreleur" })).toBeChecked();
  await page.getByRole("button", { name: "Lire les plans" }).click();
  await expect(page).toHaveURL(/\/pro\/demandes\/appels-offres\/[0-9a-f-]{36}\?lecture=ok/, {
    timeout: 30_000,
  });
  await expect(page.getByText(/^Plans lus : 3 pièces relevées/)).toBeVisible();
  await expect(page.getByText("Échelle 1/50 lue dans le cartouche")).toBeVisible();

  const table = page.getByRole("table", { name: "Pièces relevées" });
  await expect(table.getByText("Lu p. 2")).toBeVisible();
  await expect(table.getByText("Calculé (cotes)")).toBeVisible();
  await expect(table.getByText("À vérifier")).toBeVisible();
  await expect(page.getByLabel("Surface (m²) : Dégagement")).toHaveValue("8,22");
  await expect(page.getByLabel("Hauteur (m) : WC")).toHaveValue("2,5");

  // Correction d'une surface, nouvelle pièce, une porte de plus.
  await page.getByLabel("Surface (m²) : WC").fill("1,8");
  await page.getByRole("button", { name: "Ajouter une pièce" }).click();
  await page.getByLabel("Pièce : Pièce").fill("Palier");
  await page.getByLabel("Surface (m²) : Palier").fill("4,6");
  await page.getByLabel("Portes intérieures").fill("10");
  await page.getByRole("button", { name: "Enregistrer le relevé" }).click();
  await expect(page.getByText("Relevé enregistré.")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Surface (m²) : WC")).toHaveValue("1,8");
  await expect(page.getByLabel("Surface (m²) : Palier")).toHaveValue("4,6");
  await expect(table.getByText("Saisi")).toHaveCount(2);
  await expect(page.getByLabel("Portes intérieures")).toHaveValue("10");
});
