import "server-only";
import { z } from "zod";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

const n = z.number().int().nonnegative();
const entry = z.object({ code: z.string(), label: z.string(), active: z.boolean() });

/** Listes de référence complètes, avec leur usage (F-57, ADR 0052 ; admin_references). */
const referencesSchema = z.object({
  metiers: z.array(entry.extend({ artisans: n, demandes: n })),
  travaux: z.array(entry.extend({ metier: z.string(), artisans: n, demandes: n })),
  pieces: z.array(entry.extend({ demandes: n })),
});
export type References = z.infer<typeof referencesSchema>;

export async function getReferences(supabase: Client): Promise<References | null> {
  const { data } = await supabase.rpc("admin_references");
  const parsed = referencesSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
