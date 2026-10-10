import {
  DISPUTE_CATEGORIES,
  DISPUTE_DESCRIPTION_LIMITS,
  DISPUTE_OUTCOMES,
  TICKET_MESSAGE_MAX_LENGTH,
} from "@menao/core";
import { z } from "zod";
import { messages } from "./messages";

/** F-42 « Signaler un problème lié au chantier » : nature du problème et description. */
export const problemReportSchema = z.object({
  category: z.enum(DISPUTE_CATEGORIES, { error: messages.disputeCategoryRequired }),
  description: z
    .string()
    .trim()
    .min(DISPUTE_DESCRIPTION_LIMITS.min, { error: messages.disputeDescriptionTooShort })
    .max(DISPUTE_DESCRIPTION_LIMITS.max, { error: messages.disputeDescriptionTooLong }),
});

/** F-42 : message du déclarant ou de l'équipe dans le ticket. */
export const ticketMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, { error: messages.messageRequired })
    .max(TICKET_MESSAGE_MAX_LENGTH, { error: messages.messageTooLong }),
});

/** F-42 : décision de l'équipe (reprise ou annulation du chantier), expliquée aux parties. */
export const disputeDecisionSchema = z.object({
  outcome: z.enum(DISPUTE_OUTCOMES, { error: messages.disputeOutcomeRequired }),
  message: z
    .string()
    .trim()
    .min(10, { error: messages.disputeDecisionTooShort })
    .max(TICKET_MESSAGE_MAX_LENGTH, { error: messages.messageTooLong }),
});
