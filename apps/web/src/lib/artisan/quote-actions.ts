"use server";

import { quoteLinesSchema } from "@menao/validation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { requireArtisan } from "./requests";

export type SaveQuoteResult = { ok: true } | { ok: false; error: string };

/** F-19 « Enregistrer » : remplace les lignes du brouillon ; totaux calculés en base. */
export async function saveQuoteDraft(chantierId: string, lines: unknown): Promise<SaveQuoteResult> {
  if (!z.uuid().safeParse(chantierId).success) return { ok: false, error: fr.errors.generic };
  const parsed = quoteLinesSchema.safeParse(lines);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? fr.errors.generic };
  const { supabase } = await requireArtisan();
  const { error } = await supabase.rpc("artisan_save_quote_draft", {
    p_chantier_id: chantierId,
    p_lines: parsed.data,
  });
  if (error)
    return { ok: false, error: error.code === "22023" ? error.message : fr.errors.generic };
  revalidatePath("/pro", "layout");
  return { ok: true };
}

export type PreviousLine = {
  type: "materiel" | "main_oeuvre" | "autre";
  designation: string;
  description: string | null;
  unit: string;
  unitPriceHtCents: number;
  vatRateBp: number;
};

/** « Rechercher l'article » : lignes déjà saisies par l'artisan (catalogue personnel, D10). */
export async function searchPreviousLines(query: string): Promise<PreviousLine[]> {
  const { supabase } = await requireArtisan();
  const { data } = await supabase.rpc("artisan_previous_lines", { p_query: query.slice(0, 100) });
  return (data ?? []).map((l) => ({
    type: l.type,
    designation: l.designation,
    description: l.description,
    unit: l.unit,
    unitPriceHtCents: l.unit_price_ht_cents,
    vatRateBp: l.vat_rate_bp,
  }));
}
