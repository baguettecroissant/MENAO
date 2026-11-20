import { expect, test } from "@playwright/test";
import { files } from "./fixtures";

// Recrutement des commerciaux (F-183, lots 77 et 79, ADR 0380 et 0382) : un candidat arrive par le
// lien d'une annonce (provenance pré-cochée), voit les gains sans montant ni mention d'IA, puis
// candidate en 3 étapes avec son CV (session anonyme, process-upload) et voit la confirmation ; en
// base : CV rangé, e-mail de bonne réception en file. Données fictives.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

test("devenir commercial : candidature en 3 étapes avec CV", async ({ page }) => {
  test.setTimeout(90_000);
  const stamp = Date.now();
  const email = `commercial.${stamp}@example.test`;

  await page.goto("/devenir-conseiller?source=linkedin");
  await expect(
    page.getByRole("heading", { level: 1, name: "Devenez commercial MENAO." }),
  ).toBeVisible();

  // Gains sans aucun montant, plus aucune mention d'IA (lot 79).
  await expect(
    page.getByRole("heading", { name: "Plus vous travaillez, plus vous gagnez." }),
  ).toBeVisible();
  const main = page.locator("main");
  await expect(main).not.toContainText("€");
  await expect(main).not.toContainText("copilote");
  await expect(main).not.toContainText("par l’IA");
  await expect(main).not.toContainText("par l'IA");

  // Étape 1 : erreurs avant de continuer.
  const form = page.locator("#candidature");
  await expect(form.getByText("Étape 1 sur 3")).toBeVisible();
  await form.getByRole("button", { name: "Continuer" }).click();
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
  await form.getByRole("button", { name: "Continuer" }).click();

  // Étape 2 : provenance pré-cochée par le lien de l'annonce.
  await expect(form.getByText("Étape 2 sur 3")).toBeVisible();
  await expect(form.getByRole("radio", { name: "LinkedIn" })).toBeChecked();
  await form.getByText("Auto-entrepreneur").click();
  await form
    .getByRole("group", { name: "Vous voyez déjà des artisans pour votre travail ?" })
    .getByText("Oui")
    .click();
  await form.getByText("2 ans et plus").click();
  await form.getByText("Temps partiel").click();
  await form.getByRole("button", { name: "Continuer" }).click();

  // Étape 3 : le CV est obligatoire, LinkedIn facultatif.
  await expect(form.getByText("Étape 3 sur 3")).toBeVisible();
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Envoyer ma candidature" }).click();
  await expect(form.getByText("Ajoutez votre CV en PDF.")).toBeVisible();
  await form.locator('input[type="file"]').setInputFiles({ ...files.pdf, name: "cv-julie.pdf" });
  await expect(form.getByText("cv-julie.pdf")).toBeVisible();
  await form.getByLabel(/Profil LinkedIn/).fill("linkedin.com/in/julie-exemple");
  await form.getByRole("button", { name: "Envoyer ma candidature" }).click();

  // Confirmation, sans changer de page.
  await expect(
    form.getByRole("heading", { name: /Merci Julie, votre candidature est envoyée/ }),
  ).toBeVisible();
  await expect(form.getByText(email)).toBeVisible();

  // En base : CV rangé, lien complété, provenance de l'annonce, e-mail de bonne réception en file.
  const read = await fetch(
    `${SUPABASE_URL}/rest/v1/commercial_candidates?email=eq.${encodeURIComponent(email)}&select=id,stage,source,cv_path,linkedin_url`,
    { headers },
  );
  const [candidate] = (await read.json()) as {
    id: string;
    stage: string;
    source: string;
    cv_path: string | null;
    linkedin_url: string | null;
  }[];
  expect(candidate).toMatchObject({
    stage: "nouveau",
    source: "linkedin",
    linkedin_url: "https://linkedin.com/in/julie-exemple",
  });
  expect(candidate?.cv_path).toMatch(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.pdf$/);
  const mails = await fetch(
    `${SUPABASE_URL}/rest/v1/notifications?candidate_id=eq.${candidate!.id}&type=eq.recrutement_recue&select=id`,
    { headers },
  );
  expect(((await mails.json()) as unknown[]).length).toBe(1);
});
