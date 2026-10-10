import {
  REVIEW_COMMENT_LIMITS,
  REVIEW_REPLY_MAX_LENGTH,
  REVIEW_REPORT_LIMITS,
  VALUE_FOR_MONEY,
} from "@menao/core";
import { z } from "zod";
import { messages } from "./messages";

/**
 * Note d'un critère (0 à 100 %, entier). Un curseur que le client n'a pas touché envoie une chaîne
 * vide : refusée, pour ne pas compter 0 % par défaut.
 */
const criterion = z
  .string({ error: messages.reviewCriterionRequired })
  .regex(/^(100|[1-9]?\d)$/, { error: messages.reviewCriterionRequired })
  .transform(Number);

/** F-28 : avis du client (trois curseurs, rapport qualité/prix, commentaire). */
export const reviewSchema = z.object({
  quality: criterion,
  delays: criterion,
  communication: criterion,
  value_for_money: z.enum(VALUE_FOR_MONEY, { error: messages.reviewValueRequired }),
  comment: z
    .string()
    .trim()
    .min(REVIEW_COMMENT_LIMITS.min, { error: messages.reviewCommentTooShort })
    .max(REVIEW_COMMENT_LIMITS.max, { error: messages.reviewCommentTooLong }),
});

/** F-28 : réponse publique de l'artisan, une seule fois. */
export const reviewReplySchema = z.object({
  reply: z
    .string()
    .trim()
    .min(1, { error: messages.reviewReplyRequired })
    .max(REVIEW_REPLY_MAX_LENGTH, { error: messages.reviewReplyTooLong }),
});

/** F-28 : signalement d'un avis à l'équipe MENAO. */
export const reviewReportSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(REVIEW_REPORT_LIMITS.min, { error: messages.reviewReportTooShort })
    .max(REVIEW_REPORT_LIMITS.max, { error: messages.tooLong }),
});

/** F-55 : motif de masquage d'un avis par l'équipe (jamais pour la seule raison qu'il est négatif). */
export const reviewModerationSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, { error: messages.moderationReasonRequired })
    .max(500, { error: messages.tooLong }),
});
