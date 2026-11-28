import { expect, test } from "@playwright/test";

// Démo de l'espace commercial par lien (F-65, lot 57, ADR 0344) : le lien est activé avec une clé
// connue (clé serveur de l'instance locale de la CI), puis ouvert sans compte : bandeau, données
// fictives, action arrêtée, entraînement d'exemple, démo artisan ; le lien changé ne marche plus.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const KEY = "0123456789abcdef0123456789abcdef";

async function setDemo(values: { key: string; enabled: boolean }) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/commercial_demo?id=eq.true`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(values),
  });
  expect(response.ok).toBe(true);
}

test("démo commerciale : lien secret, données fictives, rien d'envoyé", async ({ page }) => {
  test.setTimeout(90_000);
  await setDemo({ key: KEY, enabled: true });

  await page.goto(`/commercial/demo/${KEY}`);
  await expect(page).toHaveURL(/\/commercial$/);
  await expect(page.getByText("Démo de l'espace conseiller MENAO.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Voici ce qu'un conseiller MENAO a en main/ }),
  ).toBeVisible();
  await expect(page.getByText("Plomberie des Oliviers").first()).toBeVisible();

  // La fiche du copilote déjà préparée ; « Appeler » ne lance rien.
  await page.getByRole("link", { name: /Le copilote/ }).click();
  await expect(page.getByRole("heading", { name: "Thermo Azur" })).toBeVisible();
  await expect(page.getByText("Des demandes près de chez lui").first()).toBeVisible();
  await page.getByRole("link", { name: "Appeler" }).first().click();
  await expect(page.getByRole("status").getByText("C'est une démo")).toBeVisible();
  await expect(page).toHaveURL(/\/commercial\/prospects\//);

  // Entraînement : l'échange d'exemple et sa note, sans simulateur.
  await page.goto("/commercial/guide/entrainement");
  await expect(page.getByRole("region", { name: "La note du coach" })).toContainText("16");
  await expect(page.getByText("Jeudi 8 h, ça marche.")).toBeVisible();

  // Résultats fictifs, puis la démo de l'espace artisan.
  await page.goto("/commercial/resultats");
  await expect(page.getByText("440,00 €").first()).toBeVisible();
  // Gains du mois et primes à venir (ADR 0397).
  await expect(page.getByText("jusqu'à 660 €").filter({ visible: true })).toBeVisible();
  await page.goto("/commercial/resultats/a-venir");
  await expect(page.getByText("Plomberie du Port")).toBeVisible();
  await page.getByRole("link", { name: /Voir aussi l'espace artisan/ }).click();
  await expect(page).toHaveURL(/\/pro\/decouvrir/);
  await expect(page.getByText(/Bonjour Sarah/)).toBeVisible();

  // Lien changé : la démo se ferme, l'ancien lien explique pourquoi.
  await setDemo({ key: "fedcba9876543210fedcba9876543210", enabled: true });
  await page.goto("/commercial");
  await expect(page).toHaveURL(/\/connexion/);
  await page.goto(`/commercial/demo/${KEY}`);
  await expect(page.getByRole("heading", { name: "Ce lien de démo ne marche plus" })).toBeVisible();
  await setDemo({ key: KEY, enabled: false });
});
