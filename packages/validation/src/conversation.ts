import { MESSAGE_MAX_LENGTH } from "@menao/core";
import { z } from "zod";
import { messages } from "./messages";
import { reviewReportSchema } from "./review";

/** F-40 : message texte de la conversation du chantier. */
export const conversationMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, { error: messages.messageRequired })
    .max(MESSAGE_MAX_LENGTH, { error: messages.messageTooLong }),
});

/** F-40 : signalement d'un message à l'équipe MENAO (mêmes règles que pour un avis). */
export const messageReportSchema = reviewReportSchema;
