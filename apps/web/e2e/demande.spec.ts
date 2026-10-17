import { expect, test } from "./test";
import { capture, files } from "./fixtures";
import { authLinkFor } from "./mailpit";
import { signedStripeEvent } from "./stripe";
import { totp } from "./totp";

// Demande de chantier (F-08, F-11, F-16 à F-18) : sélection de 2 artisans, compte créé au moment
// de la demande (le projet anonyme est conservé), rendez-vous fixé par l'artisan (coordonnées
// échangées), notes privées, brouillon de devis et dictée intelligente (F-19), date du
// rendez-vous et fichier agenda côté particulier.
const UUID = "[0-9a-f-]{36}";
// Stripe est remplacé par stripe-mock en CI ; le webhook Connect est simulé et signé ici.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const CONNECT_SECRET = process.env.STRIPE_CONNECT_WEBHOOK_SECRET ?? "whsec_menao_connect_ci";
// Clé serveur de l'instance Supabase locale de la CI : simule la tâche planifiée du démarrage.
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

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
  test.setTimeout(240_000);
  const email = `demande-${Date.now()}@example.test`;

  await page.goto("/recherche");
  await page
    .getByLabel("Décrivez votre projet")
    .fill("Fuite sous l'évier de la cuisine de mon appartement à Nice, à réparer rapidement.");
  await page.getByRole("button", { name: "Trouver mon artisan du BTP idéal" }).click();
  await expect(page).toHaveURL(new RegExp(`/recherche/${UUID}$`), { timeout: 30_000 });
  await page.getByRole("button", { name: "Trouver l'artisan idéal" }).click();
  await expect(page).toHaveURL(new RegExp(`/recherche/${UUID}/artisans$`));
  // Badge « Assuré et vérifié » (ADR 0119) : documents du jeu de démonstration validés.
  await expect(page.getByText("Assuré et vérifié").first()).toBeVisible();

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
  // Texte exact : les créneaux libres proposés (« Lun. 12 oct. à 16h30 ») contiennent aussi l'heure.
  await expect(rdv.getByText("16h30", { exact: true })).toBeVisible();
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
  await expect(dictation.getByText("Enregistrement sauvegardé.", { exact: true })).toBeVisible();
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

  // Le tableau de bord affiche la visite à venir (agenda « À venir »).
  const previewUrl = proPage.url();
  await proPage.goto("/pro/tableau-de-bord");
  const upcoming = proPage.getByRole("region", { name: "À venir" });
  await expect(upcoming.getByText("Visite", { exact: true }).first()).toBeVisible();
  await expect(upcoming.getByText("16h30").first()).toBeVisible();

  // Le particulier voit son chantier (rendez-vous, agenda) et les coordonnées de l'artisan.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Mes chantiers" })).toBeVisible();
  await expect(page.getByText("Acceptée").first()).toBeVisible();
  await expect(page.getByText(/Rendez-vous le .+ à 16h30/)).toBeVisible();
  await expect(page.getByRole("link", { name: "plombier-nice@example.test" })).toBeVisible();
  await page.getByRole("button", { name: "Ajouter à mon agenda" }).click();
  const calendar = page.getByRole("dialog", { name: "Ajouter à mon agenda" });
  await expect(calendar.getByRole("link", { name: /Ajouter à Google Agenda/ })).toHaveAttribute(
    "href",
    /^https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE/,
  );
  await expect(calendar.getByRole("link", { name: /Ajouter à Outlook/ })).toHaveAttribute(
    "href",
    /^https:\/\/outlook\.live\.com\/calendar\//,
  );
  const agenda = calendar.getByRole("link", { name: "Ajouter à Calendrier" });
  const href = await agenda.getAttribute("href");
  expect(href).toMatch(new RegExp(`^/agenda/${UUID}$`));
  const ics = await page.request.get(href ?? "");
  expect(ics.headers()["content-type"]).toContain("text/calendar");
  expect(await ics.text()).toContain("BEGIN:VEVENT");
  expect(await ics.text()).not.toContain("Code portail");
  await calendar.getByRole("button", { name: "Fermer" }).click();

  // Logo de l'entreprise (ADR 0038) : déposé avant l'envoi, il figure sur le devis envoyé.
  await proPage.goto("/pro/onboarding/entreprise");
  const logo = proPage.getByRole("region", { name: "Logo sur vos documents (facultatif)" });
  await logo.getByLabel("Fichier du logo").setInputFiles(files.logo);
  await logo.getByRole("button", { name: "Envoyer mon logo" }).click();
  await expect(logo.getByRole("img", { name: "Votre logo actuel" })).toBeVisible();

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
  await expect(page.getByRole("button", { name: "Ajouter à mon agenda" })).toHaveCount(0);
  await expect(page.getByText("1 devis à signer")).toBeVisible();
  await expect(page.getByText("Votre devis est prêt")).toBeVisible();
  await page.getByRole("link", { name: "Voir et signer le devis" }).click();
  await expect(page).toHaveURL(new RegExp(`/mon-espace/devis/${UUID}$`));
  await expect(page.getByRole("heading", { name: "Devis de Noé Plomberie" })).toBeVisible();
  await expect(page.getByText(/N° DEVIS-\d{4}-0001/)).toBeVisible();
  await expect(page.getByText("Siphon PVC 40 mm")).toBeVisible();
  await expect(page.getByText(/70 % à la réception des travaux, soit 64,30/)).toBeVisible();
  await expect(page.getByRole("img", { name: /^Logo de / })).toBeVisible();
  const quotePdf = await page.request.get(
    `${new URL(page.url()).pathname.replace("/mon-espace", "")}/pdf`,
  );
  expect(quotePdf.status()).toBe(200);
  expect(quotePdf.headers()["content-disposition"]).toMatch(/DEVIS-\d{4}-0001\.pdf/);
  // Logo intégré au PDF conservé (image en tête du devis).
  expect((await quotePdf.body()).includes("/Subtype /Image")).toBe(true);
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

  // L'artisan envoie la nouvelle version : numéro d'origine suivi de l'indice.
  await proPage.getByRole("button", { name: "Générer le devis" }).click();
  await expect(proPage).toHaveURL(new RegExp(`/pro/chantiers/${UUID}/devis/apercu$`));
  await proPage.getByRole("link", { name: "Suivant" }).click();
  const sendingV2 = proPage.getByRole("main");
  await sendingV2.getByRole("radio", { name: /Mon échéancier par défaut/ }).check();
  await sendingV2.getByLabel("Date de début prévisionnelle").fill(day(12));
  await sendingV2.getByLabel("Durée estimée (en jours)").fill("2");
  await sendingV2.getByRole("button", { name: "Envoyer le devis" }).click();
  await expect(proPage.getByText(/N° DEVIS-\d{4}-0001-v2/)).toBeVisible();

  // Signature du devis (F-13) : cases à cocher, prestataire (faux DocuSeal), webhook, devis signé.
  await page.goto("/mon-espace");
  await page.getByRole("link", { name: "Voir et signer le devis" }).click();
  await expect(page.getByText(/N° DEVIS-\d{4}-0001-v2/)).toBeVisible();
  await page.getByRole("link", { name: "Signer le devis" }).click();
  await expect(page).toHaveURL(new RegExp(`/mon-espace/devis/${UUID}/signature$`));
  await page.getByRole("button", { name: "Signer le devis" }).click();
  await expect(page.getByText("Cochez cette case pour signer le devis.").first()).toBeVisible();
  for (const label of [
    /J'ai lu et j'accepte le devis/,
    /conditions d'utilisation de DocuSeal/,
    /conditions générales d'utilisation et la politique/,
    /J'accepte l'échéancier : acompte de 27,55/,
  ]) {
    await page.getByLabel(label).check();
  }
  await page.getByRole("button", { name: "Signer le devis" }).click();
  await expect(page).toHaveURL(/localhost:54397\/s\/signature-\d+$/);
  await page.getByRole("button", { name: "Signer le document" }).click();
  await expect(page).toHaveURL(new RegExp(`/mon-espace/devis/${UUID}\\?signature=terminee$`));
  await expect(page.getByText(/Vous avez signé ce devis le/)).toBeVisible();
  const signedPdf = await page.request.get(
    `${new URL(page.url()).pathname.replace("/mon-espace", "")}/pdf`,
  );
  expect(signedPdf.status()).toBe(200);
  expect(signedPdf.headers()["content-disposition"]).toMatch(/DEVIS-\d{4}-0001-v2-signe\.pdf/);

  // L'artisan voit le devis signé sur la fiche du chantier.
  const chantierUrl = previewUrl.replace(/\/devis\/apercu$/, "");
  await proPage.goto(chantierUrl);
  await expect(proPage.getByText(/Le client a signé le devis le/)).toBeVisible();
  await expect(
    proPage.getByText("En attente du paiement de l'acompte par le client."),
  ).toBeVisible();

  // Paiement de l'acompte (F-31) : Stripe Checkout sur le compte de l'artisan (simulé), puis
  // webhook Connect signé ; aucune commission MENAO.
  const quoteUrl = page.url().split("?")[0] ?? "";
  const quoteId = quoteUrl.split("/").pop() ?? "";
  await page.goto(quoteUrl);
  await page.getByRole("link", { name: /Payer l'acompte \(27,55\s€\)/ }).click();
  await expect(page).toHaveURL(new RegExp(`/mon-espace/devis/${UUID}/acompte$`));
  await expect(page.getByText("Bénéficiaire : PLOMBERIE NICE EXEMPLE")).toBeVisible();
  await page.route("https://checkout.stripe.com/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<h1>Stripe Checkout (simulé)</h1>" }),
  );
  await page.getByRole("button", { name: /Payer 27,55/ }).click();
  await expect(page).toHaveURL(/^https:\/\/checkout\.stripe\.com\//);
  const now = Math.floor(Date.now() / 1000);
  const paid = signedStripeEvent(
    {
      id: `evt_acompte_${now}`,
      object: "event",
      type: "checkout.session.completed",
      account: "acct_seed_nice",
      api_version: "2026-09-30.endive",
      created: now,
      livemode: false,
      data: {
        object: {
          id: `cs_e2e_${now}`,
          object: "checkout.session",
          mode: "payment",
          payment_status: "paid",
          amount_total: 2755,
          currency: "eur",
          payment_intent: `pi_e2e_${now}`,
          metadata: { menao_quote_id: quoteId, menao_kind: "acompte" },
        },
      },
    },
    CONNECT_SECRET,
  );
  const delivered = await request.post(`${SUPABASE_URL}/functions/v1/stripe-webhook`, {
    data: paid.payload,
    headers: { "Stripe-Signature": paid.header, "Content-Type": "application/json" },
  });
  expect(delivered.status()).toBe(200);
  await page.goto(quoteUrl);
  await expect(page.getByText(/Acompte de 27,55\s€ payé le/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Payer l'acompte/ })).toHaveCount(0);
  // Côté artisan, la fiche devient la vue du chantier : acompte reçu, échéancier du dossier.
  await proPage.goto(`${chantierUrl}?onglet=dossier`);
  await expect(proPage.getByText("Acompte reçu")).toBeVisible();
  await expect(
    proPage.getByRole("region", { name: "Échéancier de paiement" }).getByText(/27,55\s€/),
  ).toBeVisible();

  // Facture d'acompte (F-35) : émise à l'encaissement au nom de l'artisan, numéro FAC-AAAA-0001.
  const invoiceLink = page.getByRole("link", { name: /Facture d'acompte FAC-\d{4}-0001 \(PDF\)/ });
  const invoiceHref = (await invoiceLink.getAttribute("href")) ?? "";
  expect(invoiceHref).toMatch(new RegExp(`^/factures/${UUID}/pdf$`));
  const invoicePdf = await page.request.get(invoiceHref);
  expect(invoicePdf.status()).toBe(200);
  expect(invoicePdf.headers()["content-disposition"]).toMatch(/FAC-\d{4}-0001\.pdf/);
  expect((await invoicePdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
  await proPage.goto("/pro/factures");
  await expect(proPage.getByRole("link", { name: /Voir la facture FAC-\d{4}-0001/ })).toBeVisible();
  const csv = await (await proPage.request.get("/pro/factures/export")).text();
  expect(csv).toContain('"Acompte"');
  expect(csv).toContain('"Dominique Test"');
  // 27,55 € TTC à 10 % : 25,05 € HT et 2,50 € de TVA.
  expect(csv).toContain('"25,05";"2,50";"27,55"');

  // Suivi du chantier (F-22, maquettes « Vue d'un chantier ») : après l'acompte, l'artisan
  // confirme la date de démarrage (date du devis proposée) ; le journal s'ouvre au début des
  // travaux.
  const chantierId = chantierUrl.split("/").pop() ?? "";
  await proPage.goto(chantierUrl);
  await expect(proPage.getByText("Date de démarrage à confirmer")).toBeVisible();
  await expect(proPage.getByText("Acompte reçu")).toBeVisible();
  const lockedJournal = proPage.getByRole("region", { name: "Suivi du chantier" });
  await expect(
    lockedJournal.getByText(
      "Vous pourrez ajouter des photos et des messages sur ce chantier une fois celui-ci en cours.",
    ),
  ).toBeVisible();
  await expect(lockedJournal.getByRole("button", { name: "Ajouter un message" })).toBeDisabled();
  await capture(proPage, "artisan-date-a-confirmer");
  await expect(proPage.getByLabel("Date de démarrage")).toHaveValue(day(12));
  await proPage.getByLabel("Heure de démarrage").fill("08:30");
  await proPage.getByRole("button", { name: "Confirmer la date de démarrage" }).click();
  await expect(proPage.getByText("Date de démarrage des travaux confirmée")).toBeVisible();
  await expect(
    proPage.getByText(
      /Vous avez confirmé le début des travaux le .+ à 08h30\. Une notification a bien été envoyée à Dominique\./,
    ),
  ).toBeVisible();
  await expect(proPage.getByText(/^Démarrage prévu le \d{2}\/\d{2}\/\d{4}$/)).toBeVisible();
  await capture(proPage, "artisan-date-confirmee");

  // « Mes chantiers » (F-12) : démarrage prévu, prochaine intervention.
  await page.goto("/mon-espace");
  await expect(page.getByText(/^Démarrage prévu le \d{2}\/\d{2}\/\d{4}$/)).toBeVisible();
  await expect(page.getByText(/Démarrage le .+ à 08h30/)).toBeVisible();
  await capture(page, "client-mes-chantiers");

  // Demande restée sans réponse (F-11) : le client l'annule, avec un motif ; Inès est prévenue.
  await page.getByRole("button", { name: "Annuler ma demande à Inès" }).click();
  const cancelRequest = page.getByRole("dialog", { name: "Annuler votre demande ?" });
  await cancelRequest.getByRole("button", { name: "Annuler ma demande" }).click();
  await expect(cancelRequest.getByText("Choisissez le motif de votre annulation.")).toBeVisible();
  await cancelRequest.getByLabel("J'ai choisi un autre artisan").check();
  await cancelRequest.getByLabel(/Un mot pour l'artisan/).fill("Noé intervient déjà chez moi.");
  await cancelRequest.getByRole("button", { name: "Annuler ma demande" }).click();
  await expect(page.getByText("Vous avez annulé cette demande.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Annuler ma demande à Inès" })).toHaveCount(0);

  // Date de début atteinte : la tâche planifiée est simulée (même transition que app.start_due_chantiers).
  expect(SERVICE_KEY).not.toBe("");
  const started = await request.post(`${SUPABASE_URL}/rest/v1/rpc/transition_chantier`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    data: { p_chantier_id: chantierId, p_event: "demarrage" },
  });
  expect(started.ok()).toBe(true);

  // Journal : message et photo, puis fin des travaux.
  await proPage.goto(chantierUrl);
  await expect(proPage.getByText("Chantier en cours")).toBeVisible();
  const journal = proPage.getByRole("region", { name: "Suivi du chantier" });
  await expect(
    journal.getByText(
      "Ajoutez des photos et des messages pour que Dominique puisse suivre son chantier.",
    ),
  ).toBeVisible();
  await journal.getByRole("button", { name: "Ajouter un message" }).click();
  await journal.getByLabel("Message pour votre client").fill("Matériel commandé, livraison lundi.");
  await journal.getByRole("button", { name: "Publier le message" }).click();
  await expect(journal.getByText("Message publié.")).toBeVisible();
  await expect(journal.getByText("Matériel commandé, livraison lundi.")).toBeVisible();
  await journal.getByLabel("Ajouter une photo").setInputFiles(files.png);
  await expect(journal.getByText("Photo ajoutée au suivi du chantier.")).toBeVisible();
  await expect(journal.getByRole("img", { name: "Photo du chantier 1 sur 1" })).toBeVisible();
  await capture(proPage, "artisan-chantier-en-cours");
  await proPage.getByRole("button", { name: "Déclarer le chantier terminé" }).click();
  const finish = proPage.getByRole("dialog", { name: "Ce chantier est-il terminé ?" });
  await expect(finish.getByText(/Dominique recevra une notification/)).toBeVisible();
  await proPage.screenshot({
    path: test.info().outputPath("captures/artisan-fin-de-chantier.png"),
  });
  await finish.getByRole("button", { name: "Déclarer le chantier terminé" }).click();
  await expect(proPage.getByText(/^Travaux terminés le \d{2}\/\d{2}\/\d{4}$/)).toBeVisible();
  await expect(proPage.getByRole("button", { name: "Déclarer le chantier terminé" })).toHaveCount(
    0,
  );

  // Vue du chantier côté client (F-12) : suivi (journal), puis dossier (documents, échéancier).
  await page.goto(`/mon-espace/chantiers/${chantierId}`);
  await expect(page.getByText(/^Travaux terminés le \d{2}\/\d{2}\/\d{4}$/)).toBeVisible();
  const clientJournal = page.getByRole("region", { name: "Suivi du chantier" });
  await expect(clientJournal.getByText("Matériel commandé, livraison lundi.")).toBeVisible();
  await expect(clientJournal.getByRole("img", { name: "Photo du chantier 1 sur 1" })).toBeVisible();
  await capture(page, "client-chantier-suivi");
  await page.getByRole("link", { name: "Dossier du chantier" }).click();
  await expect(page).toHaveURL(new RegExp(`/mon-espace/chantiers/${UUID}\\?onglet=dossier$`));
  await expect(page.getByRole("link", { name: /Devis signé/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Facture d'acompte/ })).toBeVisible();
  // 91,85 € TTC dont 27,55 € d'acompte payé : 64,30 € restant (toujours calculé).
  const schedule = page.getByRole("region", { name: "Échéancier de paiement" });
  await expect(schedule.getByText(/27,55\s€/)).toBeVisible();
  await expect(schedule.getByText(/64,30\s€/)).toBeVisible();
  await capture(page, "client-chantier-dossier");

  // Réception avec réserves (F-25, F-26) : « Tout est conforme ? » (solde), puis réserves saisies,
  // aperçu du PV « avec réserves », signature chez le prestataire (faux DocuSeal). Le PV sans
  // réserves est couvert par pgTAP.
  await page.goto(`/mon-espace/chantiers/${chantierId}`);
  await page.getByRole("button", { name: "Valider la réception du chantier" }).click();
  const conform = page.getByRole("dialog", { name: "Tout est conforme ?" });
  await expect(conform.getByText(/Le solde de 64,30\s€ vous sera demandé ensuite/)).toBeVisible();
  await conform.getByRole("button", { name: "Fermer" }).click();
  await page.getByRole("button", { name: "Ajouter des réserves sur ce chantier" }).click();
  const reservesDrawer = page.getByRole("dialog", { name: "Ajouter des réserves sur ce chantier" });
  await reservesDrawer.getByRole("link", { name: "Ajouter des réserves" }).click();
  await expect(page).toHaveURL(new RegExp(`/mon-espace/chantiers/${UUID}/reception\\?reserves=1$`));
  await page.getByLabel("Vos réserves").fill("Court");
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByText("Décrivez vos réserves en 10 caractères au moins.")).toBeVisible();
  await page.getByLabel("Vos réserves").fill("Joint du siphon à reprendre.");
  await page.getByRole("button", { name: "Continuer" }).click();
  const pv = page.getByRole("figure", { name: "Aperçu du procès-verbal de réception" });
  await expect(pv.getByText("Réception des travaux AVEC RÉSERVES")).toBeVisible();
  await expect(pv.getByText("Joint du siphon à reprendre.")).toBeVisible();
  await expect(pv.getByText(/64,30\s€/)).toBeVisible();
  await capture(page, "client-signature-pv");
  await page.getByRole("button", { name: "Signer le PV de réception" }).click();
  await expect(
    page.getByText("Cochez cette case pour signer le PV de réception.").first(),
  ).toBeVisible();
  for (const label of [
    /J'ai lu et j'accepte le procès-verbal de réception/,
    /conditions d'utilisation de DocuSeal/,
    /conditions générales d'utilisation et la politique/,
    /le solde restant à payer s'élève à 64,30/,
  ]) {
    await page.getByLabel(label).check();
  }
  await page.getByRole("button", { name: "Signer le PV de réception" }).click();
  await expect(page).toHaveURL(/localhost:54397\/s\/signature-\d+$/);
  await page.getByRole("button", { name: "Signer le document" }).click();
  await expect(page).toHaveURL(new RegExp(`/mon-espace/chantiers/${UUID}\\?reception=signee$`));
  await expect(page.getByText("Réserves à lever", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Vos réserves" }).getByText("Joint du siphon à reprendre."),
  ).toBeVisible();

  // Levée des réserves (F-26) : signalée par l'artisan, confirmée par le client (« Le chantier
  // est-il parfait ? ») ; le chantier est réceptionné.
  await proPage.goto(chantierUrl);
  await expect(
    proPage.getByRole("region", { name: "Réserves émises par Dominique" }),
  ).toBeVisible();
  await proPage.getByRole("button", { name: "Signaler la levée des réserves" }).click();
  const lift = proPage.getByRole("dialog", { name: "Les réserves sont-elles levées ?" });
  await lift.getByLabel(/Message pour votre client/).fill("Joint du siphon refait ce matin.");
  await lift.getByRole("button", { name: "Signaler la levée" }).click();
  await expect(
    proPage.getByText(/Levée signalée le .+ : en attente de la confirmation de Dominique\./),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Noé a signalé la levée des réserves le/)).toBeVisible();
  await expect(page.getByText("« Joint du siphon refait ce matin. »")).toBeVisible();
  await page.getByRole("button", { name: "Confirmer la levée des réserves" }).click();
  const perfect = page.getByRole("dialog", { name: "Le chantier est-il parfait ?" });
  await expect(perfect.getByText(/Le solde de 64,30\s€ vous sera ensuite demandé/)).toBeVisible();
  await perfect.getByRole("button", { name: "Confirmer la levée des réserves" }).click();
  await expect(page.getByText(/^Réceptionné le \d{2}\/\d{2}\/\d{4}$/)).toBeVisible();
  await expect(
    page.getByText(/Réception validée le .+ Prochaine étape : le paiement du solde\./),
  ).toBeVisible();
  await page.getByRole("link", { name: "Dossier du chantier" }).click();
  const pvLink = page.getByRole("link", { name: /PV de réception PV-\d{4}-R01/ });
  const pvHref = (await pvLink.getAttribute("href")) ?? "";
  expect(pvHref).toMatch(new RegExp(`^/receptions/${UUID}/pdf$`));
  const pvPdf = await page.request.get(pvHref);
  expect(pvPdf.status()).toBe(200);
  expect(pvPdf.headers()["content-disposition"]).toMatch(/PV-\d{4}-R01-signe\.pdf/);
  await proPage.goto(chantierUrl);
  await expect(proPage.getByText(/Réception validée par Dominique le /)).toBeVisible();

  // Paiement du solde (F-32) : Checkout sur le compte de l'artisan (simulé), webhook Connect
  // signé ; facture de solde (lignes du devis, acompte déduit) et clôture du chantier.
  await page.goto(`/mon-espace/chantiers/${chantierId}`);
  const pay = page.getByRole("region", { name: "Vous avez un paiement à effectuer" });
  await expect(pay.getByText(/64,30\s€/)).toBeVisible();
  await pay.getByRole("link", { name: "Payer maintenant" }).click();
  await expect(page).toHaveURL(new RegExp(`/mon-espace/chantiers/${UUID}/solde$`));
  await expect(page.getByText("Bénéficiaire : PLOMBERIE NICE EXEMPLE")).toBeVisible();
  await capture(page, "client-paiement-solde");
  await page.getByRole("button", { name: /Payer 64,30/ }).click();
  await expect(page).toHaveURL(/^https:\/\/checkout\.stripe\.com\//);
  const balanceAt = Math.floor(Date.now() / 1000);
  const balancePaid = signedStripeEvent(
    {
      id: `evt_solde_${balanceAt}`,
      object: "event",
      type: "checkout.session.completed",
      account: "acct_seed_nice",
      api_version: "2026-09-30.endive",
      created: balanceAt,
      livemode: false,
      data: {
        object: {
          id: `cs_e2e_solde_${balanceAt}`,
          object: "checkout.session",
          mode: "payment",
          payment_status: "paid",
          amount_total: 6430,
          currency: "eur",
          payment_intent: `pi_e2e_solde_${balanceAt}`,
          metadata: { menao_quote_id: quoteId, menao_kind: "solde" },
        },
      },
    },
    CONNECT_SECRET,
  );
  const balanceDelivered = await request.post(`${SUPABASE_URL}/functions/v1/stripe-webhook`, {
    data: balancePaid.payload,
    headers: { "Stripe-Signature": balancePaid.header, "Content-Type": "application/json" },
  });
  expect(balanceDelivered.status()).toBe(200);
  await page.goto(`/mon-espace/chantiers/${chantierId}?paiement=termine`);
  await expect(page.getByText(/^Terminé le \d{2}\/\d{2}\/\d{4}$/)).toBeVisible();
  await expect(
    page.getByText(/^Vous avez finalisé le paiement de ce chantier le \d{2}\/\d{2}\/\d{4}$/),
  ).toBeVisible();
  await capture(page, "client-chantier-cloture");
  await page.getByRole("link", { name: "Dossier du chantier" }).click();
  const balanceInvoice = page.getByRole("link", { name: /Facture de solde FAC-\d{4}-0002/ });
  const balanceHref = (await balanceInvoice.getAttribute("href")) ?? "";
  const balancePdf = await page.request.get(balanceHref);
  expect(balancePdf.status()).toBe(200);
  expect(balancePdf.headers()["content-disposition"]).toMatch(/FAC-\d{4}-0002\.pdf/);
  const paidSchedule = page.getByRole("region", { name: "Échéancier de paiement" });
  await expect(paidSchedule.getByText(/91,85\s€/)).toBeVisible();
  await expect(paidSchedule.getByText(/0,00\s€/)).toBeVisible();
  // Garanties après la réception (ADR 0041) : échéances calculées, assureur décennal du devis.
  const guarantees = page.getByRole("region", { name: "Vos garanties après la réception" });
  const nextYear = new Date().getFullYear() + 1;
  await expect(
    guarantees.getByText(
      new RegExp(`^Garantie de parfait achèvement : jusqu'au \\d{1,2} \\S+ ${nextYear}$`),
    ),
  ).toBeVisible();
  await expect(
    guarantees.getByText(/^Assurance décennale de l'artisan : Assurances Exemple/),
  ).toBeVisible();
  await capture(page, "client-chantier-garanties");
  const allInvoices = await (await proPage.request.get("/pro/factures/export")).text();
  expect(allInvoices).toContain('"Solde";"Dominique Test"');
  // Solde 64,30 € : 83,50 € HT et 8,35 € de TVA du devis, moins ceux de l'acompte (25,05 € et 2,50 €).
  expect(allInvoices).toContain('"58,45";"5,85";"64,30"');
  await proPage.goto(chantierUrl);
  await expect(proPage.getByText(/Chantier clôturé le .+ : solde de 64,30\s€ reçu/)).toBeVisible();
  // Notation du client par l'artisan (F-23) : trois curseurs et un commentaire, jamais montrés au
  // client ; une seule note par chantier.
  const clientRating = proPage.getByRole("form", { name: /Comment s'est passé ce chantier avec/ });
  await clientRating.getByRole("button", { name: "Enregistrer ma note" }).click();
  await expect(
    clientRating.getByText("Notez ce critère en faisant glisser le curseur.").first(),
  ).toBeVisible();
  await clientRating.getByLabel("Accueil et accès au chantier").fill("90");
  await clientRating.getByLabel("Clarté du besoin").fill("80");
  await clientRating.getByLabel("Délai des paiements").fill("100");
  await clientRating
    .getByLabel("Votre commentaire")
    .fill("Client accueillant, accès facile au chantier, besoin clair et solde réglé rapidement.");
  await clientRating.getByRole("button", { name: "Enregistrer ma note" }).click();
  // La page se met à jour : le résumé de la note remplace le formulaire, et reste au rechargement.
  const ratingSummary = proPage.getByText(
    /Vous avez noté ce client le .+ : accueil 90\s%, clarté 80\s%, paiements 100\s%\./,
  );
  await expect(ratingSummary).toBeVisible();
  await expect(clientRating).toHaveCount(0);
  await proPage.reload();
  await expect(ratingSummary).toBeVisible();
  await page.goto("/mon-espace");
  await expect(
    page.getByRole("region", { name: "Mes chantiers terminés" }).getByText(/^Terminé le /),
  ).toBeVisible();

  // « Démarrer un chantier » (ADR 0042) : la saisie s'ouvre dans l'espace client.
  await page.getByRole("link", { name: "Démarrer un chantier", exact: true }).click();
  await expect(page).toHaveURL(/\/mon-espace\/nouvelle-demande$/);
  await expect(page.getByRole("heading", { level: 1, name: "Démarrer un chantier" })).toBeVisible();
  const clientNav = page.getByRole("navigation", { name: "Navigation de mon espace" });
  await expect(clientNav).toBeVisible();
  await capture(page, "client-nouvelle-demande");
  await page.goto("/mon-espace");

  // « Redemander un devis » (F-12) : nouvelle recherche pour Noé, présenté en premier et
  // présélectionné ; la recherche non envoyée reste dans l'espace, puis est supprimée.
  await page
    .getByRole("region", { name: "Mes chantiers terminés" })
    .getByRole("link", { name: "Redemander un devis à Noé" })
    .click();
  await expect(page).toHaveURL(/\/mon-espace\/nouvelle-demande\?artisan=/);
  await expect(clientNav).toBeVisible();
  await expect(page.getByText(/^Nouvelle demande pour Noé/)).toBeVisible();
  await page
    .getByLabel("Décrivez votre projet")
    .fill("Nouvelle fuite sous le lavabo de la salle de bain, à réparer.");
  await page.getByRole("button", { name: "Trouver mon artisan du BTP idéal" }).click();
  await expect(page).toHaveURL(new RegExp(`/recherche/${UUID}$`), { timeout: 30_000 });
  const rehireProjectId = new URL(page.url()).pathname.split("/").pop() ?? "";
  // Critères et artisans gardent le menu latéral : le client reste dans son espace, retour compris.
  await expect(clientNav).toBeVisible();
  await expect(page.getByRole("link", { name: "Retour", exact: true })).toHaveAttribute(
    "href",
    "/mon-espace/nouvelle-demande",
  );
  await page.getByRole("button", { name: "Trouver l'artisan idéal" }).click();
  await expect(page).toHaveURL(new RegExp(`/recherche/${UUID}/artisans$`));
  await expect(clientNav).toBeVisible();
  const known = page.getByRole("listitem").filter({ hasText: "Déjà venu chez vous" });
  await expect(known.getByRole("heading", { name: "Noé" })).toBeVisible();
  await expect(known.getByRole("checkbox")).toBeChecked();
  await capture(page, "client-recherche-artisans");
  await expect(page.getByRole("button", { name: /^Envoyer ma demande/ })).toBeEnabled();
  await page.goto("/mon-espace");
  const drafts = page.getByRole("region", { name: "Recherches non envoyées" });
  await expect(drafts.getByRole("link", { name: "Reprendre" })).toHaveAttribute(
    "href",
    `/recherche/${rehireProjectId}/artisans`,
  );
  await drafts.getByRole("button", { name: /^Supprimer la recherche/ }).click();
  await expect(page.getByRole("region", { name: "Recherches non envoyées" })).toHaveCount(0);

  // Avis du client (F-28) : invitation au chantier clôturé, curseurs, rapport qualité/prix et
  // commentaire ; avis publié sur la fiche (« Avis vérifié »), score MENAO, réponse de l'artisan.
  await page.goto(`/mon-espace/chantiers/${chantierId}`);
  await page
    .getByRole("region", { name: "Noter Noé pour son chantier" })
    .getByRole("link", { name: "Noter Noé" })
    .click();
  await expect(page).toHaveURL(new RegExp(`/mon-espace/chantiers/${UUID}/avis$`));
  await expect(
    page.getByRole("heading", { name: "Comment s'est passée votre expérience avec Noé ?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Publier mon avis" }).click();
  await expect(page.getByText("Notez ce critère en faisant glisser le curseur.")).toHaveCount(4);
  await expect(page.getByText("Choisissez le rapport qualité/prix.")).toBeVisible();
  await page.getByRole("slider", { name: "Qualité des prestations" }).focus();
  await page.keyboard.press("End");
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowLeft");
  await expect(page.getByText("Très soigné")).toBeVisible();
  // L'erreur d'un critère disparaît dès qu'il est noté.
  await expect(page.getByText("Notez ce critère en faisant glisser le curseur.")).toHaveCount(3);
  // Propreté du chantier (ADR 0091) : sert aux badges de l'artisan.
  for (const name of ["Respect des délais", "Communication", "Propreté du chantier"]) {
    await page.getByRole("slider", { name }).focus();
    await page.keyboard.press("End");
  }
  await expect(page.getByText("À l'heure")).toBeVisible();
  await expect(page.getByText("Impeccable")).toBeVisible();
  await page.getByText("Excellent rapport qualité/prix").click();
  await page
    .getByLabel("Votre commentaire")
    .fill(
      "Intervention rapide et soignée : siphon remplacé, joint refait, cuisine laissée propre.",
    );
  await expect(page.getByText("87/50 caractères minimum")).toBeVisible();
  await capture(page, "client-avis");
  await page.getByRole("button", { name: "Publier mon avis" }).click();
  await expect(
    page.getByRole("heading", { name: "Merci d'avoir fait confiance à MENAO" }),
  ).toBeVisible();
  await capture(page, "client-avis-merci");
  await page.getByRole("link", { name: "Voir la fiche de Noé" }).click();
  // (80 + 100 + 100 + 100) / 4 = 95 %.
  const menaoScore = page.getByRole("region", { name: "Score Menao" });
  await expect(menaoScore.getByText(/^95\s%$/)).toBeVisible();
  await expect(menaoScore.getByText("Calculé sur 1 avis vérifié")).toBeVisible();
  const latestReviews = page.getByRole("region", { name: "Derniers avis clients" });
  await expect(latestReviews.getByText("Dominique T.")).toBeVisible();
  await expect(latestReviews.getByText("Avis vérifié")).toBeVisible();
  await expect(latestReviews.getByText(/siphon remplacé, joint refait/)).toBeVisible();
  await capture(page, "fiche-artisan-avis");
  await proPage.goto(chantierUrl);
  const clientReview = proPage.getByRole("region", { name: "Avis de Dominique" });
  await expect(clientReview.getByText(/siphon remplacé, joint refait/)).toBeVisible();
  await clientReview
    .getByLabel("Votre réponse publique")
    .fill("Merci Dominique, ravi que tout soit en ordre !");
  await clientReview.getByRole("button", { name: "Publier ma réponse" }).click();
  await expect(
    clientReview.getByText("Merci Dominique, ravi que tout soit en ordre !"),
  ).toBeVisible();
  await page.reload();
  await expect(latestReviews.getByText("Réponse de Noé")).toBeVisible();
  await expect(
    latestReviews.getByText("Merci Dominique, ravi que tout soit en ordre !"),
  ).toBeVisible();

  // Messagerie (F-40) : le client écrit depuis la vue du chantier (« Message »), l'artisan voit le
  // message non lu dans « Messages », le lit et répond ; le client voit la réponse et « Lu ».
  await page.goto(`/mon-espace/chantiers/${chantierId}`);
  await page.getByRole("link", { name: "Message", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/mon-espace/messages/${UUID}$`));
  await expect(page.getByRole("heading", { name: "Noé" })).toBeVisible();
  await page
    .getByLabel("Votre message")
    .fill("Bonjour Noé, pouvez-vous m'envoyer la notice du siphon ?");
  await page.getByRole("button", { name: "Envoyer" }).click();
  const thread = page.getByRole("list", { name: "Conversation avec Noé" });
  await expect(thread.getByText(/pouvez-vous m'envoyer la notice du siphon/)).toBeVisible();
  await expect(page.getByLabel("Votre message")).toHaveValue("");
  await capture(page, "client-conversation");
  await proPage.goto("/pro/messages");
  const inbox = proPage.getByRole("link", { name: /Dominique Test/ });
  await expect(inbox.getByText("1 message non lu")).toBeVisible();
  await capture(proPage, "artisan-messages");
  await inbox.click();
  const proThread = proPage.getByRole("list", { name: "Conversation avec Dominique Test" });
  await expect(proThread.getByText(/notice du siphon/)).toBeVisible();
  await proPage.getByLabel("Votre message").fill("Bonjour Dominique, je vous la dépose demain.");
  await proPage.keyboard.press("Enter");
  await expect(proThread.getByText("Bonjour Dominique, je vous la dépose demain.")).toBeVisible();
  await page.reload();
  await expect(thread.getByText("Bonjour Dominique, je vous la dépose demain.")).toBeVisible();
  await expect(thread.getByText(/ · Lu$/)).toBeVisible();

  // Signalement d'un problème (F-42) : chantier clôturé, donc ticket seul (le passage en litige
  // d'un chantier actif et la décision de l'équipe sont couverts par pgTAP) ; suivi et échanges.
  await page.goto(`/mon-espace/chantiers/${chantierId}`);
  await page.getByRole("link", { name: "Signaler un problème lié au chantier" }).click();
  await expect(page).toHaveURL(new RegExp(`/mon-espace/chantiers/${UUID}/signaler$`));
  await expect(page.getByText(/Le chantier n'étant plus en cours/)).toBeVisible();
  await page.getByRole("button", { name: "Envoyer le signalement" }).click();
  await expect(page.getByText("Choisissez la nature du problème.")).toBeVisible();
  await page.getByText("Malfaçon").click();
  // L'erreur disparaît dès que le champ est corrigé.
  await expect(page.getByText("Choisissez la nature du problème.")).toHaveCount(0);
  await page
    .getByLabel("Description du problème")
    .fill("Le joint du siphon fuit de nouveau depuis hier soir.");
  await capture(page, "client-signalement");
  await page.getByRole("button", { name: "Envoyer le signalement" }).click();
  await expect(page).toHaveURL(new RegExp(`/signalements/${UUID}$`));
  await expect(page.getByRole("heading", { name: "Votre signalement" })).toBeVisible();
  await expect(page.getByText("Envoyé à l'équipe")).toBeVisible();
  await expect(
    page.getByText("Le joint du siphon fuit de nouveau depuis hier soir."),
  ).toBeVisible();
  await page
    .getByLabel("Votre message à l'équipe MENAO")
    .fill("Je reste disponible demain matin pour un passage.");
  await page.getByRole("button", { name: "Envoyer", exact: true }).click();
  await expect(
    page.getByRole("list").getByText("Je reste disponible demain matin pour un passage."),
  ).toBeVisible();
  await capture(page, "client-suivi-signalement");
  await page.goto(`/mon-espace/chantiers/${chantierId}`);
  await expect(page.getByText(/Votre signalement est en cours de traitement/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Suivre mon signalement" })).toBeVisible();

  // Centre de notifications (F-41) : cloche avec les non lues, mêmes textes que les e-mails, lien
  // vers la page concernée ; préférences d'e-mail (activité du chantier désactivée).
  await page.getByRole("link", { name: /^Notifications : \d+ non lues?$/ }).click();
  await expect(page).toHaveURL(/\/notifications$/);
  const solde = page.getByRole("link", { name: /Votre chantier est terminé/ });
  await expect(solde).toHaveAttribute("href", `/mon-espace/chantiers/${chantierId}/avis`);
  await page.getByLabel(/Activité du chantier/).uncheck();
  await page.getByRole("button", { name: "Enregistrer mes préférences" }).click();
  await expect(page.getByText("Préférences enregistrées.")).toBeVisible();
  await capture(page, "client-notifications");
  await page.reload();
  await expect(page.getByLabel(/Activité du chantier/)).not.toBeChecked();
  await expect(page.getByLabel(/Rappels/)).toBeChecked();

  // « Mes échanges avec MENAO » (ADR 0041) : un message envoyé connecté depuis la page Contact
  // s'y retrouve avec son fil, à côté du signalement.
  await page.goto("/contact");
  await page.getByLabel("Votre adresse e-mail").fill(email);
  await page.getByLabel("Sujet (facultatif)").fill("Question sur la garantie");
  await page
    .getByLabel("Votre message", { exact: true })
    .fill("Combien de temps dure la garantie ?");
  await page.getByRole("button", { name: "Envoyer", exact: true }).click();
  await expect(page.getByText(/^Votre message est envoyé/)).toBeVisible();
  await page
    .getByRole("link", { name: "Suivre la réponse dans « Mes échanges avec MENAO »" })
    .click();
  await expect(page).toHaveURL(/\/echanges$/);
  await capture(page, "client-echanges");
  await expect(page.getByRole("link", { name: /Signalement sur un chantier/ })).toHaveAttribute(
    "href",
    new RegExp(`^/signalements/${UUID}$`),
  );
  await page.getByRole("link", { name: /Question sur la garantie/ }).click();
  await expect(page).toHaveURL(new RegExp(`/echanges/${UUID}$`));
  await expect(page.getByText("L'équipe MENAO vous répondra ici.")).toBeVisible();
  await page
    .getByLabel("Votre message à l'équipe MENAO")
    .fill("Je précise : il s'agit du siphon de la cuisine.");
  await page.getByRole("button", { name: "Envoyer", exact: true }).click();
  await expect(page.getByText("Je précise : il s'agit du siphon de la cuisine.")).toBeVisible();
  await capture(page, "client-echange");
  await pro.close();

  // Back-office (ADR 0046) : l'équipe retrouve la demande par l'e-mail du client, voit la réponse
  // de chaque artisan, puis la fiche du chantier (historique, paiements, documents).
  const staff = await browser.newContext();
  const admin = await staff.newPage();
  await admin.goto("/connexion");
  await admin.getByLabel("Adresse e-mail").fill("admin3@example.test");
  await admin.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await admin.getByRole("button", { name: "Me connecter" }).click();
  await expect(admin).toHaveURL(/\/admin\/mfa\/activer$/);
  const secret = (await admin.getByTestId("totp-secret").textContent())?.trim() ?? "";
  await admin.getByLabel("Code à 6 chiffres").fill(totp(secret));
  await admin.getByRole("button", { name: "Vérifier" }).click();
  await expect(admin).toHaveURL(/\/admin$/);

  await admin.getByRole("link", { name: "Demandes", exact: true }).click();
  await expect(admin.getByRole("heading", { name: "Demandes", level: 1 })).toBeVisible();
  await admin.getByRole("searchbox", { name: "Rechercher une demande" }).fill(email);
  await admin.getByRole("main").getByRole("button", { name: "Rechercher" }).click();
  await expect(admin.getByText("1 résultat", { exact: true })).toBeVisible();
  await capture(admin, "admin-demandes");
  await admin.getByRole("link", { name: /^Ouvrir la demande : Plombier · Nice/ }).click();
  await expect(admin).toHaveURL(new RegExp(`/admin/demandes/${UUID}$`));
  const contacted = admin.getByRole("region", { name: "Artisans contactés" });
  const noe = contacted.getByRole("listitem", { name: "Noé Plomberie" });
  await expect(noe).toContainText("Acceptée");
  await expect(contacted.getByRole("listitem", { name: "PLOMBERIE DISPO EXEMPLE" })).toContainText(
    "Annulée par le client",
  );
  await expect(admin.getByRole("region", { name: "Client", exact: true })).toContainText(email);
  await capture(admin, "admin-demande");

  await noe.getByRole("link", { name: /Voir le chantier/ }).click();
  await expect(admin).toHaveURL(new RegExp(`/admin/chantiers/${chantierId}$`));
  const history = admin.getByRole("region", { name: "Historique" });
  for (const step of ["Rendez-vous fixé", "Devis signé", "Acompte payé", "Solde payé"]) {
    await expect(history.getByText(step, { exact: true })).toBeVisible();
  }
  await expect(admin.getByRole("region", { name: "Paiements" }).getByRole("listitem")).toHaveCount(
    2,
  );
  const documents = admin.getByRole("region", { name: "Documents" });
  await expect(documents.getByRole("link", { name: /^Facture acompte n° / })).toBeVisible();
  await expect(
    documents.getByRole("link", { name: /^PV de réception n° .*avec réserves/ }),
  ).toBeVisible();
  await capture(admin, "admin-chantier");

  // Liste des chantiers : le chantier clôturé est parmi les « Terminés ».
  await admin.getByRole("link", { name: "Tous les chantiers" }).click();
  await admin
    .getByRole("navigation", { name: "Filtrer les chantiers par étape" })
    .getByRole("link", { name: /^Terminés/ })
    .click();
  await expect(
    admin.getByRole("link", { name: /^Ouvrir le chantier : Réparer une fuite/ }).first(),
  ).toBeVisible();

  // Recherche globale (ADR 0047) : la barre du haut retrouve le client par son e-mail, sa fiche
  // mène à sa demande.
  const globalSearch = admin.getByRole("searchbox", { name: "Rechercher dans le back-office" });
  await globalSearch.fill(email);
  await globalSearch.press("Enter");
  await expect(admin).toHaveURL(/\/admin\/recherche\?q=/);
  await admin
    .getByRole("region", { name: "Personnes" })
    .getByRole("link", { name: "Dominique Test" })
    .click();
  await expect(admin).toHaveURL(new RegExp(`/admin/personnes/${UUID}$`));
  await expect(admin.getByRole("heading", { name: "Dominique Test", level: 1 })).toBeVisible();
  await expect(
    admin
      .getByRole("region", { name: "Demandes", exact: true })
      .getByRole("link", { name: "Plombier · Nice" }),
  ).toBeVisible();
  await capture(admin, "admin-personne");

  // Actions sur le compte (ADR 0048) : lien de mot de passe reçu, export RGPD, suspension de
  // l'accès (motif exigé) puis rétablissement.
  const actions = admin.getByRole("region", { name: "Actions sur le compte" });
  await actions.getByRole("button", { name: "Réinitialiser le mot de passe" }).click();
  await expect(actions.getByText(`Lien envoyé à ${email}.`)).toBeVisible();
  expect(await authLinkFor(request, email, "recovery")).toContain("type=recovery");
  const exportHref = await actions
    .getByRole("link", { name: "Exporter ses données (RGPD)" })
    .getAttribute("href");
  const exported = await admin.request.get(exportHref ?? "");
  expect(exported.ok()).toBe(true);
  expect(((await exported.json()) as { compte: { email: string } }).compte.email).toBe(email);
  await actions.getByRole("button", { name: "Suspendre l'accès au compte" }).click();
  await expect(actions.getByText("Indiquez le motif de la suspension.")).toBeVisible();
  await actions
    .getByLabel("Motif de la suspension (transmis à la personne)")
    .fill("Test de suspension de l'accès.");
  await actions.getByRole("button", { name: "Suspendre l'accès au compte" }).click();
  await expect(
    actions.getByText("Accès suspendu : la personne ne peut plus se connecter."),
  ).toBeVisible();
  await expect(admin.getByText(/^Compte suspendu jusqu'au/)).toBeVisible();
  await actions.getByRole("button", { name: "Rétablir l'accès" }).click();
  await expect(actions.getByText("Accès rétabli.")).toBeVisible();

  // Boîte de réception (ADR 0049) : le message du client, pris en charge, note interne et réponse.
  await admin.getByRole("link", { name: /^Dossiers et messages/ }).click();
  await expect(admin).toHaveURL(/\/admin\/tickets$/);
  const ticketList = admin.getByRole("main");
  await ticketList.getByRole("searchbox", { name: "Rechercher un ticket" }).fill(email);
  await ticketList.getByRole("button", { name: "Rechercher" }).click();
  await admin.getByRole("link", { name: "Ouvrir le ticket : Question sur la garantie" }).click();
  await expect(admin).toHaveURL(new RegExp(`/admin/tickets/${UUID}$`));
  const handling = admin.getByRole("region", { name: "Prise en charge" });
  await handling.getByRole("button", { name: "Je m'en occupe" }).click();
  await expect(handling.getByText("Pris en charge par Charlie Admin.")).toBeVisible();
  const notes = admin.getByRole("region", { name: "Notes internes" });
  await notes.getByLabel("Nouvelle note").fill("Rappeler la cliente pour la garantie du siphon.");
  await notes.getByRole("button", { name: "Ajouter la note" }).click();
  await expect(notes.getByText("Rappeler la cliente pour la garantie du siphon.")).toBeVisible();
  const conversation = admin.getByRole("region", { name: "Échanges avec le déclarant" });
  await conversation
    .getByLabel("Réponse au déclarant")
    .fill("Bonjour, la garantie de bon fonctionnement dure deux ans.");
  await conversation.getByRole("button", { name: "Répondre" }).click();
  await expect(
    conversation.getByText("Bonjour, la garantie de bon fonctionnement dure deux ans."),
  ).toBeVisible();
  await capture(admin, "admin-ticket");

  // Suspension manuelle d'un artisan (ADR 0047) : motif obligatoire, puis levée de la suspension.
  await globalSearch.fill("VALIDE EXEMPLE");
  await globalSearch.press("Enter");
  await admin
    .getByRole("region", { name: "Artisans" })
    .getByRole("link", { name: "VALIDE EXEMPLE" })
    .click();
  const accountStatus = admin.getByRole("region", { name: "Statut du compte" });
  await expect(admin.getByRole("region", { name: "Activité" })).toBeVisible();
  await accountStatus.getByRole("button", { name: "Suspendre l'artisan" }).click();
  await expect(accountStatus.getByText("Indiquez le motif de la suspension.")).toBeVisible();
  await accountStatus
    .getByLabel("Motif de la suspension (transmis à l'artisan)")
    .fill("Test de suspension par l'équipe.");
  await accountStatus.getByRole("button", { name: "Suspendre l'artisan" }).click();
  await expect(
    accountStatus.getByText("Artisan suspendu : il n'apparaît plus dans les recherches."),
  ).toBeVisible();
  await capture(admin, "admin-artisan-suspendu");
  await accountStatus.getByRole("button", { name: "Lever la suspension" }).click();
  await expect(accountStatus.getByText("Suspension levée.")).toBeVisible();
  await staff.close();
});
