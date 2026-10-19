import { mockGeocoding } from "./fixtures";
import { expect, test } from "./test";
import { totp } from "./totp";

// Programme Partenaires (F-59, ADR 0136). Compte fictif du seed : admin4@example.test.
const UUID = "[0-9a-f-]{36}";

test("partenaires : création, liens sans traceur, demande attribuée, réglages et export", async ({
  browser,
}) => {
  test.setTimeout(150_000);

  const staff = await browser.newContext();
  const admin = await staff.newPage();
  await admin.goto("/connexion");
  await admin.getByLabel("Adresse e-mail").fill("admin4@example.test");
  await admin.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await admin.getByRole("button", { name: "Me connecter" }).click();
  await expect(admin).toHaveURL(/\/admin\/mfa\/activer$/);
  const secret = (await admin.getByTestId("totp-secret").textContent())?.trim() ?? "";
  await admin.getByLabel("Code à 6 chiffres").fill(totp(secret));
  await admin.getByRole("button", { name: "Vérifier" }).click();
  await expect(admin).toHaveURL(/\/admin$/);

  await admin
    .getByRole("navigation", { name: "Navigation du back-office" })
    .getByRole("link", { name: "Partenaires" })
    .click();
  await expect(admin.getByRole("heading", { name: "Partenaires", level: 1 })).toBeVisible();

  // Réglages du programme : montants par défaut décidés par les fondateurs (règle 15).
  await admin.getByLabel("Prime par défaut par demande qualifiée (€)").fill("10");
  await admin.getByLabel("Prime par défaut par abonné payant (€)").fill("40");
  await admin.getByRole("button", { name: "Enregistrer les réglages" }).click();
  await expect(admin.getByText("Réglages enregistrés.")).toBeVisible();

  // Création : SIRET obligatoire (professionnels seulement), puis fiche du partenaire.
  await admin.getByLabel("Code du lien").fill("agence-e2e");
  await admin.getByLabel("Nom de l'entreprise").fill("Agence Exemple E2E");
  await admin.getByLabel("SIRET").fill("73282932000075");
  await admin.getByLabel("E-mail de contact").fill("agence-e2e@example.test");
  await admin.getByRole("button", { name: "Créer le partenaire" }).click();
  await expect(
    admin.getByText("SIRET invalide : le programme est réservé aux professionnels."),
  ).toBeVisible();
  await admin.getByLabel("SIRET").fill("73282932000074");
  await admin.getByRole("button", { name: "Créer le partenaire" }).click();
  await expect(admin).toHaveURL(new RegExp(`/admin/partenaires/${UUID}$`));
  await expect(admin.getByRole("heading", { name: "Agence Exemple E2E", level: 1 })).toBeVisible();
  await expect(admin.locator("code", { hasText: /\/p\/agence-e2e$/ })).toBeVisible();
  await expect(admin.locator("code", { hasText: /\/p\/agence-e2e\/pro$/ })).toBeVisible();

  // Liens partenaire : simples redirections, le code suit l'adresse (aucun cookie posé).
  const visitor = await browser.newContext();
  const page = await visitor.newPage();
  await page.goto("/p/agence-e2e/pro");
  await expect(page).toHaveURL(/\/pro\/inscription\?p=agence-e2e$/);
  await mockGeocoding(page);
  await page.goto("/p/agence-e2e");
  await expect(page).toHaveURL(/\/recherche\?p=agence-e2e$/);
  const cookies = await visitor.cookies();
  expect(cookies.filter((c) => /partenaire|partner|agence/i.test(`${c.name}${c.value}`))).toEqual(
    [],
  );
  await page
    .getByLabel("Décrivez votre projet")
    .fill("Fuite sous l'évier de la cuisine de mon appartement à Nice, à réparer rapidement.");
  await page.getByRole("button", { name: "Trouver mon artisan du BTP idéal" }).click();
  await expect(page).toHaveURL(new RegExp(`/recherche/${UUID}$`), { timeout: 30_000 });
  await visitor.close();

  // Back-office : la demande est attribuée au partenaire (commission seulement à l'acceptation).
  await admin.goto("/admin/partenaires");
  const row = admin.getByRole("row", { name: /Agence Exemple E2E/ });
  await expect(row.getByRole("cell").nth(1)).toHaveText("1");
  await expect(row.getByRole("cell").nth(2)).toHaveText("0");

  // Export des commissions à payer : CSV pour tableur, réservé aux admins.
  const csv = await admin.request.get("/admin/partenaires/export");
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect(await csv.text()).toContain("Partenaire;SIRET;Type;Statut;Montant (EUR)");
  await staff.close();
});
