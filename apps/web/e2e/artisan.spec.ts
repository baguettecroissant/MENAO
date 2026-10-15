import { expect, test } from "./test";
import { dates, fakeSiret, files, mockGeocoding } from "./fixtures";
import { authLinkFor } from "./mailpit";

// Données fictives uniquement (domaine .test, tranche ARCEP fiction, SIRET du faux serveur Sirene).
const password = "mot-de-passe-e2e-artisan";

test.beforeEach(async ({ page }) => {
  await mockGeocoding(page);
});

test("inscription artisan, onboarding complet et envoi en vérification", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const email = `e2e-pro-${Date.now()}@example.test`;
  const nextYear = `${new Date().getFullYear() + 1}-06-30`;

  await page.goto("/pro");
  await page.getByRole("link", { name: "Créer mon compte pro" }).first().click();
  await expect(page).toHaveURL(/\/pro\/inscription$/);
  await page.getByLabel("Prénom").fill("Dominique");
  await page.getByLabel("Nom", { exact: true }).fill("Exemple");
  await page.getByLabel("Numéro SIRET").fill(fakeSiret("active"));
  await page.getByLabel("Téléphone").fill("06 39 98 00 04");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByLabel(/J'accepte les conditions générales d'utilisation/).check();
  await page.getByLabel(/J'accepte les conditions générales de vente/).check();
  await page.getByRole("button", { name: "Créer mon compte pro" }).click();
  await expect(page).toHaveURL(/\/verifier-email$/);

  await page.goto(await authLinkFor(request, email));
  await expect(page).toHaveURL(/\/pro\/onboarding\/entreprise$/);

  // Étape 1 — entreprise
  await page.getByRole("button", { name: "Vérifier mon SIRET auprès de l'INSEE" }).click();
  await expect(page.getByRole("main").getByRole("status")).toHaveText(
    "Entreprise trouvée et active.",
  );
  await expect(page.getByText("MENUISERIE EXEMPLE")).toBeVisible();
  await expect(page.getByText("SARL")).toBeVisible();
  await page.getByLabel("Oui").check();
  await expect(page.getByText(/^FR\d{11}$/)).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer et continuer" }).click();
  await expect(page).toHaveURL(/\/pro\/onboarding\/metiers$/);

  // Étape 2 — certification puis métiers
  await page.getByLabel("Type").selectOption("rge");
  await page.getByLabel("Numéro", { exact: true }).fill("E-00000");
  await page.getByLabel("Date de fin de validité").fill(nextYear);
  await page.getByRole("button", { name: "Ajouter la certification" }).click();
  await expect(page.getByText(/RGE · E-00000 · valable jusqu'au 30 juin/)).toBeVisible();

  await page.getByLabel("Menuisier").check();
  await page.getByLabel("Fenêtres").check();
  await page.getByLabel("Années d'expérience").fill("8");
  await page.getByRole("button", { name: "Enregistrer et continuer" }).click();
  await expect(page).toHaveURL(/\/pro\/onboarding\/zone$/);

  // Étape 3 — zone en rayon, puis en communes
  await page.getByRole("combobox", { name: "Adresse de départ" }).fill("1 rue de l'exemple");
  await page.getByRole("option", { name: "1 Rue de l'Exemple 06000 Nice" }).click();
  await page.getByLabel("Rayon d'intervention").selectOption("30");
  await page.getByRole("button", { name: "Enregistrer et continuer" }).click();
  await expect(page).toHaveURL(/\/pro\/onboarding\/charte$/);
  const stepper = page.getByRole("navigation", { name: "Étapes de l'inscription" });
  for (const step of ["Entreprise", "Métiers", "Zone d'intervention"]) {
    await expect(
      stepper.getByRole("link", { name: new RegExp(`${step}.*terminée`) }),
    ).toBeVisible();
  }

  await page.goto("/pro/onboarding/zone");
  await page.getByLabel("Une liste de communes").check();
  await page.getByRole("combobox", { name: "Ajouter une commune" }).fill("nic");
  await page.getByRole("option", { name: "Nice (06000)" }).click();
  await page.getByRole("combobox", { name: "Ajouter une commune" }).fill("ant");
  await page.getByRole("option", { name: "Antibes (06600)" }).click();
  await expect(page.getByRole("list", { name: "Communes" }).getByRole("listitem")).toHaveCount(2);
  await page.getByRole("button", { name: "Retirer Nice" }).click();
  await page.getByRole("button", { name: "Enregistrer et continuer" }).click();
  await expect(page).toHaveURL(/\/pro\/onboarding\/charte$/);

  // Étape 4 — charte qualité (ADR 0104) : 25 règles cochées, tracé de signature, accord
  await expect(page.getByRole("heading", { name: /Rejoindre Menao/ })).toBeVisible();
  await page.getByRole("button", { name: /Signer et rejoindre Menao/ }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Pour signer" })).toContainText(
    "coche les 25 règle(s) restante(s)",
  );
  const rules = page.getByRole("checkbox", { name: /^Règle R\d+\.\d+ :/ });
  await expect(rules).toHaveCount(25);
  for (const rule of await rules.all()) await rule.click();
  await expect(page.getByText("25 / 25")).toBeVisible();
  await expect(page.getByLabel("N° SIRET")).not.toHaveValue("");
  const pad = page.getByLabel("Zone de signature : signe avec le doigt ou la souris");
  await pad.scrollIntoViewIfNeeded();
  const box = await pad.boundingBox();
  if (!box) throw new Error("zone de signature introuvable");
  await page.mouse.move(box.x + 30, box.y + 90);
  await page.mouse.down();
  await page.mouse.move(box.x + 150, box.y + 40, { steps: 8 });
  await page.mouse.move(box.x + 280, box.y + 100, { steps: 8 });
  await page.mouse.up();
  await page.getByRole("checkbox", { name: /accepte la Charte qualité Menao/ }).click();
  await page.getByRole("button", { name: /Signer et rejoindre Menao/ }).click();
  await expect(page.getByRole("heading", { name: /Tu fais partie de Menao/ })).toBeVisible();
  await expect(page.getByText("25 / 25 (R1.1 à R6.2)")).toBeVisible();
  await page.getByRole("link", { name: /Continuer : vérification de mes documents/ }).click();
  await expect(page).toHaveURL(/\/pro\/onboarding\/documents$/);

  // Étape 5 — documents (un faux PDF est refusé d'après son contenu réel)
  const kbis = page.getByRole("region", { name: "Kbis ou extrait INSEE/RNE de moins de 3 mois" });
  await kbis.getByLabel("Date d'émission").fill(dates.recent);
  await kbis.getByLabel("Fichier").setInputFiles(files.fakePdf);
  await kbis.getByRole("button", { name: "Déposer le document" }).click();
  await expect(kbis.getByRole("alert")).toContainText("n'est pas accepté");
  await kbis.getByLabel("Date d'émission").fill(dates.recent);
  await kbis.getByLabel("Fichier").setInputFiles(files.pdf);
  await kbis.getByRole("button", { name: "Déposer le document" }).click();
  await expect(kbis.getByText("Déposé, en attente de vérification")).toBeVisible();

  const decennale = page.getByRole("region", { name: "Attestation d'assurance décennale" });
  await decennale.getByLabel("Assureur").fill("Assurances Exemple");
  await decennale.getByLabel("Numéro de contrat").fill("DEC-0001");
  await decennale.getByLabel("Date de fin de validité").fill(dates.nextYear);
  await decennale.getByLabel("Couverture géographique").fill("France métropolitaine");
  await decennale.getByLabel("Fichier").setInputFiles(files.pdf);
  await decennale.getByRole("button", { name: "Déposer le document" }).click();
  await expect(decennale.getByText("Déposé, en attente de vérification")).toBeVisible();

  const rcPro = page.getByRole("region", {
    name: "Attestation de responsabilité civile professionnelle",
  });
  await rcPro.getByLabel("Assureur").fill("Assurances Exemple");
  await rcPro.getByLabel("Numéro de contrat").fill("RC-0001");
  await rcPro.getByLabel("Date de fin de validité").fill(dates.nextYear);
  await rcPro.getByLabel("Fichier").setInputFiles(files.png);
  await rcPro.getByRole("button", { name: "Déposer le document" }).click();
  await expect(rcPro.getByText("Déposé, en attente de vérification")).toBeVisible();

  const identite = page.getByRole("region", { name: "Pièce d'identité du dirigeant" });
  await identite.getByLabel("Fichier").setInputFiles(files.pdf);
  await identite.getByRole("button", { name: "Déposer le document" }).click();
  await expect(identite.getByText("Déposé, en attente de vérification")).toBeVisible();
  await expect(kbis.getByRole("link", { name: "Voir le document" })).toHaveAttribute(
    "href",
    /token=/,
  );

  // Étape 6 — profil public
  await page.goto("/pro/onboarding/profil");
  const avatar = page.getByRole("region", { name: "Photo de profil" });
  await avatar.getByLabel("Fichier").setInputFiles(files.png);
  await avatar.getByRole("button", { name: "Envoyer la photo" }).click();
  await expect(page.getByRole("img", { name: "Photo de profil" })).toBeVisible();

  await page
    .getByLabel("Présentation")
    .fill(
      "Menuisier depuis huit ans dans les Alpes-Maritimes, je pose fenêtres, portes et placards sur mesure avec soin.",
    );
  await page.getByRole("button", { name: "Enregistrer la présentation" }).click();
  await expect(page.getByText("Enregistré.")).toBeVisible();

  const portfolio = page.getByRole("region", { name: "Photos de réalisations" });
  await portfolio.getByLabel("Fichier").setInputFiles(files.png);
  await portfolio.getByRole("button", { name: "Ajouter la photo" }).click();
  await expect(page.getByRole("img", { name: "Réalisation 1" })).toBeVisible();

  // Envoi du dossier : ensuite, documents figés
  await page.goto("/pro/onboarding");
  await page.getByRole("button", { name: "Envoyer mon dossier en vérification" }).click();
  await expect(page.getByRole("main").getByRole("status").first()).toContainText(
    "en cours de vérification",
  );
  await page.goto("/pro/onboarding/documents");
  await expect(page.getByRole("button", { name: /Déposer|Remplacer/ })).toHaveCount(0);
});

test("SIRET inconnu ou entreprise fermée : message clair (compte artisan du seed)", async ({
  page,
}) => {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill("artisan@example.test");
  await page.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/\/pro\/onboarding\/entreprise$/);

  await page.getByLabel("Numéro SIRET").fill("00000003400017");
  await page.getByRole("button", { name: "Modifier le SIRET" }).click();
  await page.getByRole("button", { name: /Vérifier/ }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "Aucun établissement ne correspond à ce SIRET. Vérifiez votre saisie.",
  );

  await page.getByLabel("Numéro SIRET").fill(fakeSiret("fermee"));
  await page.getByRole("button", { name: "Modifier le SIRET" }).click();
  await page.getByRole("button", { name: /Vérifier/ }).click();
  await expect(page.getByRole("main").getByRole("alert").first()).toContainText("fermée");
  await expect(page.getByRole("button", { name: "Enregistrer et continuer" })).toHaveCount(0);
});

test("un particulier n'accède pas à l'onboarding artisan", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill("particulier@example.test");
  await page.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/\/mon-espace$/);
  await page.goto("/pro/onboarding/entreprise");
  await expect(page).toHaveURL(/\/mon-espace$/);
});
