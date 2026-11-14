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
  await expect(page.getByLabel("DPGF de l'architecte", { exact: true })).toHaveCount(0);

  await setPlan("entreprise");
  await page.reload();
  await page.getByLabel("Nom du projet").fill(house);
  await page.getByLabel("Architecte ou maître d'œuvre").fill("Atelier fictif");
  await page.getByLabel("DPGF de l'architecte", { exact: true }).setInputFiles(DPGF);
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
  await page
    .getByLabel("DPGF de l'architecte", { exact: true })
    .setInputFiles({ ...files.pdf, name: "dpgf.pdf" });
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

// DPGF depuis les plans (F-140, ADR 0291, 0292) : plans lus par l'IA (faux serveur en CI), relevé
// corrigé, revêtements, DPGF créé avec l'origine de chaque quantité, export après vérification.
test("appels d'offres : plans lus, relevé corrigé, DPGF créé puis exporté après vérification", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const project = `Maison depuis plans E2E ${test.info().retry}`;
  await signIn(page);
  await setPlan("entreprise");
  await page.goto("/pro/demandes/appels-offres");

  await page.getByRole("radio", { name: /J'ai seulement les plans/ }).click();
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

  // Revêtements proposés (ADR 0292), puis DPGF créé : lot Carreleur, quantités avec leur origine.
  await page.getByRole("link", { name: "Choisir les revêtements" }).click();
  await expect(page).toHaveURL(/etape=revetements/);
  await expect(page.getByLabel("Sol : Palier")).toHaveValue("parquet");
  await expect(page.getByLabel("Murs : WC")).toHaveValue("faience");
  await page.getByRole("button", { name: "Créer le DPGF" }).click();
  await expect(page.getByText(/^DPGF créé : 1 lot, 5 postes, dont 1 à compléter/)).toBeVisible({
    timeout: 20_000,
  });
  // Séjour 45,14 + Dégagement 8,22 + WC 1,8 = 55,16 m² ; plinthes 27 + 16,1 − 2 × 0,83 = 41,44 ml.
  await expect(page.getByLabel("Votre quantité : Carrelage de sol")).toHaveValue("55,16");
  await expect(page.getByLabel("Votre quantité : Plinthes carrelage assorties")).toHaveValue(
    "41,44",
  );
  const posts = page.getByRole("table", { name: "Postes du DPGF" });
  await expect(posts.getByText("À compléter", { exact: true })).toHaveCount(1);
  await expect(posts.getByText("Calculé", { exact: true }).first()).toBeVisible();

  // Export refusé tant que les quantités ne sont pas vérifiées.
  const tenderPath = new URL(page.url()).pathname;
  const refused = await page.request.get(`${tenderPath}/excel`, { maxRedirects: 0 });
  expect(refused.status()).toBe(303);
  await expect(page.getByText(/^Cochez « J'ai vérifié les quantités »/)).toBeVisible();
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST" && r.ok()),
    page.getByLabel(/J'ai vérifié les quantités lues et calculées/).check(),
  ]);
  await page.reload();
  await expect(page.getByLabel(/J'ai vérifié les quantités lues et calculées/)).toBeChecked();
  const [sheet] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: /Excel du DPGF/ }).click(),
  ]);
  expect(sheet.suggestedFilename()).toBe(`DPGF-Maison-depuis-plans-E2E-${test.info().retry}.xlsx`);
});

