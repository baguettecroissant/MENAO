import { CHANTIER_STATUSES } from "@menao/core";
import { z } from "zod";

/**
 * Détail d'une demande vu par l'artisan (fonction artisan_request_detail, F-17) : coordonnées et
 * adresse exacte seulement une fois le rendez-vous fixé (décision C, ADR 0014). Partagé par le
 * site et l'application.
 */
export const requestDetailSchema = z.object({
  id: z.string(),
  status: z.enum(["envoyee", "acceptee", "refusee", "expiree", "annulee"]),
  created_at: z.string(),
  expires_at: z.string(),
  refusal_reason: z.string().nullable(),
  callback_mode: z.enum(["des_que_possible", "plage"]),
  callback_from: z.string().nullable(),
  callback_to: z.string().nullable(),
  message: z.string().nullable(),
  description: z.string(),
  summary: z.string().nullable(),
  // Demande reformulée par l'IA et budget approximatif (ADR 0163), absents des anciennes réponses.
  artisan_brief: z.string().nullable().catch(null),
  budget: z
    .enum(["moins_1000", "1000_5000", "5000_15000", "15000_50000", "plus_50000"])
    .nullable()
    .catch(null),
  trade: z.string().nullable(),
  // Demande venue de la zone élargie (ADR 0165).
  hors_zone: z.boolean().catch(false),
  lieu_type: z.enum(["appartement", "maison", "jardin", "entreprise"]).nullable(),
  surface: z.enum(["moins_10", "10_20", "20_50", "plus_50"]).nullable(),
  rooms: z.array(z.string()),
  work_types: z.array(z.string()),
  urgence: z.boolean(),
  date_mode: z.enum(["des_que_possible", "date", "inconnue"]),
  date_souhaitee: z.string().nullable(),
  ville_nom: z.string().nullable(),
  code_postal: z.string().nullable(),
  adresse: z.string().nullable(),
  lat: z.number().nullable(),
  lon: z.number().nullable(),
  photos: z.array(z.string()),
  client: z.object({
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
  }),
  chantier_id: z.string().nullable(),
});
export type RequestDetail = z.infer<typeof requestDetailSchema>;

/** Réponse de artisan_request_detail lue et contrôlée ; null si elle est absente ou inattendue. */
export function parseRequestDetail(data: unknown): RequestDetail | null {
  const parsed = requestDetailSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/**
 * Détail d'un chantier de l'artisan (fonction artisan_chantier_detail, F-18, F-22) : demande
 * d'origine, état, date de démarrage, rendez-vous et notes privées.
 */
export const artisanChantierDetailSchema = requestDetailSchema.extend({
  chantier: z.object({
    id: z.string(),
    status: z.enum(CHANTIER_STATUSES),
    title: z.string(),
    created_at: z.string(),
    start_at: z.string().nullable(),
    cancelled_at: z.string().nullable(),
  }),
  appointment: z
    .object({
      starts_at: z.string(),
      status: z.enum(["planifie", "annule"]),
      notes: z.string().nullable(),
    })
    .nullable(),
});
export type ArtisanChantierDetail = z.infer<typeof artisanChantierDetailSchema>;

/** Réponse de artisan_chantier_detail lue et contrôlée ; null si elle est absente ou inattendue. */
export function parseArtisanChantierDetail(data: unknown): ArtisanChantierDetail | null {
  const parsed = artisanChantierDetailSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
