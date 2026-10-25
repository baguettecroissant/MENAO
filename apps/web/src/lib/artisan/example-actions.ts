"use server";

import { revalidatePath } from "next/cache";
import { requireArtisan } from "./requests";

/** « Masquer les exemples » (ADR 0184) : choix gardé sur la fiche, le même dans l'application. */
export async function hideSpaceExamples(): Promise<{ ok: boolean }> {
  const { supabase } = await requireArtisan();
  const { error } = await supabase.rpc("hide_space_examples");
  if (error) return { ok: false };
  revalidatePath("/pro", "layout");
  return { ok: true };
}
