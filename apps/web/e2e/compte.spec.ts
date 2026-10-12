import { expect, test } from "@playwright/test";
import { authLinkFor } from "./mailpit";

// « Mon compte » (F-08, ADR 0039) sur un compte particulier créé pour le test. Données fictives
// uniquement (domaine réservé .test, numéros de la tranche fiction ARCEP 06 39 98).
const password = "mot-de-passe-e2e-local";
const newPassword = "nouveau-mot-de-passe-e2e";

test("Mon compte : informations, communications, mot de passe, e-mail, données, suppression", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const email = `compte-${stamp}@example.test`;
  const newEmail = `compte-nouveau-${stamp}@example.test`;

  // Page réservée aux comptes connectés.
  const anonymous = await request.get("/compte", { maxRedirects: 0 });
  expect(anonymous.status()).toBe(307);
  expect(anonymous.headers().location).toContain("/connexion?next=%2Fcompte");

  await page.goto("/inscription");
  await page.getByLabel("Prénom").fill("Camille");
  await page.getByLabel("Nom", { exact: true }).fill("Exemple");
  await page.getByLabel("Téléphone (optionnel)").fill("06 39 98 00 01");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByLabel(/J'accepte les conditions/).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL(/\/verifier-email$/);
  await page.goto(await authLinkFor(request, email));
  await expect(page).toHaveURL(/\/mon-espace$/);

  // Accès depuis le menu du compte.
  await page.getByRole("button", { name: "Mon compte" }).click();
  await page.getByRole("link", { name: "Mon compte" }).click();
  await expect(page).toHaveURL(/\/compte$/);
  await expect(page.getByRole("heading", { level: 1, name: "Mon compte" })).toBeVisible();

  // Mes informations.
  const infos = page.getByRole("region", { name: "Mes informations" });
  await infos.getByLabel("Prénom").fill("Camille-Marie");
  await infos.getByLabel(/Téléphone/).fill("06 39 98 00 02");
  await infos.getByRole("button", { name: "Enregistrer mes informations" }).click();
  await expect(infos.getByText("Vos informations sont enregistrées.")).toBeVisible();
  await page.reload();
  await expect(infos.getByLabel("Prénom")).toHaveValue("Camille-Marie");
  await expect(infos.getByLabel(/Téléphone/)).toHaveValue("0639980002");

  // Communications : consentement donné, puis modifiable.
  const communications = page.getByRole("region", { name: "Communications" });
  await communications
    .getByLabel("Recevoir par e-mail les actualités et conseils de MENAO")
    .check();
  await communications.getByRole("button", { name: "Enregistrer mes choix" }).click();
  await expect(
    communications.getByText("C'est noté : vous recevrez les actualités de MENAO."),
  ).toBeVisible();
  await expect(
    communications.getByRole("link", { name: "Choisir les e-mails de suivi" }),
  ).toHaveAttribute("href", "/notifications");

  // Mot de passe : l'actuel est vérifié.
  const passwordSection = page.getByRole("region", { name: "Mot de passe" });
  await passwordSection.getByLabel("Mot de passe actuel").fill("pas-le-bon-mot-de-passe");
  await passwordSection.getByLabel("Nouveau mot de passe").fill(newPassword);
  await passwordSection.getByRole("button", { name: "Changer mon mot de passe" }).click();
  await expect(passwordSection.getByText("Mot de passe actuel incorrect.")).toBeVisible();
  await passwordSection.getByLabel("Mot de passe actuel").fill(password);
  await passwordSection.getByLabel("Nouveau mot de passe").fill(newPassword);
  await passwordSection.getByRole("button", { name: "Changer mon mot de passe" }).click();
  await expect(
    passwordSection.getByText("Mot de passe modifié. Vos autres appareils devront se reconnecter."),
  ).toBeVisible();

  // Adresse e-mail : un lien à chaque adresse, changement effectif après les deux.
  const emailSection = page.getByRole("region", { name: "Adresse e-mail" });
  await emailSection.getByLabel("Nouvelle adresse e-mail").fill(email.toUpperCase());
  await emailSection.getByRole("button", { name: "Changer d'adresse e-mail" }).click();
  await expect(emailSection.getByText("C'est déjà l'adresse de votre compte.")).toBeVisible();
  await emailSection.getByLabel("Nouvelle adresse e-mail").fill(newEmail);
  await emailSection.getByRole("button", { name: "Changer d'adresse e-mail" }).click();
  await expect(emailSection.getByText(/C'est presque fini/)).toBeVisible();
  await page.reload();
  await expect(
    emailSection.getByText(`Changement en attente vers ${newEmail}`, { exact: false }),
  ).toBeVisible();
  await page.goto(await authLinkFor(request, newEmail, "email_change"));
  await expect(page).toHaveURL(/\/compte\?email=confirme$/);
  await expect(page.getByText(/Premier lien confirmé/)).toBeVisible();
  await page.goto(await authLinkFor(request, email, "email_change"));
  await expect(page.getByText("C'est noté : votre adresse e-mail est confirmée.")).toBeVisible();
  await expect(emailSection.getByText(newEmail, { exact: true })).toBeVisible();

  // Mes données : fichier JSON du compte.
  await expect(page.getByRole("link", { name: "Télécharger mes données" })).toHaveAttribute(
    "href",
    "/compte/donnees",
  );
  const exported = await page.request.get("/compte/donnees");
  expect(exported.status()).toBe(200);
  expect(exported.headers()["content-disposition"]).toMatch(
    /^attachment; filename="menao-mes-donnees-\d{4}-\d{2}-\d{2}\.json"$/,
  );
  const data = (await exported.json()) as {
    compte: { email: string; profil: { first_name: string; marketing_opt_in: boolean } };
    demandes: unknown[];
  };
  expect(data.compte.email).toBe(newEmail);
  expect(data.compte.profil.first_name).toBe("Camille-Marie");
  expect(data.compte.profil.marketing_opt_in).toBe(true);
  expect(data.demandes).toEqual([]);

  // Suppression du compte : confirmation explicite, demande transmise à l'équipe.
  const deletion = page.getByRole("region", { name: "Supprimer mon compte" });
  await deletion.getByRole("button", { name: "Demander la suppression de mon compte" }).click();
  await deletion.getByRole("button", { name: "Envoyer ma demande" }).click();
  await expect(deletion.getByText("Cochez la case pour confirmer votre demande.")).toBeVisible();
  await deletion.getByLabel("Une remarque ?").fill("Demande de test de bout en bout.");
  await deletion.getByLabel("Je demande la suppression de mon compte MENAO.").check();
  await deletion.getByRole("button", { name: "Envoyer ma demande" }).click();
  await expect(deletion.getByText(/Demande de suppression envoyée le/)).toBeVisible();

  // Déconnexion de tous les appareils, puis reconnexion avec les nouveaux identifiants.
  await page
    .getByRole("region", { name: "Sécurité" })
    .getByRole("button", { name: "Me déconnecter de tous mes appareils" })
    .click();
  await expect(page).toHaveURL(/\/connexion\?deconnexion=partout$/);
  await expect(page.getByText("Vous êtes déconnecté de tous vos appareils.")).toBeVisible();
  await page.getByLabel("Adresse e-mail").fill(newEmail);
  await page.getByLabel("Mot de passe").fill(newPassword);
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/\/mon-espace$/);
});
