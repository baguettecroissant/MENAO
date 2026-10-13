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
  trade: z.string().nullable(),
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
