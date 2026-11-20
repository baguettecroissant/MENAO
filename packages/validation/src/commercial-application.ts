import {
  RECRUITMENT_AVAILABILITIES,
  RECRUITMENT_EXPERIENCES,
  RECRUITMENT_LEGAL_STATUSES,
  RECRUITMENT_SOURCES,
} from "@menao/core";
import { z } from "zod";
import { normalizePhone } from "./auth";
import { messages } from "./messages";

const name = (error: string) =>
  z.string({ error }).trim().min(1, { error }).max(60, { error: messages.tooLong });
const choice = <T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(values, { error: messages.candidateChoice });

const LINKEDIN = /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/\S+$/i;
const CV_PATH =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/;

/** Profil LinkedIn facultatif : « linkedin.com/in/… » accepté, complété en https://. */
const linkedinUrl = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (!value) return null;
    const url = /^https?:\/\//i.test(value)
      ? value.replace(/^http:/i, "https:")
      : `https://${value}`;
    if (url.length > 300 || !LINKEDIN.test(url)) {
      ctx.addIssue({ code: "custom", message: messages.candidateLinkedin });
      return z.NEVER;
    }
    return url;
  });

/**
 * Les trois étapes du formulaire (lot 79, ADR 0382), contrôlées une à une dans le navigateur avant
 * de passer à la suivante : vous ; votre profil ; votre CV (le fichier est contrôlé à part).
 */
const step1 = {
  first_name: name(messages.candidateFirstName),
  last_name: name(messages.candidateLastName),
  email: z
    .string({ error: messages.emailInvalid })
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: messages.emailInvalid }).max(254, { error: messages.tooLong })),
  phone: z
    .string({ error: messages.phoneInvalid })
    .trim()
    .transform((value, ctx) => {
      const e164 = normalizePhone(value);
      if (!e164) ctx.addIssue({ code: "custom", message: messages.phoneInvalid });
      return e164 ?? "";
    }),
  sector: z
    .string({ error: messages.candidateSector })
    .trim()
    .min(2, { error: messages.candidateSector })
    .max(120, { error: messages.tooLong }),
};
const step2 = {
  legal_status: choice(RECRUITMENT_LEGAL_STATUSES),
  sees_artisans: z
    .enum(["oui", "non"], { error: messages.candidateChoice })
    .transform((v) => v === "oui"),
  experience: choice(RECRUITMENT_EXPERIENCES),
  availability: choice(RECRUITMENT_AVAILABILITIES),
  source: choice(RECRUITMENT_SOURCES),
};
const step3 = {
  linkedin_url: linkedinUrl,
  motivation: z
    .string()
    .trim()
    .max(1000, { error: messages.tooLong })
    .transform((value) => value || null),
  consent: z.literal(true, { error: messages.candidateConsent }),
};
export const commercialApplicationSteps = [
  z.object(step1),
  z.object(step2),
  z.object(step3),
] as const;

/**
 * Candidature « Devenir commercial MENAO » (F-183, ADR 0380 et 0382), mêmes règles qu'en base
 * (`apply_as_commercial`) : identité, téléphone normalisé en +33…, secteur, quatre réponses
 * fermées, provenance, CV obligatoire (déjà rangé par process-upload), LinkedIn et motivation
 * facultatifs, accord explicite (conservation 2 ans).
 */
export const commercialApplicationSchema = z.object({
  ...step1,
  ...step2,
  ...step3,
  cv_path: z
    .string({ error: messages.candidateCv })
    .trim()
    .regex(CV_PATH, { error: messages.candidateCv }),
});
export type CommercialApplication = z.infer<typeof commercialApplicationSchema>;
