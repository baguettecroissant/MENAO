import {
  QUOTE_LIMITS,
  QUOTE_LINE_TYPES,
  QUOTE_UNITS,
  VAT_EXEMPT_BP,
  VAT_RATES_BP,
  lineTotalHtCents,
  parseEuros,
  parseQuantity,
} from "@menao/core";
import { z } from "zod";
import { messages } from "./messages";

const VAT_RATES = [VAT_EXEMPT_BP, ...VAT_RATES_BP] as const;

const vatRate = z
  .number()
  .int()
  .refine((v) => (VAT_RATES as readonly number[]).includes(v), { error: messages.vatRateInvalid });

const lineText = {
  type: z.enum(QUOTE_LINE_TYPES, { error: messages.required }),
  designation: z
    .string()
    .trim()
    .min(1, { error: messages.required })
    .max(QUOTE_LIMITS.designationMaxLength, { error: messages.tooLong }),
  description: z
    .string()
    .trim()
    .max(QUOTE_LIMITS.descriptionMaxLength, { error: messages.tooLong }),
  unit: z.enum(QUOTE_UNITS, { error: messages.required }),
  vatRateBp: vatRate,
};

function amountLimit(
  line: { quantityMilli: number; unitPriceHtCents: number },
  ctx: z.RefinementCtx,
) {
  if (
    lineTotalHtCents(line.quantityMilli, line.unitPriceHtCents) > QUOTE_LIMITS.maxLineTotalCents
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["unitPriceHtCents"],
      message: messages.lineAmountTooHigh,
    });
  }
}

/** Ligne de devis (F-19), en centimes et millièmes : envoi à la base. */
export const quoteLineSchema = z
  .object({
    ...lineText,
    quantityMilli: z
      .number()
      .int()
      .positive({ error: messages.quantityInvalid })
      .max(QUOTE_LIMITS.maxQuantityMilli, { error: messages.quantityTooHigh }),
    unitPriceHtCents: z
      .number()
      .int()
      .min(0, { error: messages.priceInvalid })
      .max(QUOTE_LIMITS.maxUnitPriceCents, { error: messages.priceTooHigh }),
  })
  .superRefine(amountLimit);
export type QuoteLineInput = z.infer<typeof quoteLineSchema>;

export const quoteLinesSchema = z
  .array(quoteLineSchema)
  .max(QUOTE_LIMITS.maxLines, { error: messages.tooManyLines });

/** Formulaire « Ajout d'une ligne » : quantité et prix saisis en texte (« 2,5 », « 22,50 »). */
export const quoteLineFormSchema = z
  .object({
    ...lineText,
    quantity: z.string().transform((value, ctx) => {
      const milli = parseQuantity(value);
      if (milli === null) {
        ctx.addIssue({ code: "custom", message: messages.quantityInvalid });
        return z.NEVER;
      }
      if (milli > QUOTE_LIMITS.maxQuantityMilli) {
        ctx.addIssue({ code: "custom", message: messages.quantityTooHigh });
        return z.NEVER;
      }
      return milli;
    }),
    unitPrice: z.string().transform((value, ctx) => {
      const cents = parseEuros(value);
      if (cents === null) {
        ctx.addIssue({ code: "custom", message: messages.priceInvalid });
        return z.NEVER;
      }
      if (cents > QUOTE_LIMITS.maxUnitPriceCents) {
        ctx.addIssue({ code: "custom", message: messages.priceTooHigh });
        return z.NEVER;
      }
      return cents;
    }),
  })
  .transform(({ quantity, unitPrice, ...rest }) => ({
    ...rest,
    quantityMilli: quantity,
    unitPriceHtCents: unitPrice,
  }))
  .superRefine((line, ctx) => {
    if (
      lineTotalHtCents(line.quantityMilli, line.unitPriceHtCents) > QUOTE_LIMITS.maxLineTotalCents
    ) {
      ctx.addIssue({ code: "custom", path: ["unitPrice"], message: messages.lineAmountTooHigh });
    }
  });
