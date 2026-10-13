import "server-only";
import { parseArtisanChantierDetail, type ArtisanChantierDetail } from "@menao/validation";
import type { createClient } from "@/lib/supabase/server";

/**
 * Détail d'un chantier de l'artisan (F-18, F-22) : demande d'origine, état, date de démarrage,
 * rendez-vous et notes privées. Schéma partagé avec l'application (`@menao/validation`).
 */
export type ChantierDetail = ArtisanChantierDetail;

export async function getChantierDetail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  chantierId: string,
): Promise<ChantierDetail | null> {
  const { data } = await supabase.rpc("artisan_chantier_detail", { p_chantier_id: chantierId });
  return parseArtisanChantierDetail(data);
}
