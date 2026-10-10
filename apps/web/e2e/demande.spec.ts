import { expect, test, type Page } from "@playwright/test";
import { files } from "./fixtures";
import { authLinkFor } from "./mailpit";
import { signedStripeEvent } from "./stripe";

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

/** Captures des écrans (ordinateur et mobile 390 px), publiées par la CI pour la revue du design. */
async function capture(page: Page, name: string) {
  const viewport = page.viewportSize();
  await page.screenshot({ path: test.info().outputPath(`captures/${name}.png`), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: test.info().outputPath(`captures/${name}-mobile.png`),
    fullPage: true,
  });
  if (viewport) await page.setViewportSize(viewport);
}

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
  await pro.close();
});
