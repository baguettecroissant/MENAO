import "server-only";
import { z } from "zod";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

const labeled = z.object({ code: z.string(), label: z.string() });

/** Fiche publique renvoyée par la fonction SQL artisan_public_profile (F-10). */
const profileSchema = z.object({
  id: z.string(),
  display_name: z.string(),
  company_name: z.string().nullable(),
  avatar_path: z.string().nullable(),
  experience_years: z.number().nullable(),
  presentation: z.string().nullable(),
  paused: z.boolean(),
  available_from: z.string().nullable(),
  zone: z.object({
    mode: z.enum(["rayon", "communes"]).nullable(),
    radius_km: z.number().nullable(),
    city: z.string().nullable(),
    communes: z.array(z.string()),
  }),
  trades: z.array(labeled),
  work_types: z.array(labeled.extend({ trade: z.string() })),
  decennale: z
    .object({ valid_until: z.string().nullable(), insurer: z.string().nullable() })
    .nullable(),
  certifications: z.array(
    z.object({ type: z.string(), numero: z.string(), valid_until: z.string() }),
  ),
  photos: z.array(z.string()),
  // Score MENAO (F-28) : moyennes des avis publiés ; null tant qu'aucun avis n'est publié.
  score: z
    .object({
      review_count: z.number(),
      quality: z.number(),
      delays: z.number(),
      communication: z.number(),
      value_for_money: z.number(),
      global: z.number(),
    })
    .nullable()
    .catch(null),
});
export type ArtisanProfile = z.infer<typeof profileSchema>;

export async function getArtisanProfile(supabase: Client, artisanId: string) {
  const { data } = await supabase.rpc("artisan_public_profile", { p_artisan_id: artisanId });
  const parsed = profileSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/** Derniers avis publiés d'un artisan visible, du plus récent au plus ancien (F-28). */
export async function getArtisanReviews(supabase: Client, artisanId: string) {
  const { data } = await supabase.rpc("artisan_public_reviews", {
    p_artisan_id: artisanId,
    p_limit: 20,
  });
  return data ?? [];
}

const specialtiesSchema = z.array(labeled);

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
