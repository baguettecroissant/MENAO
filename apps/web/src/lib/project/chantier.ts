import "server-only";
import { inWorkOrder } from "@menao/core";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type ChantierProject = { id: string; tradeCode: string | null; trade: string };

/**
 * Projets d'un chantier à plusieurs métiers (ADR 0167, 0168), projet principal et lots, dans
 * l'ordre habituel des travaux. Ceux du particulier connecté seulement (RLS) ; null si le projet
 * est introuvable.
 */
export async function getChantierProjects(
  supabase: Client,
  projectId: string,
): Promise<{ rootId: string; projects: ChantierProject[] } | null> {
  const { data: project } = await supabase
    .from("projects")
    .select("id, parent_project_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return null;
  const rootId = project.parent_project_id ?? project.id;
  const { data } = await supabase
    .from("projects")
    .select("id, trade_code, trades(label)")
    .or(`id.eq.${rootId},parent_project_id.eq.${rootId}`)
    .order("created_at");
  const projects = (data ?? []).map((p) => ({
    id: p.id,
    tradeCode: p.trade_code,
    trade: p.trades?.label ?? "",
  }));
  return { rootId, projects: inWorkOrder(projects, (p) => p.tradeCode) };
}
