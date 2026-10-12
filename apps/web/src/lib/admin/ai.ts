import "server-only";
import { z } from "zod";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/** Périodes du suivi de l'IA, en jours (ADR 0052). */
export const AI_PERIODS = ["1", "7", "30"] as const;
export type AiPeriod = (typeof AI_PERIODS)[number];

export function parseAiPeriod(value: unknown): AiPeriod {
  return typeof value === "string" && (AI_PERIODS as readonly string[]).includes(value)
    ? (value as AiPeriod)
    : "7";
}

const n = z.number().int().nonnegative();

/** Synthèse des appels aux modèles (admin_ai_summary), sans donnée personnelle. */
const aiSummarySchema = z.object({
  jours: n,
  fonctions: z.array(
    z.object({
      fonction: z.string(),
      appels: n,
      ok: n,
      peu_sur: n,
      invalide: n,
      refus: n,
      erreur: n,
      latence_mediane: n.nullable(),
      latence_p95: n.nullable(),
      jetons_entree: n,
      jetons_sortie: n,
      secondes_audio: n,
    }),
  ),
  modeles: z.array(
    z.object({
      fonction: z.string(),
      modele: z.string(),
      appels: n,
      echecs: n,
      latence_mediane: n.nullable(),
    }),
  ),
  par_jour: z.array(z.object({ jour: z.string(), appels: n, echecs: n })),
  echecs_recents: z.array(
    z.object({
      cree_le: z.string(),
      fonction: z.string(),
      modele: z.string(),
      resultat: z.string(),
      latence: n,
      project_id: z.string().nullable(),
    }),
  ),
});
export type AiSummary = z.infer<typeof aiSummarySchema>;

export async function getAiSummary(supabase: Client, period: AiPeriod): Promise<AiSummary | null> {
  const { data } = await supabase.rpc("admin_ai_summary", { p_days: Number(period) });
  const parsed = aiSummarySchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