// Plan de terrain (F-158, ADR 0322) : aucune pièce, des ouvrages mesurés avec leur origine ; un
// volume calculé avec des valeurs lues, une quantité complétée, puis le DPGF sans revêtements.
test("appels d'offres : plan de terrain, ouvrages relevés, DPGF du terrassier et du paysagiste", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const project = `Terrain depuis plans E2E ${test.info().retry}`;
  await signIn(page);
  await setPlan("entreprise");
  await page.goto("/pro/demandes/appels-offres");

  await page.getByRole("radio", { name: /J'ai seulement les plans/ }).click();
  await page.getByLabel("Nom du projet").fill(project);
  await page.getByLabel("Plans de l'architecte").setInputFiles({ ...files.pdf, name: "masse.pdf" });
  await page.getByRole("checkbox", { name: "Carreleur" }).click();
  await page.getByRole("button", { name: "Un autre métier" }).click();
  await page.getByRole("checkbox", { name: "Terrassier" }).click();
  await page.getByRole("checkbox", { name: "Paysagiste" }).click();
  await page.getByRole("button", { name: "Lire les plans" }).click();
  await expect(page).toHaveURL(/\/pro\/demandes\/appels-offres\/[0-9a-f-]{36}\?lecture=ok/, {
    timeout: 30_000,
  });
  await expect(page.getByText(/^Plans lus : 5 ouvrages relevés\./)).toBeVisible();
  await expect(page.getByText("2 pages : plan de masse, coupe du terrain")).toBeVisible();
  await expect(
    page.getByText("Altitudes lues : terrain naturel 102,40, plateforme 101,20"),
  ).toBeVisible();
  // Pas de pièces : pas d'étape « Revêtements ».
  const steps = page.getByRole("navigation", { name: "Étapes de l'appel d'offres" });
  await expect(steps.getByText("Relevé")).toBeVisible();
  await expect(steps.getByText("Revêtements")).toHaveCount(0);

  const table = page.getByRole("table", { name: "Ouvrages relevés" });
  await expect(table.getByText("186,00 m² × 0,30 m")).toBeVisible();
  await expect(table.getByText("55,80")).toBeVisible();
  await expect(table.getByText("À compléter", { exact: true })).toHaveCount(1);
  await expect(table.getByText("non écrit sur le plan")).toBeVisible();

  // La haie n'est pas cotée : l'artisan la complète, elle passe en « Saisi ».
  await page.getByRole("button", { name: "Modifier Haie à planter" }).click();
  await page.getByLabel("Quantité : Haie à planter").fill("48,5");
  await page.getByRole("button", { name: "Enregistrer les ouvrages" }).click();
  await expect(page.getByText("Ouvrages enregistrés.")).toBeVisible();
  await page.reload();
  await expect(table.getByText("48,50")).toBeVisible();
  await expect(table.getByText("Saisi", { exact: true })).toHaveCount(1);

  // DPGF : un lot par métier, le repère « Terrain » dans aucun lot.
  await page.getByRole("button", { name: "Préparer le DPGF" }).click();
  await expect(page.getByText(/^DPGF créé : 2 lots, 4 postes\./)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel("Votre quantité : Décapage de la terre végétale")).toHaveValue(
    "55,8",
  );
  await expect(page.getByLabel("Votre quantité : Terrain")).toHaveCount(0);
  // Le DPGF affiche un lot à la fois : la haie est dans celui du paysagiste.
  await page.getByRole("tab", { name: /Paysagiste/ }).click();
  await expect(page.getByLabel("Votre quantité : Haie à planter")).toHaveValue("48,5");
});

// Mesure à l'échelle (F-159 lot 2, ADR 0326) : une photo de plan est aussi tracée ; les contours
// s'affichent sur le plan et l'écart avec la pièce mesurée par ses cotes est contrôlé.
test("appels d'offres : photo de plan tracée, contours et contrôle de l'estimation", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signIn(page);
  await setPlan("entreprise");
  await page.goto("/pro/demandes/appels-offres");

  await page.getByRole("radio", { name: /J'ai seulement les plans/ }).click();
  await page.getByLabel("Nom du projet").fill(`Photo de plan E2E ${test.info().retry}`);
  await page.getByLabel("Plans de l'architecte").setInputFiles(files.planPhoto);
  await page.getByRole("button", { name: "Lire les plans" }).click();
  await expect(page).toHaveURL(/\/pro\/demandes\/appels-offres\/[0-9a-f-]{36}\?lecture=ok/, {
    timeout: 30_000,
  });
  await expect(page.getByText(/^Plans lus : 3 pièces relevées/)).toBeVisible();

  // Échelle calée sur les deux cotes désignées, contours posés sur la photo.
  await expect(
    page.getByText("Échelle calée sur 2 cotes lues : elles concordent à 0 % près"),
  ).toBeVisible();
  await expect(page.getByRole("img", { name: "Contours des pièces sur le plan" })).toBeVisible();
  // Le dégagement, mesuré par ses cotes (8,22 m²), est aussi tracé : écart nul.
  const control = page.locator("section", { hasText: "Contrôle de l'estimation" }).last();
  await expect(control.getByText("8,22 → 8,22 m²")).toBeVisible();
  // Rien n'est remplacé : les trois pièces gardent leur surface lue ou calculée.
  await expect(page.getByLabel("Surface (m²) : Dégagement")).toHaveValue("8,22");
});

// Métré à la main (F-159 lot 3, ADR 0327) : une pièce tracée sur la photo du plan rejoint le
// relevé avec l'origine « Tracé à la main ».
test("appels d'offres : pièce tracée à la main sur le plan, ajoutée au relevé", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signIn(page);
  await setPlan("entreprise");
  await page.goto("/pro/demandes/appels-offres");

  await page.getByRole("radio", { name: /J'ai seulement les plans/ }).click();
  await page.getByLabel("Nom du projet").fill(`Métré à la main E2E ${test.info().retry}`);
  await page.getByLabel("Plans de l'architecte").setInputFiles(files.planPhoto);
  await page.getByRole("button", { name: "Lire les plans" }).click();
  await expect(page).toHaveURL(/\/pro\/demandes\/appels-offres\/[0-9a-f-]{36}\?lecture=ok/, {
    timeout: 30_000,
  });

  await page.getByRole("link", { name: "Mesurer sur le plan" }).click();
  await expect(page).toHaveURL(/etape=mesure/);
  // L'échelle vient du tracé de MENAO (10 mm par pixel sur la photo simulée de 800 × 600).
  await expect(page.getByText("Échelle calée sur les cotes lues")).toBeVisible();
  const board = page.getByRole("img", { name: "Plan à mesurer" });
  await board.scrollIntoViewIfNeeded();
  const box = await board.boundingBox();
  if (!box) throw new Error("plan introuvable");
  // Un rectangle de 3,20 × 2,40 m, fermé en revenant sur le premier point.
  for (const [x, y] of [
    [0.2, 0.2],
    [0.6, 0.2],
    [0.6, 0.6],
    [0.2, 0.6],
    [0.2, 0.2],
  ] as const) {
    await page.mouse.click(box.x + x * box.width, box.y + y * box.height);
  }
  await expect(page.getByRole("heading", { name: "Nommer la mesure" })).toBeVisible();
  await expect(page.getByText(/^7,6\d m² · périmètre 11,[12]\d ml$/)).toBeVisible();
  await page.getByLabel("Nom", { exact: true }).fill("Cellier");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Cellier" })).toBeVisible();

  await page.getByRole("button", { name: "Ajouter au relevé" }).click();
  await expect(page).toHaveURL(/etape=releve&mesures=1/, { timeout: 20_000 });
  await expect(page.getByText("1 mesure ajoutée au relevé.")).toBeVisible();
  await expect(page.getByLabel("Pièce : Cellier")).toHaveValue("Cellier");
  await expect(
    page.getByRole("table", { name: "Pièces relevées" }).getByText("Tracé à la main"),
  ).toBeVisible();
});
