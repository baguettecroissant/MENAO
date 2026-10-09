import { PRESENTATION_MIN_LENGTH, documentIsValid } from "@menao/core";
import { z } from "zod";
import { messages } from "./messages";

export const UPLOAD_PURPOSES = ["document", "avatar", "portfolio"] as const;
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
    }),
    z.object({
      type: z.literal("rc_pro"),
      assureur: text(120),
      numero: text(60),
      dateFin: notPast,
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
