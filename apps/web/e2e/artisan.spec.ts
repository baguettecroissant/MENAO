import { expect, test } from "./test";
import { dates, fakeSiret, files, mockCompanySearch, mockGeocoding } from "./fixtures";
import { authCodeFor } from "./mailpit";

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

  const siret = fakeSiret("active");
  await mockCompanySearch(page, siret);

  // Inscription en un seul parcours (ADR 0110) : métiers, entreprise, zone, compte, code.
  await page.goto("/pro");
  await page.getByRole("link", { name: "Créer mon compte pro" }).first().click();
  await expect(page).toHaveURL(/\/pro\/inscription$/);
  await page.getByRole("button", { name: "Commencer" }).click();

  await page.getByRole("checkbox", { name: "Menuisier" }).check();
  await page.getByRole("button", { name: "Continuer · 1 métier" }).click();

  await page.getByRole("searchbox", { name: "Nom de l'entreprise ou SIRET" }).fill("menuiserie");
  await page.getByRole("button", { name: /MENUISERIE EXEMPLE/ }).click();
  await expect(page.getByText("1 Rue de l'Exemple 06000 Nice")).toBeVisible();
  await page.getByRole("radio", { name: "Oui, c'est moi" }).check();
  await page
    .getByRole("group", { name: "Votre entreprise facture-t-elle la TVA ?" })
    .getByRole("radio", { name: "Oui" })
    .check();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();

  await expect(page.getByText("Depuis Nice")).toBeVisible();
  await page.getByRole("radio", { name: "30 km" }).check();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();

  // Le dirigeant reconnu n'a pas à retaper son nom.
  await expect(page.getByLabel("Prénom")).toHaveValue("Dominique");
  await expect(page.getByLabel("Nom", { exact: true })).toHaveValue("Exemple");
  await page.getByLabel("E-mail professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByLabel("Téléphone portable").fill("06 39 98 00 04");
  await page.getByLabel(/J'accepte les conditions générales d'utilisation/).check();
  await page.getByLabel(/J'accepte les conditions générales de vente/).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();

  await page.getByLabel("Code reçu par e-mail").fill(await authCodeFor(request, email));
  await page.getByRole("button", { name: "Valider" }).click();
  await expect(page).toHaveURL(/\/pro\/bienvenue$/);
  await expect(page.getByRole("heading", { name: "Votre profil est créé" })).toBeVisible();
  // Raison sociale vérifiée auprès de l'INSEE (faux serveur Sirene) dès la création du compte.
  await expect(page.getByText("MENUISERIE EXEMPLE")).toBeVisible();
  await expect(page.getByText("Menuisier", { exact: true })).toBeVisible();
  await expect(page.getByText(/30 km autour de 1 Rue de l'Exemple 06000 Nice/)).toBeVisible();
  await page.getByRole("link", { name: "Faire vérifier mon entreprise" }).click();

  // « Faire vérifier mon entreprise » (ADR 0111) : entreprise, métiers et zone déjà faits.
  await expect(page).toHaveURL(/\/pro\/onboarding$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Faire vérifier mon entreprise" }),
  ).toBeVisible();
  await expect(page.getByText("1 sur 8")).toBeVisible();
  await expect(page.getByText("Encore 7 éléments avant l'envoi.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Envoyer mon dossier en vérification" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Votre entreprise, vos métiers, votre zone" }),
  ).toContainText("Fait");

  // Les étapes restent modifiables : certification et spécialité, puis zone en communes.
  await page.goto("/pro/onboarding/entreprise");
  await expect(page.getByRole("heading", { level: 1, name: "Entreprise" })).toBeVisible();
  await expect(page.getByText(/^FR\d{11}$/)).toBeVisible();
  await page.goto("/pro/onboarding/metiers");
  // RGE lu dans l'annuaire de l'ADEME (faux serveur) avec la vérification du SIRET, puis
  // « Actualiser » (ADR 0118).
  await expect(page.getByText("Isolation des combles perdus")).toBeVisible();
  await page.getByRole("button", { name: "Actualiser" }).click();
  await expect(page.getByText("Annuaire RGE consulté : votre fiche est à jour.")).toBeVisible();
  await expect(page.getByText(/^Annuaire consulté le /)).toBeVisible();
  await page.getByLabel("Type").selectOption("rge");
  await page.getByLabel("Numéro", { exact: true }).fill("E-00000");
  await page.getByLabel("Date de fin de validité").fill(nextYear);
  await page.getByRole("button", { name: "Ajouter la certification" }).click();
  await expect(page.getByText(/RGE · E-00000 · valable jusqu'au 30 juin/)).toBeVisible();
  await expect(page.getByLabel("Menuisier")).toBeChecked();
  await page.getByLabel("Fenêtres").check();
  await page.getByLabel("Années d'expérience").fill("8");
  await page.getByRole("button", { name: "Enregistrer et continuer" }).click();
  await expect(page).toHaveURL(/\/pro\/onboarding$/);

  await page.goto("/pro/onboarding/zone");
  await page.getByLabel("Une liste de communes").check();
  await page.getByRole("combobox", { name: "Ajouter une commune" }).fill("nic");
  await page.getByRole("option", { name: "Nice (06000)" }).click();
  await page.getByRole("combobox", { name: "Ajouter une commune" }).fill("ant");
  await page.getByRole("option", { name: "Antibes (06600)" }).click();
  await expect(page.getByRole("list", { name: "Communes" }).getByRole("listitem")).toHaveCount(2);
  await page.getByRole("button", { name: "Retirer Nice" }).click();
  await page.getByRole("button", { name: "Enregistrer et continuer" }).click();
  await expect(page).toHaveURL(/\/pro\/onboarding$/);
  await page.getByRole("link", { name: /Charte qualité MENAO/ }).click();
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
  // Engagement de l'artisan (ADR 0117), certifié avec la même signature.
  await page.getByRole("checkbox", { name: /certifie sur l'honneur/ }).click();
  await page.getByRole("checkbox", { name: /accepte la Charte qualité Menao/ }).click();
  await page.getByRole("button", { name: /Signer et rejoindre Menao/ }).click();
  await expect(page.getByRole("heading", { name: /Tu fais partie de Menao/ })).toBeVisible();
  await expect(page.getByText("25 / 25 (R1.1 à R6.2)")).toBeVisible();
  await page.getByRole("link", { name: /Continuer : mes documents/ }).click();
  await expect(page).toHaveURL(/\/pro\/onboarding$/);
  await expect(page.getByRole("link", { name: /Charte qualité MENAO.*Signée/ })).toBeVisible();

  // Documents : une pièce à la fois depuis le dossier (un faux PDF est refusé d'après son contenu
  // réel), puis les autres sur la page de tous les documents.
  await page
    .getByRole("link", { name: /Kbis ou extrait INSEE\/RNE de moins de 3 mois.*À ajouter/ })
    .click();
  await expect(page).toHaveURL(/\/pro\/onboarding\/documents\?type=kbis$/);
  await expect(page.getByRole("region")).toHaveCount(1);
  await expect(page.getByLabel("Prendre en photo")).toHaveAttribute("capture", "environment");
  const kbis = page.getByRole("region", { name: "Kbis ou extrait INSEE/RNE de moins de 3 mois" });
  await kbis.getByLabel("Date d'émission").fill(dates.recent);
  await kbis.getByLabel("Fichier").setInputFiles(files.fakePdf);
  await kbis.getByRole("button", { name: "Déposer le document" }).click();
  await expect(kbis.getByRole("alert")).toContainText("n'est pas accepté");
  await kbis.getByLabel("Date d'émission").fill(dates.recent);
  await kbis.getByLabel("Fichier").setInputFiles(files.pdf);
  await kbis.getByRole("button", { name: "Déposer le document" }).click();
  await expect(kbis.getByText("Déposé, en attente de vérification")).toBeVisible();
  await page.getByRole("link", { name: "Retour à mon dossier" }).click();
  await expect(
    page.getByRole("link", { name: /Kbis ou extrait INSEE\/RNE de moins de 3 mois.*Déposé/ }),
  ).toBeVisible();
  await page.goto("/pro/onboarding/documents");

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

  // Attestation de vigilance URSSAF (ADR 0115) : date d'émission et code de sécurité.
  const urssaf = page.getByRole("region", { name: "Attestation de vigilance URSSAF" });
  await urssaf.getByLabel("Date d'émission").fill(dates.recent);
  await urssaf.getByLabel("Code de sécurité").fill("URSSAF-0001");
  await urssaf.getByLabel("Fichier").setInputFiles(files.pdf);
  await urssaf.getByRole("button", { name: "Déposer le document" }).click();
  await expect(urssaf.getByText("Déposé, en attente de vérification")).toBeVisible();
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
  // Le dossier (ADR 0111), puis l'étape « Entreprise ».
  await expect(page).toHaveURL(/\/pro\/onboarding$/);
  await page.getByRole("link", { name: "Entreprise", exact: true }).click();
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
