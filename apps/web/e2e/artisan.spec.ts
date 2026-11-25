import { expect, test } from "./test";
import { dates, fakeSiret, files, mockCompanySearch, mockGeocoding } from "./fixtures";
import { acceptCharterParts, drawSignature } from "./charter";
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
  // Formule de Base (ADR 0290) : 2 métiers au plus, les autres se grisent.
  await page.getByRole("checkbox", { name: "Plombier" }).check();
  await expect(page.getByRole("checkbox", { name: "Peintre" })).toBeDisabled();
  await expect(page.getByText(/^Jusqu'à 2 métiers avec la formule Base/)).toBeVisible();
  await page.getByRole("checkbox", { name: "Plombier" }).uncheck();
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
  // La suite annoncée (ADR 0376) : cinq minutes pour envoyer, le Kbis déjà vérifié au registre.
  await expect(page.getByText("Environ 5 minutes, avec votre pièce d'identité")).toBeVisible();
  await expect(page.getByText("Votre pièce d'identité", { exact: true })).toBeVisible();
  await expect(page.getByText("Kbis : déjà vérifié au registre, rien à déposer")).toBeVisible();
  await expect(page.getByText(/^Ensuite, à votre rythme : votre formule/)).toBeVisible();
  // « Commencer » ouvre la première étape du parcours guidé : la charte.
  await page.getByRole("link", { name: "Commencer" }).click();
  await expect(page).toHaveURL(/\/pro\/onboarding\/charte$/);
  await expect(page.getByText("Partie 1 sur 9 · Réactivité")).toBeVisible();

  // « Mon inscription » (ADR 0376) : un seul parcours de six étapes, la charte en premier.
  await page.getByRole("main").getByRole("link", { name: "Mon inscription" }).click();
  await expect(page).toHaveURL(/\/pro\/onboarding$/);
  await expect(page.getByRole("heading", { level: 1, name: "Votre inscription" })).toBeVisible();
  await expect(page.getByText("0 étape faite sur 6")).toBeVisible();
  // Kbis : entreprise vérifiée au registre dès l'inscription (ADR 0217, faux annuaire).
  await expect(
    page.getByRole("link", {
      name: /Votre entreprise.*MENUISERIE EXEMPLE.*Kbis vérifié au registre/,
    }),
  ).toBeVisible();
  await expect(page.locator('a[aria-current="step"]')).toContainText("Charte qualité MENAO");
  await expect(page.getByRole("link", { name: "Continuer : la charte" })).toBeVisible();
  // Plus de bouton « Envoyer » : le dossier part tout seul dès qu'il peut partir.
  await expect(page.getByRole("button", { name: /Envoyer mon dossier/ })).toHaveCount(0);

  // Les étapes restent modifiables : certification et spécialité, puis zone en communes.
  await page.goto("/pro/onboarding/entreprise");
  await expect(page.getByRole("heading", { level: 1, name: "Votre entreprise" })).toBeVisible();
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
  await expect(page.getByText(/^Votre formule permet 2 métiers/)).toBeVisible();
  await page.getByLabel("Fenêtres").check();
  await page.getByLabel("Années d'expérience").fill("8");
  await page.getByRole("button", { name: "Enregistrer et continuer" }).click();
  await expect(page).toHaveURL(/\/pro\/onboarding$/);

  await page.goto("/pro/onboarding/zone");
  // Rayon choisi à l'inscription : carte de l'adresse enregistrée (ADR 0127).
  await expect(page.locator('img[src^="https://data.geopf.fr/wmts"]').first()).toBeAttached();
  // Départements (ADR 0213) : l'adresse enregistrée est gardée, les choix sont relus.
  await page.getByLabel("Un ou plusieurs départements").check();
  await page.getByRole("combobox", { name: "Ajouter un département" }).fill("var");
  await page.getByRole("option", { name: "Var (83)" }).click();
  await page.getByRole("button", { name: "Enregistrer et continuer" }).click();
  await expect(page).toHaveURL(/\/pro\/onboarding$/);
  await page.goto("/pro/onboarding/zone");
  await expect(page.getByLabel("Un ou plusieurs départements")).toBeChecked();
  await expect(page.getByRole("button", { name: "Retirer Var (83)" })).toBeVisible();
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

  // Étape 4 — charte qualité (ADR 0104), une partie par écran (ADR 0373) : chaque partie
  // acceptée avec le bouton du bas, puis l'engagement, le tracé de signature et l'accord.
  await expect(page.getByRole("heading", { name: /Rejoindre Menao/ })).toBeVisible();
  await acceptCharterParts(page);
  // Nom, entreprise et SIRET déjà connus : un récapitulatif, sans champ à remplir.
  await expect(page.getByRole("group", { name: "Signataire" })).toContainText("MENUISERIE EXEMPLE");
  await page.getByRole("button", { name: /Signer et rejoindre MENAO/ }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Pour signer" })).toContainText(
    "signe dans le cadre, coche l’acceptation de la charte",
  );
  await drawSignature(page);
  await page.getByRole("checkbox", { name: /accepte la Charte qualité Menao/ }).click();
  await page.getByRole("button", { name: /Signer et rejoindre MENAO/ }).click();
  await expect(page.getByRole("heading", { name: /Tu fais partie de Menao/ })).toBeVisible();
  await expect(page.getByText("25 / 25 (R1.1 à R6.2)")).toBeVisible();
  // La suite du parcours : la pièce d'identité, avec sa barre du bas.
  await page.getByRole("link", { name: /Continuer : mes documents/ }).click();
  await expect(page).toHaveURL(/\/pro\/onboarding\/documents\?type=identite$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Pièce d'identité du dirigeant" }),
  ).toBeVisible();
  await expect(page.getByText("Étape 2 sur 6 · Pièce d'identité")).toBeVisible();
  // Rien à remplir avant d'avoir choisi le fichier ; sans la pièce, on passe à la suivante.
  await expect(page.getByLabel("Date d'expiration (optionnel)")).toBeHidden();
  await page.getByRole("link", { name: "Passer pour l'instant" }).click();
  await expect(page).toHaveURL(/\/pro\/onboarding\/profil$/);
  await expect(page.getByText("Étape 3 sur 6 · Votre fiche")).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "Mon inscription" }).click();
  await expect(page).toHaveURL(/\/pro\/onboarding$/);
  await expect(page.getByRole("link", { name: /Charte qualité MENAO.*Signée/ })).toBeVisible();
  await expect(page.getByText("1 étape faite sur 6")).toBeVisible();

  // Les trois attestations sur un seul écran (ADR 0376) : on dépose celles qu'on a. Un faux PDF
  // est refusé d'après son contenu réel.
  await page.getByRole("link", { name: /Vos attestations/ }).click();
  await expect(page).toHaveURL(/\/pro\/onboarding\/attestations$/);
  await expect(page.getByRole("heading", { level: 1, name: "Vos 3 attestations" })).toBeVisible();
  await expect(page.getByText("Étape 5 sur 6 · Attestations")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /MENAO prépare le message pour votre assureur/ }),
  ).toHaveAttribute("href", "/pro/onboarding/documents/assureur?type=decennale");
  // Attestation de vigilance URSSAF (ADR 0115) : date d'émission et code de sécurité.
  const urssaf = page.getByRole("region", { name: "Attestation de vigilance URSSAF ou MSA" });
  await expect(urssaf.getByLabel("Prendre en photo")).toHaveAttribute("capture", "environment");
  // Aide de l'inscription (ADR 0347) : où trouver la pièce, avec la vidéo et le lien officiel.
  await urssaf.getByText("Où trouver ce document ?").click();
  await expect(
    urssaf.getByRole("button", { name: /Trouver votre attestation URSSAF/ }),
  ).toBeVisible();
  await expect(urssaf.getByRole("link", { name: "Ouvrir mon espace URSSAF" })).toHaveAttribute(
    "href",
    "https://www.autoentrepreneur.urssaf.fr",
  );
  // Les champs n'apparaissent qu'une fois le fichier choisi.
  await expect(urssaf.getByLabel("Date d'émission")).toBeHidden();
  await urssaf.getByLabel("Fichier").setInputFiles(files.fakePdf);
  await urssaf.getByLabel("Date d'émission").fill(dates.recent);
  await urssaf.getByLabel("Code de sécurité").fill("URSSAF-0001");
  await urssaf.getByRole("button", { name: "Déposer le document" }).click();
  await expect(urssaf.getByRole("alert")).toContainText("n'est pas accepté");
  await urssaf.getByLabel("Fichier").setInputFiles(files.pdf);
  await urssaf.getByLabel("Date d'émission").fill(dates.recent);
  await urssaf.getByLabel("Code de sécurité").fill("URSSAF-0001");
  await urssaf.getByRole("button", { name: "Déposer le document" }).click();
  await expect(urssaf.getByText("Déposé", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Vous déposerez les 2 autres plus tard, MENAO vous le rappelle par e-mail."),
  ).toBeVisible();
  // L'ancienne adresse d'une attestation mène à cet écran.
  await page.goto("/pro/onboarding/documents?type=urssaf");
  await expect(page).toHaveURL(/\/pro\/onboarding\/attestations#urssaf$/);
  await page.goto("/pro/onboarding/documents");
  const kbis = page.getByRole("region", { name: "Kbis ou extrait INSEE/RNE de moins de 3 mois" });
  await expect(
    kbis.getByText(/Entreprise vérifiée automatiquement au registre des entreprises le/),
  ).toBeVisible();
  await expect(kbis.getByRole("button", { name: "Déposer le document" })).toHaveCount(0);

  const decennale = page.getByRole("region", { name: "Attestation d'assurance décennale" });
  await decennale.getByLabel("Assureur").fill("Assurances Exemple");
  await decennale.getByLabel("Numéro de contrat").fill("DEC-0001");
  await decennale.getByLabel("Date de fin de validité").fill(dates.nextYear);
  await decennale.getByLabel("Couverture géographique").fill("France métropolitaine");
  await decennale.getByLabel("Fichier").setInputFiles(files.pdf);
  await decennale.getByRole("button", { name: "Déposer le document" }).click();
  await expect(decennale.getByText("Déposé, en attente de vérification")).toBeVisible();

  // Message prêt pour l'assureur (ADR 0347) : décennale au modèle officiel et RC Pro.
  await page.goto("/pro/onboarding/documents/assureur?type=decennale");
  const message = page.getByLabel("Message");
  await expect(message).toHaveValue(/arrêté du 5 janvier 2016/);
  await expect(message).toHaveValue(/responsabilité civile professionnelle/);
  await page.getByLabel(/Demander aussi la RC Pro/).uncheck();
  await expect(message).not.toHaveValue(/civile professionnelle/);
  await expect(page.getByRole("link", { name: "Envoyer avec ma messagerie" })).toHaveAttribute(
    "href",
    /^mailto:\?subject=Attestation%20d%C3%A9cennale/,
  );
  await page.goto("/pro/onboarding/documents");

  const rcPro = page.getByRole("region", {
    name: "Attestation de responsabilité civile professionnelle",
  });
  await rcPro.getByLabel("Assureur").fill("Assurances Exemple");
  await rcPro.getByLabel("Numéro de contrat").fill("RC-0001");
  await rcPro.getByLabel("Date de fin de validité").fill(dates.nextYear);
  await rcPro.getByLabel("Fichier").setInputFiles(files.png);
  await rcPro.getByRole("button", { name: "Déposer le document" }).click();
  await expect(rcPro.getByText("Déposé, en attente de vérification")).toBeVisible();

  // Lecture automatique (ADR 0176) : la date d'expiration lue pré-remplit le champ.
  // Pièce d'identité selon son type (ADR 0378) : un passeport tient en une page, une carte se
  // dépose recto et verso ; le bouton ne s'allume qu'une fois les deux côtés déposés.
  const identite = page.getByRole("region", { name: "Pièce d'identité du dirigeant" });
  await identite.getByLabel("Passeport").check();
  await expect(identite.getByLabel("Page d'identité : choisir un fichier")).toBeAttached();
  await expect(identite.getByLabel("Verso : choisir un fichier")).toHaveCount(0);
  await identite.getByLabel("Carte d'identité").check();
  await identite.getByLabel("Recto : choisir un fichier").setInputFiles(files.png);
  await expect(identite.getByText("Recto déposé")).toBeVisible();
  await expect(identite.getByText("Lu sur le recto")).toBeVisible();
  await expect(identite.getByText("Il reste le verso")).toBeVisible();
  await expect(identite.getByRole("button", { name: "Déposer le document" })).toBeDisabled();
  await identite.getByLabel("Verso : choisir un fichier").setInputFiles(files.png);
  await expect(identite.getByText("Verso déposé")).toBeVisible();
  await expect(identite.getByText("Lu automatiquement : vérifiez")).toBeVisible();
  await expect(identite.getByLabel("Date d'expiration (optionnel)")).toHaveValue(dates.inTenYears);
  // Deux images : la pièce pourra être transmise à Stripe, l'artisan en est informé.
  await expect(identite.getByText("Vous n'aurez pas à la refaire")).toBeVisible();
  // Date de naissance lue sur la pièce (ADR 0375) : gardée par le navigateur, à ce compte, pour
  // pré-remplir l'étape « Paiements » ; rien n'est enregistré chez MENAO.
  expect(
    await page.evaluate(() =>
      Object.entries(localStorage)
        .filter(([key]) => key.startsWith("menao:naissance:"))
        .map(([, value]) => value),
    ),
  ).toEqual(["1980-01-01"]);
  await identite.getByRole("button", { name: "Déposer le document" }).click();
  await expect(identite.getByText("Déposé, en attente de vérification")).toBeVisible();
  await expect(identite.getByRole("link", { name: "Voir le verso" })).toHaveAttribute(
    "href",
    /token=/,
  );

  await expect(kbis.getByRole("link", { name: "Voir la fiche de vérification" })).toHaveAttribute(
    "href",
    /token=/,
  );

  // Étape 6 — profil public
  await page.goto("/pro/onboarding/profil");
  // Une seule image, logo ou photo, au choix (ADR 0355) : ici une photo.
  const avatar = page.getByRole("region", { name: "Votre image" });
  await expect(avatar.getByRole("radio", { name: /Mon logo/ })).toBeChecked();
  await avatar.getByRole("radio", { name: /Une photo/ }).click();
  await avatar.getByLabel("Fichier").setInputFiles(files.png);
  // Cadrage avant l'envoi (ADR 0202) : la fenêtre s'ouvre, le cadrage proposé est validé.
  const framer = page.getByRole("dialog", { name: "Cadrer votre photo" });
  await framer.getByRole("button", { name: "Valider le cadrage" }).click();
  await expect(framer).toBeHidden();
  await expect(avatar.getByText("Photo cadrée, prête à être envoyée.")).toBeVisible();
  await avatar.getByRole("button", { name: "Envoyer la photo" }).click();
  await expect(page.getByRole("img", { name: "Photo de profil" })).toBeVisible();

  // Présentation préremplie avec le brouillon de MENAO (ADR 0372), que l'artisan peut réécrire.
  await expect(page.getByText(/^Nous avons écrit ce texte/)).toBeVisible();
  await expect(page.getByLabel("Présentation")).not.toHaveValue("");
  await page
    .getByLabel("Présentation")
    .fill(
      "Menuisier depuis huit ans dans les Alpes-Maritimes, je pose fenêtres, portes et placards sur mesure avec soin.",
    );

  const portfolio = page.getByRole("region", { name: "Photos de réalisations" });
  // Plusieurs photos à la fois, envoyées l'une après l'autre dès le choix.
  await portfolio.getByLabel("Ajouter des photos").setInputFiles([files.png, files.png]);
  await expect(portfolio.getByText("2 photos ajoutées.")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("img", { name: "Réalisation 2" })).toBeVisible();

  // Sur téléphone, l'aperçu « Ce que verront les clients » vient en dernier : il se lit jusqu'au
  // bout, au-dessus de la barre du parcours.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const overlap = await page.evaluate(() => {
    const preview = [...document.querySelectorAll("aside")].find((el) =>
      el.textContent?.includes("Ce que verront les clients"),
    );
    const bar = [...document.querySelectorAll("div")].find(
      (el) => getComputedStyle(el).position === "fixed" && el.textContent?.includes("Suite :"),
    );
    if (!preview || !bar) return null;
    return preview.getBoundingClientRect().bottom - bar.getBoundingClientRect().top;
  });
  expect(overlap).not.toBeNull();
  expect(overlap as number).toBeLessThanOrEqual(0);
  await page.setViewportSize({ width: 1280, height: 720 });

  // « Enregistrer et continuer » (ADR 0376) : charte, pièce d'identité et fiche faites, le dossier
  // part tout seul à l'équipe, et la suite s'ouvre : la formule, sans attendre la validation.
  await page.getByRole("button", { name: "Enregistrer et continuer" }).click();
  await expect(page).toHaveURL(/\/pro\/onboarding\/formule$/);
  await expect(page.getByText("Étape 4 sur 6 · Formule")).toBeVisible();
  await expect(page.getByText("Les 2 premiers mois, rien n'est prélevé.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Enregistrer ma carte" })).toBeVisible();
  // « Plus tard » ne bloque rien : les trois attestations sont déposées, viennent les paiements.
  await page.getByRole("link", { name: "Plus tard" }).click();
  await expect(page).toHaveURL(/\/pro\/onboarding\/paiements$/);
  await expect(page.getByText("ne touche jamais l'argent de vos chantiers")).toBeVisible();
  // Stripe expliqué (ADR 0384) : l'encart ouvre le mémo des 7 questions.
  await page.getByRole("button", { name: "Comprendre en 1 minute" }).click();
  const memo = page.getByRole("dialog", { name: "Stripe en 1 minute" });
  await expect(memo.getByText("Pourquoi un code par SMS ?")).toBeVisible();
  await memo.getByRole("button", { name: "J'ai compris, je continue" }).click();
  await expect(memo).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Configurer mes paiements avec Stripe" }),
  ).toBeVisible();

  // « Mon inscription » : dossier transmis, sans bouton « Envoyer ».
  await page.getByRole("main").getByRole("link", { name: "Mon inscription" }).click();
  await expect(page).toHaveURL(/\/pro\/onboarding$/);
  await expect(
    page.getByText("Dossier transmis à l'équipe MENAO : la vérification a commencé."),
  ).toBeVisible();
  await expect(page.getByText("4 étapes faites sur 6")).toBeVisible();
  await expect(page.locator('a[aria-current="step"]')).toContainText(
    "Votre formule et votre carte",
  );
  await expect(page.getByRole("button", { name: /Envoyer mon dossier|Renvoyer/ })).toHaveCount(0);
  // Ce qui est facultatif est proposé ouvert, avec les points du Score MENAO (lot 81, ADR 0391).
  const standOut = page.getByRole("region", { name: "Pour vous démarquer" });
  await expect(standOut).toBeVisible();
  await expect(standOut.getByText("Votre Score MENAO")).toBeVisible();
  await expect(
    standOut.getByRole("complementary", { name: "Ce que verront les clients" }),
  ).toBeVisible();
  await expect(standOut.getByRole("heading", { name: "Photos de vos chantiers" })).toBeVisible();
  // Après l'envoi, une attestation se remplace encore (ADR 0376).
  await page.goto("/pro/onboarding/attestations");
  await expect(
    page
      .getByRole("region", { name: "Attestation de vigilance URSSAF ou MSA" })
      .getByLabel("Choisir un fichier"),
  ).toBeAttached();

  // Pendant la vérification : l'espace rempli d'exemples (ADR 0184), en lecture seule.
  await page.goto("/pro/onboarding");
  await page.getByRole("link", { name: "Découvrir mon espace" }).click();
  await expect(page).toHaveURL(/\/pro\/decouvrir\/tableau-de-bord$/);
  await expect(page.getByRole("note", { name: "Données d'exemple" })).toBeVisible();
  await page.goto("/pro/decouvrir/demandes");
  await expect(page.getByText("Exemple", { exact: true })).toHaveCount(2);
  await page.getByRole("link", { name: /Rénovation de salle de bains/ }).click();
  await expect(page.getByRole("heading", { name: "Rénovation de salle de bains" })).toBeVisible();
  await expect(page.getByText("Exemple : les boutons sont désactivés.")).toBeVisible();
  // Boutons inertes (attribut `inert`) : hors de portée du clic comme du clavier.
  const fixAppointment = page.getByRole("button", { name: "Fixer un rendez-vous" });
  await expect(
    page.locator("[inert]").getByRole("button", { name: "Fixer un rendez-vous" }),
  ).toHaveCount(1);
  await fixAppointment.evaluate((button: HTMLElement) => button.focus());
  await expect(fixAppointment).not.toBeFocused();
  await page.goto("/pro/decouvrir/chantiers");
  await page.getByRole("link", { name: /Création d'une salle d'eau/ }).click();
  await expect(page.getByText("Évacuations posées et testées", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "Dossier du chantier" }).click();
  await expect(page.getByText("FAC-EXEMPLE-0001", { exact: false })).toBeVisible();
  // Toutes les rubriques ont leurs exemples.
  for (const [path, text] of [
    ["devis", "Remplacement d'un chauffe-eau"],
    ["messages", "Parfait, merci pour les photos !"],
    ["agenda", "Mes disponibilités"],
    ["factures", "FAC-EXEMPLE-0001"],
    ["depenses", "Carrelage et faïence de la salle d'eau"],
    ["suivi", "Plomberie d'une cuisine"],
    ["bibliotheque", "Pose d'un WC suspendu"],
    ["bibliotheque?vue=fournitures", "Tube cuivre 16 mm"],
    ["paiements", "Mes paiements"],
    ["demandes/appels-offres", "Rénovation de quatre salles de bains"],
    ["secretaire", "Sophie Lambert"],
    ["mon-profil", "Votre entreprise"],
    ["profil", "Ma fiche publique"],
    ["avis", "Claire B."],
    ["grade", "Niv. 2"],
  ] as const) {
    await page.goto(`/pro/decouvrir/${path}`);
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
  }
  await page.goto("/pro/decouvrir/devis");
  await page.getByRole("link", { name: /Remplacement d'un chauffe-eau/ }).click();
  await expect(page.getByText("Chauffe-eau électrique 200 litres").first()).toBeVisible();
  await page.getByRole("link", { name: "Revenir à mon dossier" }).first().click();
  await expect(page).toHaveURL(/\/pro\/onboarding$/);
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
  await page.getByRole("link", { name: /Votre entreprise/ }).click();
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
