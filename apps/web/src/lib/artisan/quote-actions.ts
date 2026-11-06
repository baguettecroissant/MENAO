"use server";

import { parisToday, quoteStartDateError } from "@menao/core";
import {
  messages,
  quoteLinesSchema,
  sendQuoteSchema,
  type QuoteLineInput,
} from "@menao/validation";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { VoiceSession } from "@/components/assistant/voice-call";
import { fr } from "@/i18n/fr";
import { checkbox, text, type FormState } from "@/lib/auth/form";
import { requireArtisan } from "./requests";
import { voiceDraftLines } from "./voice-quote";

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

// ---------------------------------------------------------------------------
// Devis en conversation avec Camille (F-85, ADR 0234)
// ---------------------------------------------------------------------------

/** Appel avec Camille pour ce devis : jeton, contexte du chantier et assistante (voice-session). */
export async function prepareQuoteCall(chantierId: string): Promise<VoiceSession> {
  const t = fr.pro.quote.conversation;
  if (!z.uuid().safeParse(chantierId).success) return { error: fr.errors.generic };
  const { supabase } = await requireArtisan();
  const { data, error } = await supabase.functions.invoke("voice-session", {
    method: "POST",
    body: { usage: "devis", chantierId },
  });
  if (
    !error &&
    data?.status === "ok" &&
    typeof data.assistantId === "string" &&
    data.variables &&
    typeof data.variables === "object"
  ) {
    return {
      variables: data.variables as Record<string, string>,
      assistantId: data.assistantId,
    };
  }
  let status: string | undefined;
  try {
    const body = (await (error as { context?: Response } | null)?.context?.json?.()) as
      { status?: string } | undefined;
    status = body?.status;
  } catch {
    status = undefined;
  }
  return { error: t.errors[status ?? ""] ?? t.errors.generic ?? fr.errors.generic };
}

/** Lignes enregistrées par Camille pendant cet appel : elles font foi à la fin de l'appel. */
export async function voiceQuoteDraftForCall(
  chantierId: string,
  callId: string,
): Promise<QuoteLineInput[]> {
  if (!z.uuid().safeParse(chantierId).success || !callId || callId.length > 100) return [];
  const { supabase } = await requireArtisan();
  const { data } = await supabase
    .from("voice_quote_drafts")
    .select("lines")
    .eq("chantier_id", chantierId)
    .eq("call_id", callId)
    .maybeSingle();
  return voiceDraftLines(data?.lines);
}

/** Brouillons de Camille repris dans le devis enregistré, ou écartés par l'artisan. */
export async function settleVoiceQuoteDrafts(chantierId: string): Promise<void> {
  if (!z.uuid().safeParse(chantierId).success) return;
  const { supabase } = await requireArtisan();
  await supabase.rpc("settle_voice_quote_drafts", { p_chantier_id: chantierId });
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
