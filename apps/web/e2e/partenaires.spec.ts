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

  // Espace partenaire (ADR 0139) : lien privé créé par l'admin, lu sans compte, renouvelable.
  await row.getByRole("link", { name: "Agence Exemple E2E" }).click();
  await admin.getByRole("button", { name: "Créer le lien" }).click();
  await expect(admin.getByText("Nouveau lien créé.")).toBeVisible();
  const spaceLink = await admin.getByLabel("Lien de l'espace partenaire").inputValue();
  expect(spaceLink).toMatch(/\/espace-partenaire\/[0-9a-f]{48}$/);
  const outsider = await browser.newContext();
  const space = await outsider.newPage();
  await space.goto(new URL(spaceLink).pathname);
  await expect(space.getByRole("heading", { name: "Agence Exemple E2E", level: 1 })).toBeVisible();
  const results = space.getByRole("region", { name: "Vos résultats" });
  await expect(results.getByText("Demandes de travaux")).toBeVisible();
  await expect(results.getByRole("definition").first()).toHaveText("1");
  // Intl sépare le montant et « € » par une espace fine insécable.
  await expect(space.getByText(/^10,00\s€ par demande qualifiée$/)).toBeVisible();
  await expect(space.getByLabel("Lien texte")).toHaveValue(/\/p\/agence-e2e"/);
  // Bannières du kit (ADR 0141) : aperçus, code relié au lien partenaire, image servie par MENAO.
  await expect(space.getByRole("img", { name: "Aperçu de la bannière 160 × 600" })).toBeVisible();
  await expect(space.locator("#banniere-particuliers-728x90")).toHaveValue(
    /href="[^"]*\/p\/agence-e2e"><img src="[^"]*\/bannieres\/menao-particuliers-728x90\.svg"/,
  );
  await expect(space.locator("#banniere-artisans-300x250")).toHaveValue(/\/p\/agence-e2e\/pro"/);
  const banner = await space.request.get("/bannieres/menao-particuliers-300x250.svg");
  expect(banner.status()).toBe(200);
  expect(banner.headers()["content-type"]).toContain("image/svg+xml");
  await admin.getByRole("button", { name: "Renouveler le lien" }).click();
  await expect(admin.getByText("Nouveau lien créé.")).toBeVisible();
  expect((await space.goto(new URL(spaceLink).pathname))?.status()).toBe(404);
  await outsider.close();

  // Page co-marquée (ADR 0142) : hors ligne par défaut, puis en ligne avec le message, aussitôt
  // (le cache de la page est vidé à l'enregistrement).
  const landing = await browser.newContext();
  const lp = await landing.newPage();
  expect((await lp.goto("/partenaires/agence-e2e"))?.status()).toBe(404);
  await admin.getByLabel("Page en ligne").check();
  await admin
    .getByLabel(/^Message de recommandation/)
    .fill("Nous travaillons avec MENAO pour vos travaux.");
  await admin.getByRole("button", { name: "Enregistrer la page" }).click();
  await expect(admin.getByText("Page enregistrée.")).toBeVisible();
  await expect(admin.getByLabel("Adresse de la page")).toHaveValue(/\/partenaires\/agence-e2e$/);
  await lp.goto("/partenaires/agence-e2e");
  await expect(
    lp.getByRole("heading", { name: "Agence Exemple E2E vous recommande MENAO", level: 1 }),
  ).toBeVisible();
  await expect(lp.getByText("Nous travaillons avec MENAO pour vos travaux.")).toBeVisible();
  await expect(lp.getByText(/ne reçoit jamais vos coordonnées/)).toBeVisible();
  await expect(lp.getByRole("textbox", { name: "Décrivez votre projet" })).toBeVisible();
  await expect(lp.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await landing.close();

  // Export des commissions à payer : CSV pour tableur, réservé aux admins.
  const csv = await admin.request.get("/admin/partenaires/export");
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect(await csv.text()).toContain("Partenaire;SIRET;Type;Statut;Montant (EUR)");
  await staff.close();
});

test("widget partenaire : seule page intégrable, ouvre la recherche pré-remplie (ADR 0138)", async ({
  page,
  request,
}) => {
  const response = await page.goto("/widget?p=agence-widget&metier=plombier");
  const headers = response?.headers() ?? {};
  expect(headers["content-security-policy"]).toContain("frame-ancestors https:");
  expect(headers["x-frame-options"]).toBeUndefined();
  const home = await request.get("/");
  expect(home.headers()["x-frame-options"]).toBe("DENY");
  expect(home.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");

  const script = await request.get("/widget.js");
  expect(script.status()).toBe(200);
  expect(await script.text()).toContain("menao:widget-height");

  await expect(page.getByLabel("Métier")).toHaveValue("plombier");
  await page.getByLabel("Votre projet").fill("Fuite sous l'évier de la cuisine à Nice");
  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: /Décrire mon projet sur MENAO/ }).click(),
  ]);
  await expect(popup).toHaveURL(/\/recherche\?p=agence-widget&metier=plombier&q=Fuite/);
  await expect(popup.getByRole("button", { name: /Plomberie/, pressed: true })).toBeVisible();
  const cookies = await page.context().cookies();
  expect(cookies.filter((c) => /agence-widget/.test(`${c.name}${c.value}`))).toEqual([]);
});

test("devenir partenaire : page publique et candidature envoyée à l'équipe (ADR 0139)", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Devenir partenaire" }).click();
  await expect(page).toHaveURL(/\/partenaires$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Recommandez des artisans vérifiés",
  );
  await page.getByRole("button", { name: "Envoyer ma candidature" }).click();
  await expect(page.getByText("Numéro SIRET invalide (14 chiffres).")).toBeVisible();
  await page.getByLabel("Nom de l'entreprise").fill("Agence Candidate E2E");
  await page.getByLabel("SIRET").fill("732 829 320 00074");
  await page.getByLabel("E-mail professionnel").fill(`candidat-${Date.now()}@example.test`);
  await page.getByLabel("Site web (facultatif)").fill("https://agence.example.test");
  await page
    .getByLabel("Votre activité et votre audience")
    .fill("Agence immobilière à Nice, 300 biens en gestion.");
  await page.getByRole("button", { name: "Envoyer ma candidature" }).click();
  await expect(
    page.getByText("Candidature envoyée. L'équipe MENAO vous répond par e-mail."),
  ).toBeVisible();
});
