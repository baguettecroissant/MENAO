import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/** Score MENAO de l'artisan connecté, critère par critère (ADR 0105), ou null. */
export async function myCharterScore(supabase: Client) {
  const { data } = await supabase.rpc("my_charter_score");
  return data?.[0] ?? null;
}

export type MyCharterScore = NonNullable<Awaited<ReturnType<typeof myCharterScore>>>;
