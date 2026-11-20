import "server-only";
import { paceTeamAlerts } from "@menao/core";
import { z } from "zod";
import { paceSettingsSchema, paceWeekSchema } from "@/lib/commercial/pace";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

const n = z.number().int().nonnegative();

const adminPaceSchema = z.object({
  today: z.string(),
  settings: paceSettingsSchema.extend({ email_lundi: z.boolean(), alerte_retard: z.boolean() }),
  conseillers: z.array(
    z.object({
      id: z.string(),
      nom: z.string(),
      zone: z.array(z.string()),
      debut: z.string(),
      rythme_semaine: n.nullable(),
      rythme_raison: z.string().nullable(),
      weeks: z.array(paceWeekSchema),
      dernier_valide: z.string().nullable(),
    }),
  ),
});
export type AdminPace = z.infer<typeof adminPaceSchema>;
export type AdminPaceCommercial = AdminPace["conseillers"][number];

/** Onglet Rythme du back-office (F-184, ADR 0381) : réglages et conseillers actifs ; null en cas d'échec. */
export async function getAdminPace(supabase: Client): Promise<AdminPace | null> {
  const { data, error } = await supabase.rpc("admin_commercial_pace");
  if (error) return null;
  const parsed = adminPaceSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/** Conseillers en « point à prévoir » pour la file « À traiter » (0 si l'alerte est coupée). */
export async function getPaceAlerts(supabase: Client): Promise<number> {
  const pace = await getAdminPace(supabase);
  if (!pace) return 0;
  return paceTeamAlerts(
    pace.conseillers.map((c) => c.weeks),
    pace.today,
    pace.settings.alerte_retard,
  );
}
