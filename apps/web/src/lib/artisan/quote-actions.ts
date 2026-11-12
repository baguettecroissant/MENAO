"use server";

import {
  type LibraryQuoteLine,
  parisToday,
  quoteStartDateError,
  workQuoteLines,
} from "@menao/core";
import {
  messages,
  quoteLinesSchema,
  sendQuoteSchema,
  voiceDraftLines,
  type QuoteLineInput,
} from "@menao/validation";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { VoiceSession } from "@/components/assistant/voice-call";
import { fr } from "@/i18n/fr";
import { checkbox, text, type FormState } from "@/lib/auth/form";
import { loadLibrary } from "./library";
import { requireArtisan } from "./requests";
import { requireTeamPermission } from "./space";

export type SaveQuoteResult = { ok: true } | { ok: false; error: string };

const lineCosts = z
  .array(
    z.object({
      unitCostCents: z.number().int().min(0).max(100_000_000).nullable(),
      workId: z.uuid().nullable(),
    }),
  )
  .max(200);

/**
 * F-19 « Enregistrer » : remplace les lignes du brouillon ; totaux calculés en base. `costs` :
 * coût unitaire privé de chaque ligne (bibliothèque d'ouvrages, ADR 0294), dans le même ordre ;
 * enregistré à part, jamais lisible par le client.
 */
export async function saveQuoteDraft(
  chantierId: string,
  lines: unknown,
  costs?: unknown,
): Promise<SaveQuoteResult> {
  if (!z.uuid().safeParse(chantierId).success) return { ok: false, error: fr.errors.generic };
  const parsed = quoteLinesSchema.safeParse(lines);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? fr.errors.generic };
  const parsedCosts = costs === undefined ? null : lineCosts.safeParse(costs);
  const { supabase } = await requireArtisan();
  const { data: quoteId, error } = await supabase.rpc("artisan_save_quote_draft", {
    p_chantier_id: chantierId,
    p_lines: parsed.data,
  });
  if (error)
    return { ok: false, error: error.code === "22023" ? error.message : fr.errors.generic };
  if (quoteId && parsedCosts?.success) {
    await supabase.rpc("artisan_save_quote_costs", {
      p_quote_id: quoteId,
      p_costs: parsedCosts.data.map((c, i) => ({ position: i + 1, ...c })),
    });
  }
  revalidatePath("/pro", "layout");
  return { ok: true };
}

export type LibrarySearchResult = {
  workId: string;
  designation: string;
  unit: string;
  priceCents: number;
  markupBp: number | null;
  detailed: boolean;
  lines: LibraryQuoteLine[];
};

const plain = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/**
 * « Rechercher l'article » (ADR 0294) : d'abord les ouvrages de la bibliothèque, avec leur prix,
 * leur marge et leurs lignes de devis (coût privé compris). Patron et chef d'équipe.
 */
export async function searchLibraryWorks(query: string): Promise<LibrarySearchResult[]> {
  const { supabase } = await requireTeamPermission("money");
  const library = await loadLibrary(supabase, { seed: false });
  const words = plain(query.slice(0, 100)).split(/\s+/).filter(Boolean);
  const labels = {
    supplies: fr.pro.quote.library.suppliesSuffix,
    labor: fr.pro.quote.library.laborSuffix,
  };
  return library.works
    .filter((w) => words.every((word) => plain(w.designation).includes(word)))
    .flatMap((w) => {
      const lines = workQuoteLines(
        {
          id: w.id,
          designation: w.designation,
          description: w.description,
          unit: w.unit,
          lineType: w.line_type,
          vatRateBp: w.vat_rate_bp,
          detailed: w.detailed,
        },
        w.pricing,
        labels,
      );
      return lines.length && w.pricing.priceCents !== null
        ? [
            {
              workId: w.id,
              designation: w.designation,
              unit: w.unit,
              priceCents: w.pricing.priceCents,
              markupBp: w.pricing.markupBp,
              detailed: lines.length > 1,
              lines,
            },
          ]
        : [];
    })
    .slice(0, 6);
}

// ---------------------------------------------------------------------------
// Devis en conversation avec Manon (F-85, ADR 0234)
// ---------------------------------------------------------------------------

/** Appel avec Manon pour ce devis : jeton, contexte du chantier et assistante (voice-session). */
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

/** Lignes enregistrées par Manon pendant cet appel : elles font foi à la fin de l'appel. */
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

/** Brouillons de Manon repris dans le devis enregistré, ou écartés par l'artisan. */
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
