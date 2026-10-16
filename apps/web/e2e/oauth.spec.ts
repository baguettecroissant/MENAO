import { expect, test } from "./test";

// Connexion avec Google ou Apple pour les clients (ADR 0108). Le fournisseur n'est pas joint en
// CI : la redirection vers Supabase Auth est interceptée, et le compte « à finaliser » est créé
// par l'API d'administration de l'instance locale. Données fictives (domaine réservé .test).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const password = "mot-de-passe-e2e-local";

test("Continuer avec Google : redirection vers le fournisseur, retour sur /auth/confirm", async ({
  page,
}) => {
  let authorize: URL | null = null;
  await page.route(`${SUPABASE_URL}/auth/v1/authorize**`, async (route) => {
    authorize = new URL(route.request().url());
    await route.fulfill({ contentType: "text/html", body: "<p>Page du fournisseur</p>" });
  });

  await page.goto("/connexion?next=/mon-espace/documents");
  await expect(page.getByRole("button", { name: "Continuer avec Apple" })).toBeVisible();
  await page.getByRole("button", { name: "Continuer avec Google" }).click();
  await expect(page.getByText("Page du fournisseur")).toBeVisible();
  const url = authorize as URL | null;
  expect(url?.searchParams.get("provider")).toBe("google");
  expect(url?.searchParams.get("redirect_to")).toBe(
    "http://localhost:3000/auth/confirm?next=%2Fmon-espace%2Fdocuments",
  );
  // Flux PKCE : le code reçu au retour ne vaut que dans ce navigateur.
  expect(url?.searchParams.get("code_challenge")).toBeTruthy();

  // Refus ou annulation chez le fournisseur : retour à la connexion avec un message.
  await page.goto("/auth/confirm?error=access_denied&error_description=refus");
  await expect(page).toHaveURL(/\/connexion\?erreur=oauth$/);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "La connexion avec Google ou Apple n'a pas abouti",
  );
});

test("compte Google à finaliser : CGU acceptées, puis espace client", async ({ page, request }) => {
  expect(SERVICE_KEY).not.toBe("");
  const email = `e2e-google-${Date.now()}@example.test`;
  // Comme un compte créé par Google : nom repris du fournisseur, marqueur « à finaliser ».
  const created = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    data: {
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Camille Exemple" },
      app_metadata: { signup_pending: true },
    },
  });
  expect(created.ok()).toBe(true);

  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page).toHaveURL(/\/finaliser-compte\?next=%2Fmon-espace$/);
  await expect(page.getByRole("heading", { level: 1, name: "Finaliser mon compte" })).toBeVisible();
  await expect(page.getByLabel("Prénom")).toHaveValue("Camille");
  await expect(page.getByLabel("Nom", { exact: true })).toHaveValue("Exemple");

  // Espaces fermés tant que les CGU ne sont pas acceptées.
  await page.goto("/mon-espace/documents");
  await expect(page).toHaveURL(/\/finaliser-compte\?next=%2Fmon-espace%2Fdocuments$/);

  await page.getByRole("button", { name: "Accéder à mon espace" }).click();
  await expect(page.getByText(/accepter les conditions/i).first()).toBeVisible();
  await page.getByLabel(/J'accepte les conditions/).check();
  await page.getByRole("button", { name: "Accéder à mon espace" }).click();
  await expect(page).toHaveURL(/\/mon-espace\/documents$/);

  // Une fois finalisé, la page renvoie à l'espace.
  await page.goto("/finaliser-compte");
  await expect(page).toHaveURL(/\/mon-espace$/);
});
