import { capture } from "./fixtures";
import { expect, test } from "./test";

// Suivi des prospects (F-65, lot 2, ADR 0206). Compte fictif du seed : commercial@example.test ;
// prospects fictifs du seed : PLOMBERIE (suivi, relance en retard), ELEC et MACONNERIE (libres).
test("prospects : journée, recherche, suivi, rendez-vous et ne plus contacter", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill("commercial@example.test");
  await page.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/\/commercial$/);
  const nav = page.getByRole("navigation", { name: "Navigation de l'espace commercial" });

  // Ma journée : la relance en retard du seed.
  await nav.getByRole("link", { name: "Ma journée" }).click();
  await expect(page.getByRole("heading", { name: "Ma journée", level: 1 })).toBeVisible();
  const followUps = page.getByRole("region", { name: "Relances à faire" });
  await expect(followUps.getByText("PLOMBERIE PROSPECT EXEMPLE")).toBeVisible();

  // Recherche, puis suivi d'un prospect libre avec un rendez-vous aujourd'hui.
  await nav.getByRole("link", { name: "Prospects" }).click();
  await expect(page.getByRole("heading", { name: "Prospects", level: 1 })).toBeVisible();
  await page.getByRole("searchbox").fill("ELEC");
  await page.getByRole("button", { name: "Rechercher" }).click();
  const list = page.getByRole("list", { name: "Prospects" });
  await expect(list.getByText("ELEC PROSPECT EXEMPLE")).toBeVisible();
  await capture(page, "prospects-liste");
  await list.getByRole("link", { name: /ELEC PROSPECT EXEMPLE/ }).click();
  await expect(
    page.getByRole("heading", { name: "ELEC PROSPECT EXEMPLE", level: 1 }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Suivre ce prospect" }).click();
  await page.getByLabel("Étape").selectOption({ label: "Rendez-vous pris" });
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(new Date());
  await page.getByLabel("Prochaine action (rendez-vous ou relance)").fill(`${today}T23:30`);
  await page.getByLabel("Téléphone").fill("+33600000000");
  await page.getByLabel("Notes").fill("Rendez-vous à l'atelier.");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Suivi enregistré.")).toBeVisible();
  await capture(page, "prospects-fiche");

  await nav.getByRole("link", { name: "Ma journée" }).click();
  await expect(
    page
      .getByRole("region", { name: "Rendez-vous aujourd'hui" })
      .getByText("ELEC PROSPECT EXEMPLE"),
  ).toBeVisible();

  // Ne plus contacter : confirmation, puis l'entreprise disparaît de la base.
  await nav.getByRole("link", { name: "Prospects" }).click();
  await page.getByRole("searchbox").fill("MACONNERIE");
  await page.getByRole("button", { name: "Rechercher" }).click();
  await page
    .getByRole("list", { name: "Prospects" })
    .getByRole("link", { name: /MACONNERIE/ })
    .click();
  await page.getByRole("button", { name: "Ne plus contacter" }).click();
  const dialog = page.getByRole("dialog", { name: "Ne plus contacter" });
  await dialog
    .getByRole("button", { name: "Confirmer : ne plus jamais contacter cette entreprise" })
    .click();
  await expect(page.getByText("C'est noté : l'entreprise ne sera plus contactée.")).toBeVisible();
  await page.getByRole("searchbox").fill("MACONNERIE");
  await page.getByRole("button", { name: "Rechercher" }).click();
  await expect(page.getByText("Aucun prospect ne correspond à votre recherche.")).toBeVisible();
});
