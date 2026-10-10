import { CHANTIER_MESSAGE_MAX_LENGTH, RESERVES_LIMITS } from "@menao/core";
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

/**
 * F-22 : date (AAAA-MM-JJ) et heure (HH:MM) de démarrage du chantier, en heure de Paris. Les dates
 * passées ou à plus d'un an sont refusées par @menao/core (chantierStartInputError) et par la base.
 */
export const chantierStartSchema = z.object({
  date: z.string().regex(DATE, { error: messages.chantierStartDate }),
  time: z.string().regex(TIME, { error: messages.chantierStartTime }),
});

/** F-22 « Ajouter un message » au journal du chantier. */
export const chantierMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, { error: messages.chantierMessageRequired })
    .max(CHANTIER_MESSAGE_MAX_LENGTH, { error: messages.chantierMessageTooLong }),
});

/** F-26 « Ajouter des réserves » : points à reprendre, inscrits dans les observations du PV. */
export const reservesSchema = z.object({
  reserves: z
    .string()
    .trim()
    .min(RESERVES_LIMITS.min, { error: messages.reservesTooShort })
    .max(RESERVES_LIMITS.max, { error: messages.reservesTooLong }),
});
