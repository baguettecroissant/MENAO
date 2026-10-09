import { expect, test } from "@playwright/test";
import { authLinkFor } from "./mailpit";

// Demande de chantier (F-08, F-11, F-17) : sélection de 2 artisans, compte créé au moment de la
// demande (le projet anonyme est conservé), réponse de l'artisan, coordonnées après acceptation.
const UUID = "[0-9a-f-]{36}";

test("demande à 2 artisans, compte créé en chemin, acceptation par l'artisan", async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(120_000);
  const email = `demande-${Date.now()}@example.test`;

  await page.goto("/");
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
    page.getByRole("heading", { name: "Envoyez votre demande de chantier à Noé et Inès" }),
  ).toBeVisible();
  await page.getByLabel("Prénom").fill("Dominique");
  await page.getByLabel("Nom", { exact: true }).fill("Test");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill("mot-de-passe-de-test-e2e");
  await page.getByLabel(/J'accepte les conditions générales/).check();
  await page.getByRole("button", { name: "Créer mon compte et continuer" }).click();
  await expect(
    page.getByText("Nous venons de vous envoyer un e-mail de confirmation"),
  ).toBeVisible();

  // Le lien de confirmation ramène à la demande, projet rattaché au nouveau compte.
  await page.goto(await authLinkFor(request, email));
  await expect(page).toHaveURL(new RegExp(`/recherche/${UUID}/envoyer\\?`));
  await page
    .getByLabel("Votre message (facultatif)")
    .fill("Merci de me rappeler au 06 99 99 99 99.");
  await page.getByLabel("Téléphone").fill("06 12 34 56 78");
  await page.getByLabel("Indiquer une plage horaire").check();
  await page.getByLabel("À partir de").fill("09:00");
  await page.getByLabel("Jusqu'à").fill("12:00");
  await page.getByRole("button", { name: "Envoyer ma demande aux 2 artisans" }).click();

  await expect(page).toHaveURL(new RegExp(`/recherche/${UUID}/envoyee$`));
  await expect(
    page.getByRole("heading", { name: "Votre demande est envoyée à Noé et Inès !" }),
  ).toBeVisible();
  await expect(page.getByText("Vous serez rappelé entre 09 h 00 et 12 h 00.")).toBeVisible();
  await page.getByRole("link", { name: "Suivre ma demande depuis mon espace" }).click();
  await expect(page).toHaveURL(/\/mon-espace$/);
  await expect(page.getByText("En attente de réponse")).toHaveCount(2);

  // L'artisan reçoit la demande : coordonnées masquées jusqu'à l'acceptation.
  const pro = await browser.newContext();
  const proPage = await pro.newPage();
  await proPage.goto("/connexion");
  await proPage.getByLabel("Adresse e-mail").fill("plombier-nice@example.test");
  await proPage.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await proPage.getByRole("button", { name: "Me connecter" }).click();
  await expect(proPage).toHaveURL(/\/pro\/onboarding$/);
  await proPage.getByRole("link", { name: /Mes demandes/ }).click();
  await expect(proPage.getByRole("heading", { name: "Mes demandes" })).toBeVisible();
  await proPage
    .getByRole("link", { name: /Dominique/ })
    .first()
    .click();
  const main = proPage.getByRole("main");
  await expect(main.getByText("Merci de me rappeler au [téléphone].")).toBeVisible();
  await expect(main.getByText("Ses coordonnées et l'adresse exacte s'affichent")).toBeVisible();
  await expect(main.getByText("Entre 09:00 et 12:00")).toBeVisible();
  expect(await main.innerText()).not.toContain("+33612345678");

  await main.getByRole("button", { name: "Accepter la demande" }).click();
  await expect(main.getByText("Dominique Test")).toBeVisible();
  await expect(main.getByRole("link", { name: /Appeler : \+33612345678/ })).toBeVisible();
  await expect(
    main.getByRole("link", { name: new RegExp(`Écrire un e-mail : ${email}`) }),
  ).toBeVisible();
  await pro.close();

  // Le particulier voit l'acceptation et les coordonnées de l'artisan.
  await page.reload();
  await expect(page.getByText("Acceptée")).toBeVisible();
  await expect(page.getByRole("link", { name: "plombier-nice@example.test" })).toBeVisible();
});
