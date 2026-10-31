import { DIPLOMES_METIER, ZONE_MODES } from "@menao/core";
import { z } from "zod";
import { menaoScorePartsSchema } from "./menao-score";

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
    mode: z.enum(ZONE_MODES).nullable(),
    radius_km: z.number().nullable(),
    city: z.string().nullable(),
    communes: z.array(z.string()),
  }),
  trades: z.array(labeled),
  work_types: z.array(labeled.extend({ trade: z.string() })),
  // Badge « Assuré et vérifié » (ADR 0119) et métiers non soumis à la décennale (ADR 0116).
  verified: z.boolean().catch(false),
  decennale_exempt: z.boolean().catch(false),
  decennale: z
    .object({ valid_until: z.string().nullable(), insurer: z.string().nullable() })
    .nullable(),
  rc_pro: z
    .object({ valid_until: z.string().nullable(), insurer: z.string().nullable() })
    .nullable()
    .catch(null),
  certifications: z.array(
    z.object({ type: z.string(), numero: z.string(), valid_until: z.string() }),
  ),
  // Domaines RGE lus dans l'annuaire officiel de l'ADEME (ADR 0118), encore valides.
  rge: z
    .array(
      z.object({ domain: z.string(), category: z.string().nullable(), valid_until: z.string() }),
    )
    .catch([]),
  photos: z.array(z.string()),
  // Score MENAO sur 100 (ADR 0155) : total et points de chaque critère.
  menao_score: menaoScorePartsSchema.nullable().catch(null),
  // Diplôme du métier déclaré par l'artisan ; avis Google vérifiés par l'équipe (source affichée).
  diplome: z.enum(DIPLOMES_METIER).nullable().catch(null),
  google: z
    .object({ rating: z.number(), count: z.number(), url: z.string() })
    .nullable()
    .catch(null),
  // Réseau du parrainage (ADR 0161) : filleuls visibles (« Artisans partenaires ») et parrain
  // visible (« Recommandé par »), avec l'adresse de leur fiche publique.
  partners: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        trade: z.string().nullable(),
        slug: z.string().nullable(),
      }),
    )
    .catch([]),
  recommended_by: z
    .object({ id: z.string(), name: z.string(), slug: z.string().nullable() })
    .nullable()
    .catch(null),
  // Avis des clients MENAO (F-28) : moyennes des avis publiés ; null tant qu'aucun avis n'est publié.
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
