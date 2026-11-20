import { expect, test } from "@playwright/test";

// Recrutement des conseillers (F-183, lot 77, ADR 0380) : une réunion est posée avec la clé
// serveur de l'instance locale de la CI ; un candidat arrive par le lien d'une annonce (provenance
// pré-cochée), voit les gains sans montant, candidate, puis réserve sa réunion sans compte. Données fictives.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

test("devenir conseiller : candidature, puis réunion d'information réservée", async ({ page }) => {
  test.setTimeout(90_000);
  const stamp = Date.now();
  const email = `conseiller.${stamp}@example.test`;
  const startsAt = new Date(Date.now() + 3 * 24 * 3600 * 1000);
  const meeting = await fetch(`${SUPABASE_URL}/rest/v1/recruitment_meetings`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({
      starts_at: startsAt.toISOString(),
      capacity: 5,
      meet_url: "https://meet.google.com/abc-defg-hij",
    }),
  });
  expect(meeting.ok).toBe(true);

  await page.goto("/devenir-conseiller?source=linkedin");
  await expect(
    page.getByRole("heading", { level: 1, name: "Devenez commercial MENAO." }),
  ).toBeVisible();

  // Gains sans aucun montant ni simulateur : plus vous travaillez, plus vous gagnez.
  await expect(
    page.getByRole("heading", { name: "Plus vous travaillez, plus vous gagnez." }),
  ).toBeVisible();
  await expect(page.locator("main")).not.toContainText("€");

  // Formulaire : provenance pré-cochée par le lien de l'annonce ; erreurs avant l'envoi.
  const form = page.locator("#candidature");
  await expect(form.getByRole("radio", { name: "LinkedIn" })).toBeChecked();
  await form.getByRole("button", { name: "Envoyer et choisir ma réunion" }).click();
  await expect(form.getByText("Indiquez votre prénom.")).toBeVisible();

  await form.getByLabel("Prénom").fill("Julie");
  await form.getByLabel("Nom", { exact: true }).fill("Exemple");
  await form.getByLabel("E-mail").fill(email);
  await form.getByLabel("Téléphone").fill(
    `06 ${String(stamp)
      .slice(-8)
      .replace(/(\d{2})(?=\d)/g, "$1 ")}`,
  );
  await form.getByLabel("Ville ou secteur").fill("Nice");
  await form.getByText("Auto-entrepreneur").click();
  await form
    .getByRole("group", { name: "Vous voyez déjà des artisans pour votre travail ?" })
    .getByText("Oui")
    .click();
  await form.getByText("2 ans et plus").click();
  await form.getByText("Temps partiel").click();
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Envoyer et choisir ma réunion" }).click();

  // Choix de la réunion, sans changer de page.
  await expect(form.getByText("Candidature envoyée")).toBeVisible();
  await expect(form.getByRole("heading", { name: /Merci Julie/ })).toBeVisible();
  await form.getByRole("button", { name: /^Je réserve/ }).click();
  await expect(form.getByRole("heading", { name: /C'est noté/ })).toBeVisible();
  await expect(form.getByText(email)).toBeVisible();

  // En base : étape « réunion prévue », provenance de l'annonce, e-mail de confirmation en file.
  const read = await fetch(
    `${SUPABASE_URL}/rest/v1/commercial_candidates?email=eq.${encodeURIComponent(email)}&select=id,stage,source`,
    { headers },
  );
  const [candidate] = (await read.json()) as { id: string; stage: string; source: string }[];
  expect(candidate).toMatchObject({ stage: "reunion_prevue", source: "linkedin" });
  const mails = await fetch(
    `${SUPABASE_URL}/rest/v1/notifications?candidate_id=eq.${candidate!.id}&type=eq.recrutement_reunion&select=id`,
    { headers },
  );
  expect(((await mails.json()) as unknown[]).length).toBe(1);
});
