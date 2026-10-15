import { expect, test, type Locator, type Page } from "./test";

// Agenda et disponibilités (F-44). Compte fictif du seed : valide@example.test (Lou, artisan
// validé, absent des tests de recherche : la pause et les absences ne les perturbent pas).
async function signIn(page: Page) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill("valide@example.test");
  await page.getByLabel("Mot de passe").fill("menao-local-dev-only");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/\/pro\/tableau-de-bord$/);
}

const day = (offset: number) =>
  new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

/** Clique sur chaque bouton tant qu'il en reste (test rejoué sur une base déjà modifiée). */
async function clickAll(buttons: Locator) {
  while ((await buttons.count()) > 0) {
    const before = await buttons.count();
    await buttons.first().click();
    await expect(buttons).toHaveCount(before - 1);
  }
}

test("agenda : horaires, absence, pause, abonnement .ics et créneau bloqué", async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page);

  // Rubrique « Agenda » du menu.
  await page
    .getByRole("navigation", { name: "Navigation de l'espace pro" })
    .getByRole("link", { name: "Agenda" })
    .click();
  await expect(page).toHaveURL(/\/pro\/agenda$/);
  await expect(page.getByRole("heading", { name: "Agenda", level: 1 })).toBeVisible();

  // Point de départ : aucun horaire, aucune absence, pas de pause ni d'abonnement.
  await page.getByRole("link", { name: "Mes disponibilités" }).click();
  await expect(page.getByRole("heading", { name: "Mes disponibilités", level: 1 })).toBeVisible();
  const hours = page.getByRole("region", { name: "Horaires de travail" });
  const saveHours = hours.getByRole("button", { name: "Enregistrer mes horaires" });
  await hours.getByRole("button", { name: "Tout effacer" }).click();
  if (await saveHours.isEnabled()) {
    await saveHours.click();
    await expect(hours.getByText("Horaires enregistrés.")).toBeVisible();
  }
  const absences = page.getByRole("region", { name: "Congés et absences" });
  await clickAll(absences.getByRole("button", { name: /Supprimer l'absence/ }));
  const resume = page.getByRole("button", { name: "Reprendre les demandes" });
  if (await resume.isVisible()) await resume.click();
  const sync = page.getByRole("region", { name: "Synchroniser avec votre agenda" });
  const disable = sync.getByRole("button", { name: "Désactiver l'abonnement" });
  if (await disable.isVisible()) await disable.click();

  // Sans horaires, l'agenda invite à les renseigner.
  await page.goto("/pro/agenda");
  await expect(page.getByText("Renseignez vos horaires de travail")).toBeVisible();
  await page.getByRole("link", { name: "Renseigner mes horaires" }).click();
  await expect(page).toHaveURL(/\/pro\/agenda\/disponibilites#horaires$/);

  // Horaires : modèle « lundi au vendredi », enregistré.
  await hours.getByRole("button", { name: /^Lun – ven/ }).click();
  await expect(hours.getByText("Modifications non enregistrées")).toBeVisible();
  await saveHours.click();
  await expect(hours.getByText("Horaires enregistrés.")).toBeVisible();
  await expect(hours.getByText(/40\sh par semaine/)).toBeVisible();

  // Absence en cours : « En congés », puis supprimée.
  await absences.getByLabel("Premier jour").fill(day(0));
  await absences.getByLabel("Dernier jour").fill(day(1));
  await absences.getByRole("button", { name: "Congés", exact: true }).click();
  await absences.getByRole("button", { name: "Ajouter l'absence" }).click();
  await expect(absences.getByText("Absence ajoutée.")).toBeVisible();
  await expect(page.getByRole("heading", { name: /En congés jusqu'au/ })).toBeVisible();
  await absences.getByRole("button", { name: /Supprimer l'absence/ }).click();
  await expect(absences.getByText("Aucune absence prévue.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Vous recevez de nouvelles demandes" }),
  ).toBeVisible();

  // Pause, puis reprise des demandes.
  await page.getByRole("button", { name: "Me mettre en pause" }).click();
  await expect(page.getByRole("heading", { name: "En pause", exact: true })).toBeVisible();
  await resume.click();
  await expect(
    page.getByRole("heading", { name: "Vous recevez de nouvelles demandes" }),
  ).toBeVisible();

  // Abonnement .ics : lien secret lisible sans session, puis renouvelé (l'ancien ne répond plus).
  await sync.getByRole("button", { name: "Créer mon lien d'abonnement" }).click();
  const link = sync.getByLabel("Lien d'abonnement");
  await expect(link).toHaveValue(/\/calendrier\/[0-9a-f]{48}\.ics$/);
  const feedUrl = new URL(await link.inputValue()).pathname;
  const feed = await page.request.get(feedUrl);
  expect(feed.status()).toBe(200);
  expect(feed.headers()["content-type"]).toContain("text/calendar");
  expect(await feed.text()).toContain("X-WR-CALNAME:MENAO");
  await sync.getByRole("button", { name: "Renouveler le lien" }).click();
  await expect(sync.getByText("Nouveau lien créé")).toBeVisible();
  expect((await page.request.get(feedUrl)).status()).toBe(404);

  // Créneau bloqué : ajouté depuis l'agenda, visible dans sa semaine, puis libéré.
  const date = day(2);
  await page.goto(`/pro/agenda?semaine=${date}`);
  const release = page.getByRole("button", {
    name: "Libérer le créneau Occupé · 14h00 – 16h00 · Chantier hors MENAO",
  });
  await clickAll(release);
  await page.getByRole("button", { name: "Bloquer un créneau" }).click();
  const dialog = page.getByRole("dialog", { name: "Bloquer un créneau" });
  await dialog.getByLabel("Date", { exact: true }).fill(date);
  await dialog.getByLabel("De", { exact: true }).fill("14:00");
  await dialog.getByLabel("À", { exact: true }).fill("16:00");
  await dialog.getByLabel("Motif").fill("Chantier hors MENAO");
  await dialog.getByRole("button", { name: "Bloquer ce créneau" }).click();
  await expect(dialog).toBeHidden();
  await expect(release).toHaveCount(1);
  await release.click();
  await expect(release).toHaveCount(0);
});
