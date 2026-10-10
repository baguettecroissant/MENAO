import { expect, test } from "@playwright/test";
import { authLinkFor } from "./mailpit";

// Demande de chantier (F-08, F-11, F-16 à F-18) : sélection de 2 artisans, compte créé au moment
// de la demande (le projet anonyme est conservé), rendez-vous fixé par l'artisan (coordonnées
// échangées), notes privées, brouillon de devis et dictée intelligente (F-19), date du
// rendez-vous et fichier agenda côté particulier.
const UUID = "[0-9a-f-]{36}";

// Micro simulé par Chromium (son de test) pour la dictée du devis.
test.use({
  launchOptions: {
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
  },
  permissions: ["microphone"],
});

test("demande à 2 artisans, compte créé en chemin, rendez-vous fixé par l'artisan", async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(120_000);
  const email = `demande-${Date.now()}@example.test`;

  await page.goto("/recherche");
  await page
    .getByLabel("Décrivez votre projet")
    .fill("Fuite sous l'évier de la cuisine de mon appartement à Nice, à réparer rapidement.");
  await page.getByRole("button", { name: "Trouver mon artisan du BTP idéal" }).click();
  await expect(page).toHaveURL(new RegExp(`/recherche/${UUID}$`), { timeout: 30_000 });
  await page.getByRole("button", { name: "Trouver l'artisan idéal" }).click();
  await expect(page).toHaveURL(new RegExp(`/recherche/${UUID}/artisans$`));

  // Sélection : 1 à 3 artisans.
  const send = page.getByRole("button", { name: /^Envoyer ma demande/ });
  await expect(send).toBeDisabled();
  await page.getByLabel("Sélectionner Noé").check();
  await page.getByLabel("Sélectionner Inès").check();
  await expect(
    page.getByRole("button", { name: "Envoyer ma demande aux 2 artisans" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Envoyer ma demande aux 2 artisans" }).click();

  // Compte au moment de la demande.
  await expect(page).toHaveURL(new RegExp(`/recherche/${UUID}/envoyer\\?`));
  await expect(
    page.getByRole("heading", { name: "Dernière étape avant d'envoyer votre demande" }),
  ).toBeVisible();
  await page.getByLabel("Prénom").fill("Dominique");
  await page.getByLabel("Nom", { exact: true }).fill("Test");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill("mot-de-passe-de-test-e2e");
  await page.getByLabel(/J'accepte les conditions générales/).check();
  await page.getByRole("button", { name: "Créer mon espace et continuer" }).click();
  await expect(
    page.getByText("Nous venons de vous envoyer un e-mail de confirmation"),
  ).toBeVisible();

  // Le lien de confirmation ramène à la demande, projet rattaché au nouveau compte.
  await page.goto(await authLinkFor(request, email));
  await expect(page).toHaveURL(new RegExp(`/recherche/${UUID}/envoyer\\?`));
  await expect(
    page.getByRole("heading", { name: "Envoyez votre demande de chantier à Noé et Inès" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ajouter un message personnalisé" }).click();
  await page.getByLabel("Votre message").fill("Merci de me rappeler au 06 99 99 99 99.");
  await page.getByLabel("Téléphone").fill("06 12 34 56 78");
  await page.getByLabel("Indiquer une plage horaire").check();
  await page.getByLabel("À partir de").fill("09:00");
  await page.getByLabel("Jusqu'à").fill("12:00");
  await page.getByRole("button", { name: "Envoyer ma demande aux 2 artisans" }).click();

  await expect(page).toHaveURL(new RegExp(`/recherche/${UUID}/envoyee$`));
  await expect(
    page.getByRole("heading", { name: "Votre demande est envoyée à Inès et Noé !" }),
  ).toBeVisible();
  await expect(
    page.getByText("Vous avez indiqué être joignable par téléphone entre 09 h 00 et 12 h 00."),
  ).toBeVisible();
  await page.getByRole("link", { name: "Suivre ma demande depuis mon espace" }).click();
  await expect(page).toHaveURL(/\/mon-espace$/);
  await expect(page.getByText(/Réponse attendue sous/)).toHaveCount(2);

  // L'artisan reçoit la demande : coordonnées masquées jusqu'au rendez-vous.
  const pro = await browser.newContext();
  const proPage = await pro.newPage();
  await proPage.goto("/connexion");
  await proPage.getByLabel("Adresse e-mail").fill("plombier-nice@example.test");
  await proPage.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await proPage.getByRole("button", { name: "Me connecter" }).click();
  await expect(proPage).toHaveURL(/\/pro\/tableau-de-bord$/);
  await expect(proPage.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
  await expect(proPage.getByText("Bonjour Noé !")).toBeVisible();
  await proPage.getByRole("link", { name: "Toutes mes demandes" }).click();
  await expect(proPage.getByRole("heading", { name: "Mes demandes" })).toBeVisible();
  await proPage
    .getByRole("link", { name: /Dominique/ })
    .first()
    .click();
  const main = proPage.getByRole("main");
  await expect(main.getByText("Merci de me rappeler au [téléphone].")).toBeVisible();
  await expect(main.getByText("Ses coordonnées et l'adresse exacte s'affichent")).toBeVisible();
  await expect(main.getByText("À contacter de préférence entre 09h00 et 12h00")).toBeVisible();
  expect(await main.innerText()).not.toContain("+33612345678");

  // « Fixer un rendez-vous » (tiroir) : date passée refusée, puis rendez-vous dans 3 jours.
  await proPage.getByRole("button", { name: "Fixer un rendez-vous" }).click();
  const drawer = proPage.getByRole("dialog", { name: "Fixer un rendez-vous avec Dominique" });
  const day = (offset: number) =>
    new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
  await drawer.getByLabel("Date du rendez-vous").fill(day(-2));
  await drawer.getByLabel("Heure d'arrivée estimée").fill("16:30");
  await drawer.getByRole("button", { name: "Envoyer le rendez-vous" }).click();
  await expect(drawer.getByText("Choisissez une date et une heure à venir.")).toBeVisible();
  await drawer.getByLabel("Date du rendez-vous").fill(day(3));
  await drawer.getByRole("button", { name: "Envoyer le rendez-vous" }).click();

  // Vue du rendez-vous (F-18) : coordonnées du client, notes privées.
  await expect(proPage).toHaveURL(new RegExp(`/pro/chantiers/${UUID}$`));
  const rdv = proPage.getByRole("main");
  await expect(rdv.getByRole("heading", { name: "Informations du rendez-vous" })).toBeVisible();
  await expect(rdv.getByText("16h30")).toBeVisible();
  await expect(rdv.getByText("Dominique Test")).toBeVisible();
  await expect(rdv.getByRole("link", { name: "Appeler Dominique" })).toBeVisible();
  await expect(rdv.getByRole("link", { name: email })).toBeVisible();
  await rdv.getByRole("button", { name: "Ajouter des notes" }).click();
  await rdv.getByLabel("Notes privées").fill("Code portail 1234");
  await rdv.getByRole("button", { name: "Enregistrer les notes" }).click();
  await expect(rdv.getByText("Notes enregistrées.")).toBeVisible();
  await expect(rdv.getByText("Code portail 1234")).toBeVisible();

  // Devis (F-19) : une ligne, totaux en direct, enregistrement, brouillon retrouvé.
  await rdv.getByRole("link", { name: "Créer un devis" }).click();
  await expect(proPage).toHaveURL(new RegExp(`/pro/chantiers/${UUID}/devis$`));
  const editor = proPage.getByRole("main");
  await expect(editor.getByRole("status")).toHaveText("Brouillon");
  await editor.getByRole("button", { name: "Ajouter manuellement" }).click();
  await editor.getByLabel("Désignation").fill("Remplacement du siphon");
  await editor.getByLabel("Quantité").fill("2");
  await editor.getByLabel("Prix unitaire HT").fill("35,50");
  await editor.getByRole("button", { name: "10 %" }).click();
  await editor.getByRole("button", { name: "Valider la ligne" }).click();
  await expect(editor.getByRole("status")).toHaveText("Modifications apportées");
  await expect(editor.getByText(/^78,10\s€$/).first()).toBeVisible();
  await editor.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(editor.getByRole("status")).toHaveText("Enregistré et à jour");
  await proPage.reload();
  await expect(editor.getByText("Remplacement du siphon")).toBeVisible();
  await expect(editor.getByRole("status")).toHaveText("Enregistré et à jour");

  // Dictée intelligente : transcription et lignes du faux serveur d'IA, à vérifier puis enregistrées.
  await editor.getByRole("button", { name: "Dictée intelligente" }).click();
  const dictation = proPage.getByRole("dialog", { name: "Dictez votre devis" });
  await dictation.getByRole("button", { name: "Dicter" }).click();
  await expect(dictation.getByText("Enregistrement…")).toBeVisible();
  await proPage.waitForTimeout(1500);
  await dictation.getByRole("button", { name: "Mettre en pause" }).click();
  await expect(dictation.getByLabel("Texte de la dictée")).toHaveValue(
    "Fuite sous l'évier de la cuisine à Nice.",
  );
  await dictation.getByRole("button", { name: "Sauvegarder cet enregistrement" }).click();
  await expect(dictation.getByText("Enregistrement sauvegardé.")).toBeVisible();
  await dictation.getByRole("button", { name: "Générer les lignes" }).click();
  await expect(editor.getByText("2 lignes ajoutées : vérifiez-les.")).toBeVisible();
  await expect(editor.getByText("Siphon PVC 40 mm")).toBeVisible();
  await expect(editor.getByText("À vérifier")).toHaveCount(2);
  // 71,00 € (siphon remplacé) + 12,50 € + recherche de fuite sans prix dicté = 83,50 € HT.
  await expect(editor.getByText(/^91,85\s€$/)).toBeVisible();

  // « Générer le devis » (F-20) : enregistrement, aperçu du brouillon et PDF.
  await editor.getByRole("button", { name: "Générer le devis" }).click();
  await expect(proPage).toHaveURL(new RegExp(`/pro/chantiers/${UUID}/devis/apercu$`));
  const preview = proPage.getByRole("main");
  await expect(preview.getByRole("heading", { name: "Votre devis est prêt !" })).toBeVisible();
  await expect(
    preview.getByText("Vérifiez une dernière fois votre devis avant de l'envoyer à Dominique."),
  ).toBeVisible();
  await expect(preview.getByText("Aperçu : numéro attribué à l'envoi")).toBeVisible();
  await expect(preview.getByText("Siphon PVC 40 mm")).toBeVisible();
  const pdfHref = await preview.getByRole("link", { name: "Voir le PDF" }).getAttribute("href");
  expect(pdfHref).toMatch(new RegExp(`^/devis/${UUID}/pdf$`));
  const pdf = await proPage.request.get(pdfHref ?? "");
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect(pdf.headers()["content-disposition"]).toContain("devis-apercu.pdf");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

  // Le brouillon de devis reste privé à l'artisan ; sans session, redirection vers la connexion.
  expect((await page.request.get(pdfHref ?? "")).status()).toBe(404);
  const anonymous = await request.get(pdfHref ?? "", { maxRedirects: 0 });
  expect(anonymous.status()).toBe(307);
  expect(anonymous.headers().location).toContain("/connexion?next=");

  // Le tableau de bord affiche le rendez-vous à venir.
  const previewUrl = proPage.url();
  await proPage.goto("/pro/tableau-de-bord");
  const upcoming = proPage.getByRole("region", { name: "Prochains rendez-vous" });
  await expect(upcoming.getByText("16h30").first()).toBeVisible();

  // Le particulier voit le rendez-vous, les coordonnées de l'artisan et le fichier agenda.
  await page.reload();
  await expect(page.getByText("Acceptée").first()).toBeVisible();
  await expect(page.getByText(/Rendez-vous le .+ à 16h30/)).toBeVisible();
  await expect(page.getByRole("link", { name: "plombier-nice@example.test" })).toBeVisible();
  const agenda = page.getByRole("link", { name: "Ajouter à mon agenda" });
  const href = await agenda.getAttribute("href");
  expect(href).toMatch(new RegExp(`^/agenda/${UUID}$`));
  const ics = await page.request.get(href ?? "");
  expect(ics.headers()["content-type"]).toContain("text/calendar");
  expect(await ics.text()).toContain("BEGIN:VEVENT");
  expect(await ics.text()).not.toContain("Code portail");

  // « Envoi du devis » (F-21) : échéancier par défaut, dates des travaux, numéro attribué.
  await proPage.goto(previewUrl);
  await proPage.getByRole("link", { name: "Suivant" }).click();
  await expect(proPage).toHaveURL(new RegExp(`/pro/chantiers/${UUID}/devis/envoi$`));
  const sending = proPage.getByRole("main");
  await expect(sending.getByRole("button", { name: "Envoyer le devis" })).toBeDisabled();
  await sending.getByRole("radio", { name: /Mon échéancier par défaut/ }).check();
  await expect(sending.getByText(/30 % à la signature du devis, soit 27,55/)).toBeVisible();
  await sending.getByLabel("Date de début prévisionnelle").fill(day(10));
  await sending.getByLabel("Durée estimée (en jours)").fill("2");
  await sending.getByRole("button", { name: "Envoyer le devis" }).click();
  await expect(proPage).toHaveURL(/\/pro\/devis\?onglet=envoyes/);
  await expect(proPage.getByText("Votre devis a bien été envoyé à Dominique Test.")).toBeVisible();
  await expect(proPage.getByText(/N° DEVIS-\d{4}-0001/)).toBeVisible();

  // Devis reçu (F-21) : contenu figé, PDF numéroté, demande de modification.
  await page.reload();
  await expect(page.getByRole("link", { name: "Ajouter à mon agenda" })).toHaveCount(0);
  await expect(page.getByText(/Devis reçu : 91,85\s€ TTC · À consulter/)).toBeVisible();
  await page.getByRole("link", { name: "Voir le devis" }).click();
  await expect(page).toHaveURL(new RegExp(`/mon-espace/devis/${UUID}$`));
  await expect(page.getByRole("heading", { name: "Devis de Noé Plomberie" })).toBeVisible();
  await expect(page.getByText(/N° DEVIS-\d{4}-0001/)).toBeVisible();
  await expect(page.getByText("Siphon PVC 40 mm")).toBeVisible();
  await expect(page.getByText(/70 % à la réception des travaux, soit 64,30/)).toBeVisible();
  const quotePdf = await page.request.get(
    `${new URL(page.url()).pathname.replace("/mon-espace", "")}/pdf`,
  );
  expect(quotePdf.status()).toBe(200);
  expect(quotePdf.headers()["content-disposition"]).toMatch(/DEVIS-\d{4}-0001\.pdf/);
  await page.getByRole("button", { name: "Demander une modification" }).click();
  const revision = page.getByRole("dialog", { name: "Demander une modification" });
  await revision
    .getByLabel("Modification souhaitée")
    .fill("Pouvez-vous ajouter un robinet d'arrêt ?");
  await revision.getByRole("button", { name: "Envoyer la demande" }).click();
  await expect(page.getByText("Vous avez demandé une modification.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Refuser le devis" })).toHaveCount(0);

  // L'artisan voit la demande et retrouve ses lignes dans une nouvelle version.
  await proPage.goto(previewUrl.replace(/\/devis\/apercu$/, ""));
  const chantier = proPage.getByRole("main");
  await expect(chantier.getByText("Le client demande une modification :")).toBeVisible();
  await expect(chantier.getByText("Pouvez-vous ajouter un robinet d'arrêt ?")).toBeVisible();
  await chantier.getByRole("link", { name: "Modifier le devis" }).click();
  await expect(proPage).toHaveURL(new RegExp(`/pro/chantiers/${UUID}/devis$`));
  await expect(proPage.getByText("Siphon PVC 40 mm")).toBeVisible();
  await pro.close();
});
