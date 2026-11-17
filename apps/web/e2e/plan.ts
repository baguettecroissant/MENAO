import { expect } from "@playwright/test";

// Formule d'un artisan du seed, le temps d'un test (clé serveur de l'instance locale de la CI) :
// certaines fonctions sont réservées à Premium ou à Entreprise (ADR 0287, 0363).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** Artisans du seed dont la formule change pendant un test. */
export const SEED_ARTISANS = {
  plombierNice: "b0000000-0000-4000-8000-000000000011",
  plombierDispo: "b0000000-0000-4000-8000-000000000012",
} as const;

export async function setArtisanPlan(artisanId: string, plan: "base" | "premium" | "entreprise") {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?artisan_id=eq.${artisanId}`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ plan_code: plan }),
  });
  expect(response.ok).toBe(true);
}
