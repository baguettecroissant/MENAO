import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

// Appels d'offres (F-136, ADR 0287) : la carreleuse du seed passe le temps du test en formule
// Entreprise (clé serveur de l'instance locale de la CI), dépose un DPGF Excel fictif, le chiffre,
// puis télécharge le fichier au format de l'architecte et le PDF.
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
  await page.getByLabel("Nom du projet").fill("Maison fictive E2E");
  await page.getByLabel("Architecte ou maître d'œuvre").fill("Atelier fictif");
  await page.getByLabel("DPGF de l'architecte").setInputFiles(DPGF);
  await page.getByRole("button", { name: "Lire le DPGF" }).click();
  await expect(page).toHaveURL(/\/pro\/demandes\/appels-offres\/[0-9a-f-]{36}\?lecture=ok/, {
    timeout: 30_000,
  });
  await expect(page.getByText(/^DPGF lu : 3 postes/)).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Maison fictive E2E" })).toBeVisible();

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
  expect(download.suggestedFilename()).toBe("DPGF-Maison-fictive-E2E.xlsx");
  const tenderUrl = new URL(page.url());
  const pdf = await page.request.get(`${tenderUrl.pathname}/pdf`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");

  // Suivi : offre envoyée, visible dans la liste.
  await page.getByLabel("Suivi").selectOption("envoye");
  await page.getByRole("button", { name: "Mettre à jour" }).click();
  await page.goto("/pro/demandes/appels-offres");
  await expect(page.getByRole("link", { name: /Maison fictive E2E.*Envoyé/ })).toBeVisible();
});
