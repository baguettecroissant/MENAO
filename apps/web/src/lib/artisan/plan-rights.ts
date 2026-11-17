import { parseAiAgents, type AiAgentsRights } from "@menao/core";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Droits de la formule de l'artisan connecté (ADR 0231, 0363) : ce que la base accorde vraiment
 * (elle refuse de toute façon ce qui n'est pas compris). Sans formule en cours : ceux de Base.
 */
export async function planRights(supabase: Client): Promise<AiAgentsRights> {
  const { data } = await supabase.rpc("my_ai_agents");
  return parseAiAgents(data).agents;
}
