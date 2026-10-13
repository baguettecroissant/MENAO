import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://localhost:3000";

/** Tests de bout en bout contre l'application buildée et un Supabase local (`pnpm db:start`). */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL, trace: "retain-on-failure" },
  // Branche jetable de la vidéo : captures en double résolution.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], deviceScaleFactor: 2 } }],
  webServer: [
    {
      // Faux serveur API Sirene, appelé par l'Edge Function sirene-check (Docker → hôte).
      command: "node e2e/mock-sirene.mjs",
      url: "http://127.0.0.1:54399/",
      reuseExistingServer: !process.env.CI,
    },
    {
      // Faux OpenRouter et faux géocodage, appelés par analyze-need et transcribe (Docker → hôte).
      command: "node e2e/mock-ai.mjs",
      url: "http://127.0.0.1:54398/",
      reuseExistingServer: !process.env.CI,
    },
    {
      // Faux DocuSeal (F-13) : API appelée par les Edge Functions (Docker → hôte), page de
      // signature ouverte par le navigateur, webhook vers signature-webhook.
      command: "node e2e/mock-docuseal.mjs",
      url: "http://127.0.0.1:54397/",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "pnpm start",
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
