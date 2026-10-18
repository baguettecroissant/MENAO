import { expect, test, type Page } from "./test";
import { capture } from "./fixtures";
import { totp } from "./totp";

// Comptes fictifs du seed : admin@example.test et dossier@example.test (dossier envoyé).
async function signIn(page: Page, email: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await page.getByRole("button", { name: "Me connecter" }).click();
}

test("admin : double authentification obligatoire puis validation d'un dossier", async ({
  page,
}) => {
  test.setTimeout(210_000);

  // Sans second facteur, le back-office renvoie vers l'activation du TOTP.
  await signIn(page, "admin@example.test");
  await expect(page).toHaveURL(/\/admin\/mfa\/activer$/);
  await expect(page.getByRole("img", { name: /QR code/ })).toBeVisible();
  const secret = (await page.getByTestId("totp-secret").textContent())?.trim() ?? "";
  await page.getByLabel("Code à 6 chiffres").fill("000000");
  await page.getByRole("button", { name: "Vérifier" }).click();
  await expect(page.getByText("Code incorrect ou expiré")).toBeVisible();
  await page.getByLabel("Code à 6 chiffres").fill(totp(secret));
  await page.getByRole("button", { name: "Vérifier" }).click();

  // Vue d'ensemble (F-58, ADR 0045) : à traiter, activité de la plateforme, chiffres clés.
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Vue d'ensemble", level: 1 })).toBeVisible();
  const dossiers = page
    .getByRole("region", { name: "À traiter maintenant" })
    .getByRole("article", { name: /dossiers? à vérifier$/ });
  await expect(dossiers).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Activité en direct" })
      .getByText("Dossier envoyé par PEINTURE DOSSIER EXEMPLE"),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "Demandes" })).toBeVisible();
  await capture(page, "admin-vue-ensemble");

  // Alertes de l'équipe (ADR 0050) : la cloche du back-office, dossier envoyé par le seed.
  await page.getByRole("link", { name: /^Notifications/ }).click();
  await expect(page).toHaveURL(/\/notifications$/);
  await expect(
    page.getByRole("link", { name: /Dossier artisan à vérifier/ }).first(),
  ).toBeVisible();
  await page.goto("/admin");

  // Argent (ADR 0051), en lecture seule : abonnements des artisans (essais du seed), paiements des
  // chantiers et notifications Stripe et DocuSeal.
  const menu = page.getByRole("navigation", { name: "Navigation du back-office" });
  await menu.getByRole("link", { name: "Abonnements" }).click();
  await expect(
    page.getByRole("heading", { name: "Abonnements des artisans", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("Revenu mensuel récurrent", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "PLOMBERIE DISPO EXEMPLE" })).toBeVisible();
  await capture(page, "admin-abonnements");
  await menu.getByRole("link", { name: "Paiements" }).click();
  await expect(
    page.getByRole("heading", { name: "Paiements des chantiers", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("Versé aux artisans (30 jours)")).toBeVisible();
  await capture(page, "admin-paiements");
  await page.goto("/admin/paiements/notifications");
  await expect(
    page.getByRole("heading", { name: "Notifications Stripe et DocuSeal", level: 1 }),
  ).toBeVisible();
  await capture(page, "admin-notifications-stripe");

  // Contrôle (ADR 0052) : une pièce ajoutée puis désactivée, inscrite au journal ; suivi de l'IA.
  const room = `Véranda ${Date.now().toString(36)}`;
  await menu.getByRole("link", { name: "Métiers et travaux" }).click();
  await expect(
    page.getByRole("heading", { name: "Métiers, travaux et pièces", level: 1 }),
  ).toBeVisible();
  const rooms = page.getByRole("region", { name: "Pièces" });
  await rooms.getByLabel("Nouvelle pièce").fill(room);
  await rooms.getByRole("button", { name: "Ajouter" }).click();
  await expect(rooms.getByText(`« ${room} » est ajouté en fin de liste.`)).toBeVisible();
  const added = rooms.getByRole("listitem", { name: room });
  await added.getByRole("button", { name: "Désactiver" }).click();
  await expect(added.getByText("Désactivée")).toBeVisible();
  await capture(page, "admin-referentiels");
  await menu.getByRole("link", { name: "Journal d'audit" }).click();
  await expect(page.getByRole("heading", { name: "Journal d'audit", level: 1 })).toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: "Entrée désactivée" }).filter({ hasText: room }),
  ).toBeVisible();
  await capture(page, "admin-journal");
  await menu.getByRole("link", { name: "Suivi de l'IA" }).click();
  await expect(page.getByRole("heading", { name: "Suivi de l'IA", level: 1 })).toBeVisible();
  await capture(page, "admin-ia");
  await page.goto("/admin");

  // À traiter → dossier
  await dossiers
    .getByRole("link", { name: "Ouvrir le dossier de PEINTURE DOSSIER EXEMPLE" })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("PEINTURE DOSSIER EXEMPLE");
  const validate = page.getByRole("button", { name: "Valider le dossier" });
  await expect(validate).toBeDisabled();

  // Vue côte à côte (ADR 0120) : saisie de l'artisan, fiche de l'entreprise, points à contrôler.
  const kbis = page.getByRole("listitem", { name: "Kbis ou extrait INSEE/RNE de moins de 3 mois" });
  await expect(kbis.getByText("À contrôler")).toBeVisible();
  await expect(kbis.getByText("Fiche de l'entreprise", { exact: true })).toBeVisible();
  // Un motif de la liste est exigé pour refuser un document.
  await kbis.getByRole("button", { name: "Refuser le document" }).click();
  await expect(kbis.getByRole("alert")).toContainText("Choisissez un motif de refus.");
  await expect(kbis.getByLabel("Motif du refus")).toBeVisible();

  for (const doc of [
    "Kbis ou extrait INSEE/RNE de moins de 3 mois",
    "Attestation d'assurance décennale",
    "Attestation de responsabilité civile professionnelle",
    "Pièce d'identité du dirigeant",
    "Attestation de vigilance URSSAF",
  ]) {
    const item = page.getByRole("listitem", { name: doc });
    await item.getByRole("button", { name: "Valider le document" }).click();
    await expect(item.getByText("Vérifié", { exact: true })).toBeVisible();
  }

  await page.getByRole("button", { name: "Marquer comme vérifiée" }).click();
  await expect(page.getByText("✓ Vérifiée")).toBeVisible();

  await expect(validate).toBeEnabled();
  await validate.click();
  await expect(page.getByText("Ce dossier n'est pas en attente de vérification.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Historique des décisions" })).toContainText(
    "Dossier validé",
  );

  // Contrôle aléatoire (ADR 0121) : tirage du mois, puis résultat d'un dossier tiré au sort.
  await page.goto("/admin/controles");
  await expect(page.getByRole("heading", { level: 1, name: "Contrôles aléatoires" })).toBeVisible();
  await page.getByRole("button", { name: "Lancer le tirage du mois" }).click();
  await expect(
    page.getByText(/dossiers? tirés? au sort\.|objectif du mois est déjà atteint/),
  ).toBeVisible();
  const drawn = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("button", { name: "Conforme", exact: true }) })
    .first();
  const drawnName = await drawn.getAttribute("aria-label");
  await drawn.getByLabel("Assureur appelé").check();
  await drawn.getByRole("button", { name: "Conforme", exact: true }).click();
  await expect(page.getByRole("listitem", { name: drawnName ?? "" })).toContainText("Contrôlé le");

  // Côté artisan : dossier validé. Déconnexion depuis le menu du compte (ADR 0035).
  await page.getByRole("button", { name: "Mon compte" }).click();
  await page.getByRole("button", { name: "Me déconnecter" }).click();
  await expect(page).toHaveURL("/");
  await signIn(page, "dossier@example.test");
  await expect(page).toHaveURL(/\/pro\/tableau-de-bord$/);
  // Accueil « À faire maintenant » (ADR 0131) : titre de bienvenue.
  await expect(page.getByRole("heading", { level: 1, name: /^Bonjour/ })).toBeVisible();
  await page.goto("/pro/onboarding");
  await expect(page.getByRole("main").getByRole("status").first()).toHaveText(
    "Votre dossier est validé.",
  );
});

