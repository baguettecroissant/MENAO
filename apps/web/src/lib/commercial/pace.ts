import "server-only";
import { z } from "zod";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

const n = z.number().int().nonnegative();

/** Une semaine d'un conseiller (lundi), ses validés et son objectif (null : pas encore là). */
export const paceWeekSchema = z.object({ semaine: z.string(), valides: n, objectif: n.nullable() });

/** Réglages du rythme lus par le conseiller (`commercial_pace`, ADR 0381). */
export const paceSettingsSchema = z.object({
  objectif_valides: n.nullable(),
  debut: z.string().nullable(),
  fin: z.string().nullable(),
  rythme_semaine: n,
  rythme_demarrage: n,
  semaines_demarrage: n,
  repere_visites_jour: n,
  classement_visible: z.boolean(),
});

const commercialPaceSchema = z.object({
  today: z.string(),
  settings: paceSettingsSchema,
  me: z.object({
    debut: z.string(),
    rythme_semaine: n.nullable(),
    weeks: z.array(paceWeekSchema),
    en_verification: n,
  }),
  equipe: z.object({ valides: n }),
  classement: z
    .array(z.object({ nom: z.string(), moi: z.boolean(), valides: n, semaines: n }))
    .nullable(),
});
export type CommercialPace = z.infer<typeof commercialPaceSchema>;

/**
 * « Ma semaine », objectif commun et classement du conseiller connecté (F-184, ADR 0381) ; null si
 * la fonction échoue (la page garde le reste de ses résultats).
 */
export async function getCommercialPace(supabase: Client): Promise<CommercialPace | null> {
  const { data, error } = await supabase.rpc("commercial_pace");
  if (error) return null;
  const parsed = commercialPaceSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
