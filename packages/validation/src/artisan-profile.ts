import { z } from "zod";

const labeled = z.object({ code: z.string(), label: z.string() });

/**
 * Fiche publique renvoyée par la fonction SQL `artisan_public_profile` (F-10), lue par le site
 * et par l'application. Jamais de téléphone ni d'e-mail.
 */
const profileSchema = z.object({
  id: z.string(),
  display_name: z.string(),
  company_name: z.string().nullable(),
  avatar_path: z.string().nullable(),
  experience_years: z.number().nullable(),
  presentation: z.string().nullable(),
  paused: z.boolean(),
  available_from: z.string().nullable(),
  // Temps de réponse moyen en minutes (F-10), publié à partir de 3 réponses.
  response_minutes: z.number().nullable().catch(null),
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

/** Fiche renvoyée par artisan_public_profile ou my_public_profile, ou null si invalide. */
export function parseArtisanProfile(data: unknown): ArtisanProfile | null {
  const parsed = profileSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
