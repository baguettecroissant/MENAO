import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { capture, dates } from "./fixtures";
import { expect, test } from "./test";
import { totp } from "./totp";

// Tableaux de lancement (F-66, ADR 0208) et chiffres du lancement (lot 2, ADR 0209). Comptes et
// tâches FICTIFS du seed : admin6@example.test, commercial@example.test (Rémi) et
// commercial2@example.test (Léa) ; fichier d'import fictif (cible et réglages neutres compris).
const UUID = "[0-9a-f-]{36}";
const PLAN = fileURLToPath(new URL("./fixtures/plan-lancement-exemple.json", import.meta.url));

async function signIn(page: Page, email: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await page.getByRole("button", { name: "Me connecter" }).click();
}

test("lancement : vue d'équipe, import du plan, tableau d'un membre, chiffres et codes de suivi", async ({
  page,
}) => {
  test.setTimeout(120_000);
  // Comme partenaires.spec.ts : la double authentification d'admin6 est activée au premier passage.
  // Une relance automatique (CI) ne peut pas la rejouer (secret inconnu) : l'échec d'origine est
  // celui à lire dans le rapport.
  await signIn(page, "admin6@example.test");
  await expect(page).toHaveURL(/\/admin\/mfa\/activer$/);
  const secret = (await page.getByTestId("totp-secret").textContent())?.trim() ?? "";
  await page.getByLabel("Code à 6 chiffres").fill(totp(secret));
  await page.getByRole("button", { name: "Vérifier" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page
    .getByRole("navigation", { name: "Navigation du back-office" })
    .getByRole("link", { name: "Lancement" })
    .click();
  await expect(page).toHaveURL(/\/admin\/lancement$/);
  await expect(page.getByRole("heading", { name: "Lancement", level: 1 })).toBeVisible();

  // Membres du seed ; l'objectif interne ne figure que dans le back-office.
  for (const name of ["Rémi Commercial", "Léa Commerciale", "Les associés"]) {
    await expect(page.getByRole("link", { name: `Ouvrir le tableau de ${name}` })).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "Les étapes du lancement" })).toBeVisible();
  await expect(page.getByText("Feu vert interne").first()).toBeVisible();
  await capture(page, "lancement-equipe");

  // Import du fichier fictif : aperçu, puis compteurs de la base (premier import ou mise à jour).
  await page.getByLabel("Fichier du plan (.json)").setInputFiles(PLAN);
  await expect(
    page.getByText("Fichier prêt : 2 membres, 4 tâches, 1 cible, réglages des chiffres."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Importer", exact: true }).click();
  await expect(page.getByText(/^Import terminé : /)).toHaveText(
    /^Import terminé : (2 membres ajoutés, 0 mis à jour|0 membre ajouté, 2 mis à jour) · (4 tâches ajoutées, 0 mise à jour|0 tâche ajoutée, 4 mises à jour) · (1 cible ajoutée, 0 mise à jour|0 cible ajoutée, 1 mise à jour) · réglages mis à jour\.$/,
  );

  // Tableau d'un membre importé, puis ajout d'une tâche depuis son tableau.
  await page.getByRole("link", { name: "Ouvrir le tableau de Membre Exemple Un" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/lancement/${UUID}$`));
  await expect(page.getByRole("heading", { name: "Membre Exemple Un", level: 1 })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Modifier : Tâche d'exemple numéro 1" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Ajouter une tâche" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/lancement/taches/nouvelle\\?membre=${UUID}$`));
  await expect(page.getByRole("heading", { name: "Nouvelle tâche", level: 1 })).toBeVisible();
  await expect(page.getByLabel("Responsable")).toHaveValue(new RegExp(`^${UUID}$`));
  await page.getByLabel("Titre").fill("Tâche ajoutée par le test");
  await page.getByLabel("Échéance").fill(dates.inTwoWeeks);
  await page.getByRole("button", { name: "Enregistrer la tâche" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/lancement/${UUID}\\?fait=tache$`));
  await expect(page.getByText("Tâche enregistrée.")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Modifier : Tâche ajoutée par le test" }).first(),
  ).toBeVisible();
  // Carte « Résultats » du membre (lot 2).
  await expect(page.getByRole("heading", { name: "Résultats", exact: true })).toBeVisible();
  await capture(page, "lancement-membre");

  // Onglet « Chiffres » : chiffres en direct, objectif d'équipe de la cible fictive importée.
  await page.goto("/admin/lancement");
  const tabs = page.getByRole("navigation", { name: "Pages du lancement" });
  await tabs.getByRole("link", { name: "Chiffres" }).click();
  await expect(page).toHaveURL(/\/admin\/lancement\/chiffres$/);
  await expect(tabs.getByRole("link", { name: "Chiffres" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("heading", { name: "Artisans validés", exact: true })).toBeVisible();
  await expect(page.getByText("Objectif d'équipe : 50")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Couverture métier × zone" })).toBeVisible();
  await capture(page, "lancement-chiffres");

  // Onglet « Codes de suivi » : création d'un code fictif (déjà là après une relance locale).
  await tabs.getByRole("link", { name: "Codes de suivi" }).click();
  await expect(page).toHaveURL(/\/admin\/lancement\/codes$/);
  const flyer = page
    .getByRole("list", { name: "Codes de suivi" })
    .getByRole("listitem")
    .filter({ hasText: "e2e-flyer" });
  if ((await flyer.count()) === 0) {
    await page.getByLabel("Code", { exact: true }).fill("e2e-flyer");
    await page.getByLabel("Libellé").fill("Flyer de test");
    await page.getByLabel("Canal").selectOption("flyer");
    await page.getByRole("button", { name: "Créer le code" }).click();
    await expect(page).toHaveURL(/\/admin\/lancement\/codes\?fait=code-cree$/);
    await expect(page.getByText("Code de suivi créé.")).toBeVisible();
  }
  // Lien d'inscription affiché (le même est repris, caché, dans la fenêtre du QR code).
  await expect(flyer.getByText(/\/p\/e2e-flyer\/pro$/).first()).toBeVisible();
  await expect(flyer.getByRole("button", { name: "Copier le lien" })).toBeVisible();
  await capture(page, "lancement-codes");
});

test("mon planning : le commercial voit ses tâches et celles de l'équipe, et coche les siennes", async ({
  page,
  browser,
}) => {
  await signIn(page, "commercial@example.test");
  await expect(page).toHaveURL(/\/commercial$/);
  await page
    .getByRole("navigation", { name: "Navigation de l'espace commercial" })
    .getByRole("link", { name: "Mon planning" })
    .click();
  await expect(page).toHaveURL(/\/commercial\/planning$/);
  await expect(page.getByRole("heading", { name: "Mon planning", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rémi Commercial" })).toBeVisible();

  // Ses tâches et le jalon partagé (compte à rebours), jamais celles des autres ni l'interne.
  await expect(page.getByText("Préparer la tournée de Nice Nord")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Prochaines dates clés" }).getByText("Ouverture aux artisans"),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "En retard" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Marquer comme faite : Ouverture aux artisans" }),
  ).toHaveCount(0);
  await page.goto("/commercial/planning?vue=tout");
  await expect(page.getByText("Imprimer les cartes de visite")).toBeVisible();
  for (const hidden of [
    "Appeler les plombiers d'Antibes",
    "Feu vert interne",
    "Choisir le cabinet d'avocats",
  ]) {
    await expect(page.getByText(hidden)).toHaveCount(0);
  }
  await expect(page.getByText(/Objectif/)).toHaveCount(0);
  // État de départ du seed, même après une relance (CI) arrêtée entre le clic et la réouverture.
  await page.goto("/commercial/planning?vue=faites");
  const reopenFirst = page.getByRole("button", {
    name: "Rouvrir : Préparer la tournée de Nice Nord",
  });
  if ((await reopenFirst.count()) > 0) {
    await reopenFirst.click();
    await expect(reopenFirst).toHaveCount(0);
  }
  await page.goto("/commercial/planning");
  await capture(page, "lancement-commercial");

  // Cocher une tâche : elle passe dans « Faites », l'avancement suit ; puis on la rouvre.
  const progress = page.getByRole("progressbar", { name: "Avancement des tâches" });
  await expect(progress).toHaveAttribute("aria-valuetext", "1 tâche faite sur 3");
  await page
    .getByRole("button", { name: "Marquer comme faite : Préparer la tournée de Nice Nord" })
    .click();
  await expect(progress).toHaveAttribute("aria-valuetext", "2 tâches faites sur 3");
  await expect(
    page.getByRole("button", { name: "Marquer comme faite : Préparer la tournée de Nice Nord" }),
  ).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Filtrer les tâches" })
    .getByRole("link", { name: /^Faites/ })
    .click();
  await expect(page).toHaveURL(/\/commercial\/planning\?vue=faites$/);
  const reopen = page.getByRole("button", { name: "Rouvrir : Préparer la tournée de Nice Nord" });
  await expect(reopen).toBeVisible();
  await reopen.click();
  await expect(reopen).toHaveCount(0);
  await expect(progress).toHaveAttribute("aria-valuetext", "1 tâche faite sur 3");

  // Léa ne voit que son planning (et ce qui est partagé avec l'équipe).
  const other = await browser.newContext();
  const lea = await other.newPage();
  await signIn(lea, "commercial2@example.test");
  await expect(lea).toHaveURL(/\/commercial$/);
  await lea.goto("/commercial/planning?vue=tout");
  await expect(lea.getByText("Appeler les plombiers d'Antibes")).toBeVisible();
  await expect(lea.getByText("Préparer la tournée de Nice Nord")).toHaveCount(0);
  await other.close();
});
