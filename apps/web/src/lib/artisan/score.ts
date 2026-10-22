import "server-only";
import { parseMyMenaoScore } from "@menao/validation";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/** Score MENAO de l'artisan connecté, critère par critère (ADR 0155), ou null. */
export async function myMenaoScore(supabase: Client) {
  const { data } = await supabase.rpc("my_menao_score");
  return parseMyMenaoScore(data);
}
