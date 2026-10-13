import "server-only";
import { parseArtisanProfile } from "@menao/validation";
import { z } from "zod";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export { parseArtisanProfile, type ArtisanProfile } from "@menao/validation";

export async function getArtisanProfile(supabase: Client, artisanId: string) {
  const { data } = await supabase.rpc("artisan_public_profile", { p_artisan_id: artisanId });
  return parseArtisanProfile(data);
}

/** Derniers avis publiés d'un artisan visible, du plus récent au plus ancien (F-28). */
export async function getArtisanReviews(supabase: Client, artisanId: string) {
  const { data } = await supabase.rpc("artisan_public_reviews", {
    p_artisan_id: artisanId,
    p_limit: 20,
  });
  return data ?? [];
}

const specialtiesSchema = z.array(z.object({ code: z.string(), label: z.string() }));

/** Résultats de match_artisans (F-09), spécialités typées. */
export async function matchArtisans(supabase: Client, projectId: string, limit: number) {
  const { data, error } = await supabase.rpc("match_artisans", {
    p_project_id: projectId,
    p_limit: limit,
  });
  if (error) return null;
  return (data ?? []).map((row) => ({
    ...row,
    distance_km: row.distance_km === null ? null : Number(row.distance_km),
    specialties: specialtiesSchema.catch([]).parse(row.specialties),
  }));
}

export function publicUrl(supabase: Client, bucket: "avatars" | "portfolio", path: string) {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