test("le support : sa boîte de réception, pas le reste du back-office (ADR 0049)", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await signIn(page, "support@example.test");
  await expect(page).toHaveURL(/\/admin\/mfa\/activer$/);
  const secret = (await page.getByTestId("totp-secret").textContent())?.trim() ?? "";
  await page.getByLabel("Code à 6 chiffres").fill(totp(secret));
  await page.getByRole("button", { name: "Vérifier" }).click();
  await expect(page).toHaveURL(/\/admin\/tickets$/);
  await expect(page.getByRole("heading", { name: "Dossiers et messages", level: 1 })).toBeVisible();
  // Une seule rubrique, pas de recherche globale (réservée aux admins).
  await expect(
    page.getByRole("navigation", { name: "Navigation du back-office" }).getByRole("link"),
  ).toHaveCount(1);
  await expect(page.getByRole("searchbox", { name: "Rechercher dans le back-office" })).toHaveCount(
    0,
  );
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/tickets$/);
  await page.goto("/admin/personnes");
  await expect(page).toHaveURL(/\/admin\/tickets$/);
  // Ni paiements ni abonnements (spec §4).
  await page.goto("/admin/paiements");
  await expect(page).toHaveURL(/\/admin\/tickets$/);
});

test("un artisan n'accède pas au back-office", async ({ page }) => {
  await signIn(page, "artisan@example.test");
  await expect(page).toHaveURL(/\/pro\/onboarding/);
  await page.goto("/admin/artisans");
  await expect(page).toHaveURL(/\/pro\/onboarding/);
});
