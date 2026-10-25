import {
  EXPENSE_CATEGORIES,
  EXPENSE_KINDS,
  EXPENSE_LIMITS,
  EXPENSE_LINE_UNITS,
  parseEuros,
} from "@menao/core";
import { z } from "zod";
import { messages } from "./messages";

const isoDate = z.iso.date({ error: messages.dateInvalid });
const optionalDate = z.union([isoDate, z.literal("")]).transform((value) => value || null);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: messages.tooLong })
    .transform((value) => value || null);

/** Montant saisi en texte (« 435,00 », « 1 161,6 ») → centimes. */
const amount = z.string().transform((value, ctx) => {
  const cents = parseEuros(value);
  if (cents === null) {
    ctx.addIssue({ code: "custom", message: messages.amountInvalid });
    return z.NEVER;
  }
  if (cents > EXPENSE_LIMITS.maxAmountCents) {
    ctx.addIssue({ code: "custom", message: messages.amountTooHigh });
    return z.NEVER;
  }
  return cents;
});

const cents = z.number().int().min(0).max(EXPENSE_LIMITS.maxAmountCents);

/** Ligne lue sur la pièce (ExpenseLinePrefill), renvoyée telle quelle par le formulaire. */
export const expenseLineSchema = z.object({
  designation: z.string().trim().min(1).max(EXPENSE_LIMITS.lineDesignationMaxLength),
  reference: z.string().trim().max(EXPENSE_LIMITS.lineReferenceMaxLength).nullable(),
  quantityMilli: z.number().int().min(1).max(EXPENSE_LIMITS.maxQuantityMilli).nullable(),
  unit: z.enum(EXPENSE_LINE_UNITS).nullable(),
  unitPriceHtCents: cents.nullable(),
  totalHtCents: cents.nullable(),
});
export type ExpenseLineInput = z.infer<typeof expenseLineSchema>;

export const expenseLinesSchema = z.array(expenseLineSchema).max(EXPENSE_LIMITS.maxLines);

/**
 * Formulaire d'une dépense (F-62) : montants HT et TVA saisis en texte, le TTC est calculé.
 * `paidOn` vide : dépense à payer.
 */
export const expenseFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { error: messages.required })
      .max(EXPENSE_LIMITS.titleMaxLength, { error: messages.tooLong }),
    supplierName: optionalText(EXPENSE_LIMITS.supplierMaxLength),
    reference: optionalText(EXPENSE_LIMITS.referenceMaxLength),
    kind: z.enum(EXPENSE_KINDS, { error: messages.required }),
    category: z
      .union([z.enum(EXPENSE_CATEGORIES), z.literal("")])
      .transform((value) => value || null),
    issuedOn: isoDate,
    dueOn: optionalDate,
    paidOn: optionalDate,
    chantierId: z.union([z.uuid(), z.literal("")]).transform((value) => value || null),
    totalHt: amount,
    totalTva: amount,
    notes: optionalText(EXPENSE_LIMITS.notesMaxLength),
  })
  .superRefine((form, ctx) => {
    if (form.dueOn && form.dueOn < form.issuedOn) {
      ctx.addIssue({ code: "custom", path: ["dueOn"], message: messages.dueBeforeIssue });
    }
  })
  .transform(({ totalHt, totalTva, ...rest }) => ({
    ...rest,
    totalHtCents: totalHt,
    totalTvaCents: totalTva,
  }));
export type ExpenseFormInput = z.input<typeof expenseFormSchema>;
export type ExpenseForm = z.output<typeof expenseFormSchema>;
