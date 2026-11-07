import "server-only";
import { parseChantierTeam, type ChantierTeamMember } from "@menao/core";
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

/**
 * Équipe d'un chantier pour le patron ou le chef d'équipe (ADR 0241) : membres actifs, attribués
 * ou non. Null sans membre (rien à choisir) ou pour un ouvrier.
 */
export async function getChantierTeam(
  supabase: Awaited<ReturnType<typeof createClient>>,
  chantierId: string,
): Promise<ChantierTeamMember[] | null> {
  const { data, error } = await supabase.rpc("chantier_team", { p_chantier_id: chantierId });
  if (error) return null;
  const members = parseChantierTeam(data);
  return members.length > 0 ? members : null;
}
