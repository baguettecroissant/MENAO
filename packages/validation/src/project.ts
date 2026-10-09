import { z } from "zod";
import { messages } from "./messages";

// Valeurs reprises de @menao/core (project.ts) : le paquet de validation ne dépend que de Zod.
const LIEU_TYPES = ["appartement", "maison", "jardin", "entreprise"] as const;
const SURFACE_TRANCHES = ["moins_10", "10_20", "20_50", "plus_50"] as const;
const DATE_MODES = ["des_que_possible", "date", "inconnue"] as const;
const code = z.string().regex(/^[a-z0-9-]{1,60}$/);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: messages.dateInvalid });

/** F-05 : description libre, métier pré-sélectionné facultatif (puces). */
export const needInputSchema = z.object({
  description: z
    .string({ error: messages.required })
    .trim()
    .min(1, { error: messages.required })
    .max(5000, { error: messages.tooLong }),
  tradeHint: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? v : null))
    .pipe(code.nullable()),
});

/** F-07 : critères complets envoyés par chaque carte (today au format AAAA-MM-JJ, Europe/Paris). */
export function projectCriteriaSchema(today: string) {
  return z
    .object({
      tradeCode: code.nullable(),
      lieuType: z.enum(LIEU_TYPES).nullable(),
      roomCodes: z.array(code).max(20, { error: messages.tooMany }),
      workTypeCodes: z.array(code).max(20, { error: messages.tooMany }),
      surface: z.enum(SURFACE_TRANCHES).nullable(),
      ville: z
        .object({
          code: z.string().regex(/^[0-9][0-9AB][0-9]{3}$/),
          nom: z.string().trim().min(1).max(100),
          codePostal: z
            .string()
            .regex(/^\d{5}$/)
            .nullable(),
        })
        .nullable(),
      adresse: z
        .object({
          label: z.string().trim().min(1).max(200),
          citycode: z.string(),
          // null : adresse déjà enregistrée, coordonnées conservées côté base.
          lon: z.number().min(-180).max(180).nullable(),
          lat: z.number().min(-90).max(90).nullable(),
        })
        .nullable(),
      dateMode: z.enum(DATE_MODES),
      dateSouhaitee: isoDate.nullable(),
    })
    .superRefine((c, ctx) => {
      if (c.adresse && c.adresse.citycode !== c.ville?.code) {
        ctx.addIssue({ code: "custom", path: ["adresse"], message: messages.addressOutsideCity });
      }
      if (c.dateMode === "date") {
        if (!c.dateSouhaitee) {
          ctx.addIssue({ code: "custom", path: ["dateSouhaitee"], message: messages.required });
        } else if (c.dateSouhaitee < today) {
          ctx.addIssue({ code: "custom", path: ["dateSouhaitee"], message: messages.dateInPast });
        }
      }
    })
    .transform((c) => ({ ...c, dateSouhaitee: c.dateMode === "date" ? c.dateSouhaitee : null }));
}

export type ProjectCriteriaInput = z.input<ReturnType<typeof projectCriteriaSchema>>;
export type ProjectCriteria = z.output<ReturnType<typeof projectCriteriaSchema>>;
