import { DIPLOMES_METIER } from "@menao/core";
import { z } from "zod";
import { messages } from "./messages";

const n = z.number();

/** Score MENAO sur 100 (ADR 0155) : total et points de chaque critère, comme en base. */
export const menaoScorePartsSchema = z.object({
  score: n,
  verifie: n,
  experience: n,
  diplomes: n,
  profil: n,
  reactivite: n,
  avis: n,
});
export type MenaoScoreParts = z.infer<typeof menaoScorePartsSchema>;

/**
 * Score de l'artisan connecté (`my_menao_score`) : points, faits utiles aux conseils et date de
 * son planning. Null : pas encore d'espace artisan.
 */
const myMenaoScoreSchema = z.object({
  score: n,
  parts: menaoScorePartsSchema.omit({ score: true }),
  facts: z.object({
    verified: z.boolean(),
    annees: n,
    diplome: z.boolean(),
    qualification: z.boolean(),
    profil_pct: n,
    reponse_minutes: n.nullable(),
    devis_taux: n,
    avis_menao: n,
    note_menao: n.nullable(),
    avis_google: n.nullable(),
    note_google: n.nullable(),
  }),
  planning_updated_at: z.string().nullable(),
});
export type MyMenaoScore = z.infer<typeof myMenaoScoreSchema>;

export function parseMyMenaoScore(data: unknown): MyMenaoScore | null {
  const parsed = myMenaoScoreSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/** Diplôme déclaré (formulaire) : vide pour aucun. */
export const diplomaSchema = z
  .union([z.enum(DIPLOMES_METIER), z.literal("")], { error: messages.required })
  .transform((value) => (value === "" ? null : value));

/**
 * Avis Google saisis par l'équipe (back-office) : lien de la fiche Google, note et nombre d'avis ;
 * lien vide pour les retirer. Mêmes règles qu'en base (`admin_set_google_reviews`).
 */
export const googleReviewsSchema = z
  .object({
    url: z.string().trim().max(500, { error: messages.tooLong }),
    rating: z.string().trim(),
    count: z.string().trim(),
  })
  .transform((value, ctx) => {
    if (value.url === "") return { url: null, rating: null, count: null };
    if (!/^https:\/\/([a-z0-9-]+\.)*(google\.[a-z.]+|goo\.gl|g\.page)\//i.test(value.url)) {
      ctx.addIssue({ code: "custom", path: ["url"], message: messages.googleUrlInvalid });
    }
    const rating = Number(value.rating.replace(",", "."));
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      ctx.addIssue({ code: "custom", path: ["rating"], message: messages.googleRatingInvalid });
    }
    const count = Number(value.count);
    if (!Number.isInteger(count) || count < 1 || count > 100_000) {
      ctx.addIssue({ code: "custom", path: ["count"], message: messages.googleCountInvalid });
    }
    return { url: value.url, rating: Math.round(rating * 10) / 10, count };
  });
export type GoogleReviewsInput = z.infer<typeof googleReviewsSchema>;
