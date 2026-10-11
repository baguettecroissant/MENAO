import { AGENDA_LABEL_MAX_LENGTH, MAX_RANGES_PER_DAY, WEEKDAYS } from "@menao/core";
import { z } from "zod";
import { messages } from "./messages";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const label = z
  .string()
  .trim()
  .max(AGENDA_LABEL_MAX_LENGTH, { error: messages.agendaLabelTooLong });

/**
 * F-44 : horaires de la semaine envoyés par l'éditeur. Ordre, chevauchements et nombre de plages
 * par jour sont contrôlés par @menao/core (hoursErrors) et par la base.
 */
export const hoursSchema = z
  .array(
    z.object({
      weekday: z.literal([...WEEKDAYS], { error: messages.hoursInvalid }),
      start: z.string().regex(TIME, { error: messages.hoursInvalid }),
      end: z.string().regex(TIME, { error: messages.hoursInvalid }),
    }),
  )
  .max(WEEKDAYS.length * MAX_RANGES_PER_DAY, { error: messages.hoursInvalid });

/** F-44 : absence sur des journées entières (dates contrôlées par @menao/core : absenceError). */
export const absenceSchema = z.object({
  startsOn: z.string().regex(DATE, { error: messages.absenceStartRequired }),
  endsOn: z.string().regex(DATE, { error: messages.absenceEndRequired }),
  label,
});

/** F-44 : créneau bloqué sur une journée (heures contrôlées par @menao/core : blockedSlotError). */
export const blockedSlotSchema = z.object({
  date: z.string().regex(DATE, { error: messages.blockedSlotDateRequired }),
  start: z.string().regex(TIME, { error: messages.timeInvalid }),
  end: z.string().regex(TIME, { error: messages.timeInvalid }),
  label,
});

/** « Nouveaux chantiers à partir du » : une date, ou vide pour « dès maintenant ». */
export const availableFromSchema = z.union([
  z.literal(""),
  z.string().regex(DATE, { error: messages.dateInvalid }),
]);
