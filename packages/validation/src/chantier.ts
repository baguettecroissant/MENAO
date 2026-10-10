import { z } from "zod";
import { messages } from "./messages";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * F-17, F-18 : date (AAAA-MM-JJ) et heure d'arrivée (HH:MM), en heure de Paris. Les dates
 * passées ou trop lointaines sont refusées par @menao/core (appointmentInputError) et par la base.
 */
export const appointmentSchema = z.object({
  date: z.string().regex(DATE, { error: messages.appointmentDate }),
  time: z.string().regex(TIME, { error: messages.appointmentTime }),
});

/** F-18 : annulation du chantier, avec un message facultatif pour le client. */
export const cancelChantierSchema = z.object({
  reason: z.string().trim().max(500, { error: messages.tooLong }),
});

/** F-18 : notes privées de l'artisan sur le rendez-vous. */
export const appointmentNotesSchema = z.object({
  notes: z.string().max(5000, { error: messages.tooLong }),
});

/** F-17, F-18 : « Ce chantier a besoin d'une expertise » (autre corps de métier). */
export const expertiseSchema = z.object({
  trade: z.string().regex(/^[a-z0-9-]{1,60}$/, { error: messages.expertiseTradeRequired }),
  message: z.string().trim().max(2000, { error: messages.tooLong }),
});
