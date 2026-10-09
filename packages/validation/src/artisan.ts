import { isValidSiret, normalizeSiret } from "@menao/core";
import { z } from "zod";
import { signUpSchema } from "./auth";
import { messages } from "./messages";

export const siretSchema = z
  .string({ error: messages.siretInvalid })
  .transform(normalizeSiret)
  .refine(isValidSiret, { error: messages.siretInvalid });

/** Inscription artisan (F-14) : téléphone et SIRET obligatoires, CGV artisans en plus. */
export const artisanSignUpSchema = signUpSchema
  .extend({
    siret: siretSchema,
    acceptCgv: z.literal(true, { error: messages.cgvRequired }),
  })
  .refine((v) => v.phone !== undefined, { path: ["phone"], error: messages.phoneRequired });
export type ArtisanSignUp = z.output<typeof artisanSignUpSchema>;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: messages.tooLong })
    .optional()
    .transform((v) => (v === "" ? undefined : v));

/** Étape 1 — entreprise. La raison sociale n'est saisie qu'en cas de diffusion partielle Sirene. */
export const companyStepSchema = z.object({
  nomCommercial: optionalText(120),
  raisonSociale: optionalText(200),
  assujettiTva: z.boolean({ error: messages.required }),
});
export type CompanyStep = z.output<typeof companyStepSchema>;

const code = z.string().regex(/^[a-z0-9-]{1,60}$/);
const uniqueCodes = z
  .array(code)
  .max(100, { error: messages.tooMany })
  .transform((v) => [...new Set(v)]);

/** Étape 2 — métiers, spécialités, expérience. */
export const tradesStepSchema = z.object({
  tradeCodes: uniqueCodes.refine((v) => v.length > 0, { error: messages.tradeRequired }),
  workTypeCodes: uniqueCodes,
  experienceYears: z.coerce
    .number({ error: messages.experienceInvalid })
    .int({ error: messages.experienceInvalid })
    .min(0, { error: messages.experienceInvalid })
    .max(80, { error: messages.experienceInvalid }),
});
export type TradesStep = z.output<typeof tradesStepSchema>;

export const CERTIFICATION_TYPES = [
  "rge",
  "qualifelec",
  "qualibat",
  "qualipac",
  "qualipv",
  "qualisol",
  "qualibois",
  "autre",
] as const;
export type CertificationType = (typeof CERTIFICATION_TYPES)[number];

/** Certification (RGE, Qualifelec…) : la date de fin ne peut pas être passée. */
export const certificationSchema = (today: Date = new Date()) =>
  z.object({
    type: z.enum(CERTIFICATION_TYPES, { error: messages.required }),
    numero: z
      .string()
      .trim()
      .min(1, { error: messages.required })
      .max(50, { error: messages.tooLong }),
    dateFin: z.iso
      .date({ error: messages.dateInvalid })
      .refine((d) => d >= today.toISOString().slice(0, 10), { error: messages.dateExpired }),
  });
export type Certification = z.output<ReturnType<typeof certificationSchema>>;

export const RADIUS_OPTIONS_KM = [10, 20, 30, 50, 75, 100] as const;
const MAX_COMMUNES = 200;
const inseeCode = z.string().regex(/^(\d{5}|2[AB]\d{3})$/);

/** Étape 3 — zone d'intervention : adresse de base + rayon, ou liste de communes. */
export const zoneStepSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("rayon"),
    baseLabel: z.string().trim().min(1, { error: messages.zoneAddressRequired }).max(300),
    baseCitycode: inseeCode,
    // France métropolitaine, Corse et DROM (boîte englobante large).
    lon: z.coerce.number().min(-63).max(56),
    lat: z.coerce.number().min(-22).max(52),
    radiusKm: z.coerce
      .number()
      .refine((v) => (RADIUS_OPTIONS_KM as readonly number[]).includes(v), {
        error: messages.radiusInvalid,
      }),
  }),
  z.object({
    mode: z.literal("communes"),
    communes: z
      .array(z.object({ code: inseeCode, nom: z.string().trim().min(1).max(100) }))
      .max(MAX_COMMUNES, { error: messages.tooMany })
      .transform((list) => [...new Map(list.map((c) => [c.code, c])).values()])
      .refine((list) => list.length > 0, { error: messages.communesRequired }),
  }),
]);
export type ZoneStep = z.output<typeof zoneStepSchema>;
