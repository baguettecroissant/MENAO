import { PRESENTATION_MIN_LENGTH, documentIsValid } from "@menao/core";
import { z } from "zod";
import { messages } from "./messages";

export const UPLOAD_PURPOSES = ["document", "avatar", "portfolio", "logo"] as const;
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

const text = (max: number) =>
  z.string({ error: messages.required }).trim().min(1, { error: messages.required }).max(max, {
    error: messages.tooLong,
  });

const isoDate = z.iso.date({ error: messages.dateInvalid });

/** Métadonnées saisies avec chaque document (F-14 étape 4). */
export const documentMetadataSchema = (today: Date = new Date()) => {
  const day = today.toISOString().slice(0, 10);
  const notPast = isoDate.refine((d) => d >= day, { error: messages.dateExpired });
  return z.discriminatedUnion("type", [
    z.object({
      type: z.literal("kbis"),
      dateEmission: isoDate
        .refine((d) => d <= day, { error: messages.dateInFuture })
        .refine(
          (d) =>
            documentIsValid(
              "kbis",
              { status: "en_attente", dateEmission: d, dateFin: null },
              today,
            ),
          {
            error: messages.kbisTooOld,
          },
        ),
    }),
    z.object({
      type: z.literal("decennale"),
      assureur: text(120),
      numero: text(60),
      dateFin: notPast,
      couverture: text(200),
      // Métiers de l'artisan couverts par l'attestation, selon lui (ADR 0116).
      coveredTrades: z
        .array(z.string().regex(/^[a-z0-9-]{1,60}$/))
        .max(30)
        .default([])
        .transform((codes) => [...new Set(codes)]),
    }),
    z.object({
      type: z.literal("rc_pro"),
      assureur: text(120),
      numero: text(60),
      dateFin: notPast,
    }),
    z.object({
      type: z.literal("urssaf"),
      dateEmission: isoDate
        .refine((d) => d <= day, { error: messages.dateInFuture })
        .refine(
          (d) =>
            documentIsValid(
              "urssaf",
              { status: "en_attente", dateEmission: d, dateFin: null },
              today,
            ),
          { error: messages.urssafTooOld },
        ),
      // Code de sécurité de l'attestation, vérifié par l'équipe sur le site de l'URSSAF.
      numero: text(60),
    }),
    z.object({
      type: z.literal("identite"),
      dateFin: z
        .union([z.literal(""), notPast])
        .optional()
        .transform((v) => (v === "" ? undefined : v)),
    }),
  ]);
};
export type DocumentMetadata = z.output<ReturnType<typeof documentMetadataSchema>>;

export const presentationSchema = z
  .string()
  .trim()
  .min(PRESENTATION_MIN_LENGTH, { error: messages.presentationTooShort })
  .max(2000, { error: messages.tooLong });

/**
 * Motifs de refus d'un document, choisis dans une liste par l'équipe (ADR 0120). Le code est
 * gardé en base ; l'artisan reçoit le libellé du motif, suivi de la précision s'il y en a une.
 */
export const DOCUMENT_REFUSAL_CODES = [
  "illisible",
  "incomplet",
  "expire",
  "mauvais_document",
  "nom_different",
  "siret_different",
  "dates_differentes",
  "couverture_insuffisante",
  "code_securite_invalide",
  "autre",
] as const;
export type DocumentRefusalCode = (typeof DOCUMENT_REFUSAL_CODES)[number];

/** Refus d'un document : motif de la liste ; précision obligatoire pour « autre ». */
export const documentRefusalSchema = z
  .object({
    code: z.enum(DOCUMENT_REFUSAL_CODES, { error: messages.refusalCode }),
    detail: z
      .string()
      .trim()
      .max(300, { error: messages.tooLong })
      .optional()
      .transform((v) => v || undefined),
  })
  .refine((r) => r.code !== "autre" || r.detail !== undefined, {
    error: messages.refusalDetail,
    path: ["detail"],
  });
export type DocumentRefusal = z.output<typeof documentRefusalSchema>;
