import "server-only";
import { RAISE_UNDO_HOURS } from "@menao/core";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type UndoableRaise = {
  id: string;
  rateBp: number;
  works: number;
  supplies: number;
  /** Fin de la période d'annulation (ISO). */
  until: string;
};

/**
 * Dernière hausse de prix encore annulable (F-149, ADR 0312) : la plus récente, ni annulée ni
 * vieille de plus de 24 h (RLS : patron et chef d'équipe).
 */
export async function loadUndoableRaise(supabase: Client): Promise<UndoableRaise | null> {
  const { data } = await supabase
    .from("library_price_raises")
    .select("id, rate_bp, works_count, supplies_count, created_at, undone_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data || data.undone_at) return null;
  const until = new Date(new Date(data.created_at).getTime() + RAISE_UNDO_HOURS * 3_600_000);
  if (until.getTime() <= Date.now()) return null;
  return {
    id: data.id,
    rateBp: data.rate_bp,
    works: data.works_count,
    supplies: data.supplies_count,
    until: until.toISOString(),
  };
}
