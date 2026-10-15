import type { Database } from "@menao/db";
import { supabase } from "./supabase";

export type CharterScore = Database["public"]["Functions"]["my_charter_score"]["Returns"][number];

/** Score MENAO de l'artisan connecté, critère par critère (ADR 0105), comme sur le site ; ou null. */
export async function loadCharterScore(): Promise<CharterScore | null> {
  const { data, error } = await supabase.rpc("my_charter_score");
  return error ? null : (data?.[0] ?? null);
}

/** « Mon planning est à jour » : confirmation sans modification, critère du score (ADR 0105). */
export async function confirmPlanning(): Promise<boolean> {
  const { error } = await supabase.rpc("artisan_confirm_planning");
  return !error;
}
