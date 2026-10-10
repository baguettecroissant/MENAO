import "server-only";
import { CHANTIER_STATUSES } from "@menao/core";
import { z } from "zod";
import type { createClient } from "@/lib/supabase/server";
import { requestDetailSchema } from "./requests";

/** Détail d'un chantier de l'artisan (F-18) : demande d'origine, état, rendez-vous et notes privées. */
const chantierDetailSchema = requestDetailSchema.extend({
  chantier: z.object({
    id: z.string(),
    status: z.enum(CHANTIER_STATUSES),
    title: z.string(),
    created_at: z.string(),
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
export type ChantierDetail = z.infer<typeof chantierDetailSchema>;

export async function getChantierDetail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  chantierId: string,
): Promise<ChantierDetail | null> {
  const { data } = await supabase.rpc("artisan_chantier_detail", { p_chantier_id: chantierId });
  const parsed = chantierDetailSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
