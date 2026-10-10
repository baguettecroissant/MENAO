"use server";

import { parisToday, quoteStartDateError } from "@menao/core";
import { messages, quoteLinesSchema, sendQuoteSchema } from "@menao/validation";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { checkbox, text, type FormState } from "@/lib/auth/form";
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

/** « Sauvegarder cet enregistrement » (F-19) : le texte de la dictée, pour générer plus tard. */
export async function saveDictation(
  chantierId: string,
  transcript: string,
): Promise<SaveQuoteResult> {
  if (!z.uuid().safeParse(chantierId).success) return { ok: false, error: fr.errors.generic };
  const { supabase } = await requireArtisan();
  const { error } = await supabase.rpc("artisan_save_dictation", {
    p_chantier_id: chantierId,
    p_transcript: transcript.slice(0, 5000),
  });
  if (error)
    return { ok: false, error: error.code === "22023" ? error.message : fr.errors.generic };
  return { ok: true };
}

export async function deleteDictation(chantierId: string): Promise<void> {
  if (!z.uuid().safeParse(chantierId).success) return;
  const { supabase } = await requireArtisan();
  await supabase.rpc("artisan_delete_dictation", { p_chantier_id: chantierId });
}

const START_DATE_ERRORS = {
  invalide: messages.startDateRequired,
  passee: messages.startDatePast,
  trop_loin: messages.startDateTooFar,
} as const;

/**
 * F-21 « Envoyer le devis » : modalités contrôlées (Zod, @menao/core), puis la base attribue le
 * numéro et fige le devis. Le PDF envoyé est produit aussitôt, pour être conservé tel quel.
 */
export async function sendQuote(
  quoteId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(quoteId).success) return { error: fr.errors.generic };
  const values = {
    schedule: text(formData, "schedule") ?? "",
    depositPercent: text(formData, "depositPercent") ?? "",
    startDate: text(formData, "startDate") ?? "",
    durationDays: text(formData, "durationDays") ?? "",
  };
  const parsed = sendQuoteSchema.safeParse({
    ...values,
    saveDefault: checkbox(formData, "saveDefault"),
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  const dateError = quoteStartDateError(parsed.data.startDate, parisToday());
  if (dateError) return { fieldErrors: { startDate: [START_DATE_ERRORS[dateError]] }, values };

  const { supabase } = await requireArtisan();
  const { error } = await supabase.rpc("artisan_send_quote", {
    p_quote_id: quoteId,
    p_deposit_percent: parsed.data.depositPercent,
    p_start_date: parsed.data.startDate,
    p_duration_days: parsed.data.durationDays,
    p_save_default: parsed.data.saveDefault,
  });
  if (error) {
    return { error: error.code === "22023" ? error.message : fr.errors.generic, values };
  }
  await supabase.functions.invoke("generate-pdf", { body: { quoteId } });
  revalidatePath("/pro", "layout");
  redirect(`/pro/devis?onglet=envoyes&envoye=${quoteId}` as Route);
}
