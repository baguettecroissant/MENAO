import { createPublicClient } from "@/lib/supabase/public";

/** Délai au-delà duquel la base est jugée indisponible. */
const TIMEOUT_MS = 4000;

/**
 * Santé du service (lot 4 du plan V1.1, ADR 0159), interrogée par un outil de surveillance
 * externe : 200 si le site répond et lit la base (référentiel public des métiers), 503 sinon.
 * Jamais de donnée personnelle, jamais en cache.
 */
export async function GET() {
  const started = Date.now();
  const check = createPublicClient().from("trades").select("code").limit(1);
  const timeout = new Promise<{ error: true }>((resolve) =>
    setTimeout(() => resolve({ error: true }), TIMEOUT_MS),
  );
  const result = await Promise.race([check, timeout]);
  const ok = !result.error;
  return Response.json(
    { statut: ok ? "ok" : "degrade", base: ok ? "ok" : "indisponible", ms: Date.now() - started },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}

export const dynamic = "force-dynamic";
