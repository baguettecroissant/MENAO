import { parseMyMenaoScore, type MyMenaoScore } from "@menao/validation";
import { supabase } from "./supabase";

/** Score MENAO de l'artisan connecté, critère par critère (ADR 0155), comme sur le site ; ou null. */
export async function loadMenaoScore(): Promise<MyMenaoScore | null> {
  const { data, error } = await supabase.rpc("my_menao_score");
  return error ? null : parseMyMenaoScore(data);
}

/** « Mon planning est à jour » : confirmation sans modification (« Mes disponibilités »). */
export async function confirmPlanning(): Promise<boolean> {
  const { error } = await supabase.rpc("artisan_confirm_planning");
  return !error;
}
