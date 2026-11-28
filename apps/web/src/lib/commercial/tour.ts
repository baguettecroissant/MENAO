import "server-only";
import { isTourOutcome, type TourOutcome } from "@menao/core";
import { z } from "zod";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

const stopSchema = z.object({
  position: z.number().int(),
  prospect_id: z.string(),
  nom: z.string(),
  ape_code: z.string().nullable(),
  adresse: z.string().nullable(),
  commune: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  rge: z.boolean(),
  tranche_effectif: z.string().nullable(),
  date_creation: z.string().nullable(),
  outcome: z
    .string()
    .nullable()
    .transform((v): TourOutcome | null => (isTourOutcome(v) ? v : null)),
  visited_at: z.string().nullable(),
  phone: z.string().nullable(),
  next_action_at: z.string().nullable(),
  accroche: z.string().nullable(),
});

/** Une tournée lue par `commercial_tour` (F-194, ADR 0394). */
export const tourSchema = z.object({
  id: z.string(),
  status: z.enum(["en_cours", "terminee"]),
  duree: z.string(),
  metiers: z.array(z.string()),
  distance_m: z.number().int(),
  created_at: z.string(),
  ended_at: z.string().nullable(),
  inscriptions: z.number().int(),
  prime_validation_centimes: z.number().int().nullable(),
  stops: z.array(stopSchema),
});
export type Tour = z.infer<typeof tourSchema>;
export type TourStop = Tour["stops"][number];

export async function getTour(supabase: Client, id: string): Promise<Tour | null> {
  const { data, error } = await supabase.rpc("commercial_tour", { p_id: id });
  if (error || !data) return null;
  const parsed = tourSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
