import "server-only";
import type { Database } from "@menao/db";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;
export type ArtisanFileStatus = Database["public"]["Enums"]["artisan_status"];

/**
 * Onglets par statut des Dossiers artisans, après « Inscriptions en cours » (ADR 0283) : les
 * brouillons y sont tous, avec les dossiers validés mais pas encore visibles (ADR 0219).
 */
export const ARTISAN_FILE_STATUSES = [
  "en_verification",
  "valide",
  "refuse",
  "suspendu",
  "radie",
] as const satisfies readonly ArtisanFileStatus[];

/** Nombre de dossiers par statut et d'inscriptions en cours, pour les onglets et les chiffres. */
export async function getArtisanFileCounts(supabase: Client) {
  const [statusCounts, { data: stalled }] = await Promise.all([
    Promise.all(
      ARTISAN_FILE_STATUSES.map(async (s) => {
        const { count } = await supabase
          .from("artisans")
          .select("id", { count: "exact", head: true })
          .eq("status", s);
        return [s, count ?? 0] as const;
      }),
    ),
    supabase.rpc("admin_stalled_signups"),
  ]);
  return {
    byStatus: new Map<ArtisanFileStatus, number>(statusCounts),
    stalled: stalled?.length ?? 0,
  };
}
