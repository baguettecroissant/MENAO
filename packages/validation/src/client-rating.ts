import { CLIENT_RATING_COMMENT_LIMITS } from "@menao/core";
import { z } from "zod";
import { messages } from "./messages";

// Curseur non touché : chaîne vide refusée, pour ne pas compter 0 % par défaut (comme les avis).
const criterion = z
  .string({ error: messages.reviewCriterionRequired })
  .regex(/^(100|[1-9]?\d)$/, { error: messages.reviewCriterionRequired })
  .transform(Number);

/** F-23 : notation du client par l'artisan (trois curseurs et un commentaire). */
export const clientRatingSchema = z.object({
  welcome: criterion,
  clarity: criterion,
  payment: criterion,
  comment: z
    .string()
    .trim()
    .min(CLIENT_RATING_COMMENT_LIMITS.min, { error: messages.clientRatingCommentTooShort })
    .max(CLIENT_RATING_COMMENT_LIMITS.max, { error: messages.clientRatingCommentTooLong }),
});
export type ClientRatingInput = z.output<typeof clientRatingSchema>;
