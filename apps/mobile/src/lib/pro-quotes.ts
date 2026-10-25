import { parisToday, quoteStartDateError, type VoiceLine } from "@menao/core";
import {
  quoteDocumentModel,
  quotePdfData,
  type QuoteDocument,
  type QuoteDocumentModel,
  type QuotePdfData,
} from "@menao/documents";
import {
  messages,
  parseArtisanChantierDetail,
  quoteLinesSchema,
  type QuoteLineInput,
} from "@menao/validation";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { fr } from "@/i18n/fr";
import { supabase } from "./supabase";
import { isExampleId } from "@menao/core";
import { exampleQuoteDraft } from "./example-data";

/** Erreur SQL : message des règles métier (code 22023), sinon message générique. */
const sqlError = (error: { code?: string; message: string }) =>
  error.code === "22023" ? error.message : fr.errors.generic;

async function artisanRow() {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) return null;
  const { data } = await supabase
    .from("artisans")
    .select("id, assujetti_tva, default_deposit_percent")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export type QuoteDraft = {
  lines: QuoteLineInput[];
  /** Rendez-vous planifié (bandeau « Envoyer un devis »). */
  appointmentAt: string | null;
  /** Un brouillon existe déjà en base. */
  saved: boolean;
  assujettiTva: boolean;
};

/** Brouillon du devis du chantier (F-19), comme sur le site : lignes dans l'ordre. */
export async function loadQuoteDraft(chantierId: string): Promise<QuoteDraft | null> {
  if (isExampleId(chantierId)) return exampleQuoteDraft(chantierId);
  const [{ data: draft, error }, artisan, { data: appointment }] = await Promise.all([
    supabase
      .from("quotes")
      .select(
        "id, quote_lines(position, type, designation, description, quantity_milli, unit, unit_price_ht_cents, vat_rate_bp)",
      )
      .eq("chantier_id", chantierId)
      .eq("status", "brouillon")
      .maybeSingle(),
    artisanRow(),
    supabase
      .from("appointments")
      .select("starts_at")
      .eq("chantier_id", chantierId)
      .eq("status", "planifie")
      .maybeSingle(),
  ]);
  if (error || !artisan) return null;
  return {
    appointmentAt: appointment?.starts_at ?? null,
    lines: [...(draft?.quote_lines ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((l) => ({
        type: l.type,
        designation: l.designation,
        description: l.description ?? "",
        quantityMilli: l.quantity_milli,
        unit: l.unit,
        unitPriceHtCents: l.unit_price_ht_cents,
        vatRateBp: l.vat_rate_bp,
      })),
    saved: Boolean(draft),
    assujettiTva: artisan.assujetti_tva ?? true,
  };
}

/** F-19 « Enregistrer » : remplace les lignes du brouillon ; les totaux sont calculés en base. */
export async function saveQuoteDraft(
  chantierId: string,
  lines: QuoteLineInput[],
): Promise<string | null> {
  const parsed = quoteLinesSchema.safeParse(lines);
  if (!parsed.success) return parsed.error.issues[0]?.message ?? fr.errors.generic;
  const { error } = await supabase.rpc("artisan_save_quote_draft", {
    p_chantier_id: chantierId,
    p_lines: parsed.data,
  });
  return error ? sqlError(error) : null;
}

/** « Rechercher l'article » : lignes déjà saisies par l'artisan (catalogue personnel, D10). */
export async function searchPreviousLines(query: string): Promise<QuoteLineInput[]> {
  const { data } = await supabase.rpc("artisan_previous_lines", { p_query: query.slice(0, 100) });
  return (data ?? []).map((l) => ({
    type: l.type,
    designation: l.designation,
    description: l.description ?? "",
    quantityMilli: 1000,
    unit: l.unit,
    unitPriceHtCents: l.unit_price_ht_cents,
    vatRateBp: l.vat_rate_bp,
  }));
}

/** Texte d'une dictée sauvegardée pour ce chantier (F-19), comme sur le site (RLS : l'artisan). */
export async function loadSavedDictation(chantierId: string): Promise<string | null> {
  if (isExampleId(chantierId)) return null;
  const { data } = await supabase
    .from("quote_dictations")
    .select("transcript")
    .eq("chantier_id", chantierId)
    .maybeSingle();
  return data?.transcript ?? null;
}

/** « Sauvegarder cet enregistrement » (F-19) : le texte de la dictée, pour générer plus tard. */
export async function saveDictation(
  chantierId: string,
  transcript: string,
): Promise<string | null> {
  const { error } = await supabase.rpc("artisan_save_dictation", {
    p_chantier_id: chantierId,
    p_transcript: transcript.slice(0, 5000),
  });
  return error ? sqlError(error) : null;
}

/**
 * Dictée intelligente (F-19) : le texte dicté devient des lignes proposées par quote-from-voice,
 * à vérifier avant d'enregistrer.
 */
export async function linesFromDictation(
  chantierId: string,
  transcript: string,
  defaultVatBp: number,
): Promise<{ lines: VoiceLine[] } | { error: string }> {
  const { data, error } = await supabase.functions.invoke<{ status: string; lines?: VoiceLine[] }>(
    "quote-from-voice",
    { body: { chantierId, transcript: transcript.slice(0, 5000), defaultVatBp } },
  );
  const payload =
    error instanceof FunctionsHttpError
      ? ((await error.context.json().catch(() => null)) as typeof data)
      : error
        ? null
        : data;
  const t = fr.proQuote.dictation;
  if (payload?.status === "ok" && payload.lines?.length) return { lines: payload.lines };
  if (payload?.status === "empty" || payload?.status === "ok") return { error: t.empty };
  if (payload?.status === "rate_limited") return { error: t.rateLimited };
  return { error: t.unavailable };
}

export type QuoteSendContext = {
  quoteId: string;
  totalTtcCents: number;
  defaultDeposit: number;
  data: QuotePdfData;
  model: QuoteDocumentModel;
  /** Assurance décennale complète et non échue : exigée par la base à l'envoi (F-20). */
  insured: boolean;
  /** Rattachement au chantier (F-21) : client et rappel du chantier. */
  client: { firstName: string | null; name: string; email: string | null; phone: string | null };
  chantier: { title: string; summary: string | null };
  /** Rendez-vous planifié (bandeau « Envoyer un devis »). */
  appointmentAt: string | null;
};

/** Brouillon à prévisualiser puis envoyer (F-20, F-21) ; null s'il n'y a pas encore de ligne. */
export async function loadQuoteSendContext(chantierId: string): Promise<QuoteSendContext | null> {
  if (isExampleId(chantierId)) return null;
  const [{ data: draft }, artisan, { data: detail }] = await Promise.all([
    supabase
      .from("quotes")
      .select("id, total_ttc_cents")
      .eq("chantier_id", chantierId)
      .eq("status", "brouillon")
      .maybeSingle(),
    artisanRow(),
    supabase.rpc("artisan_chantier_detail", { p_chantier_id: chantierId }),
  ]);
  const c = parseArtisanChantierDetail(detail);
  if (!draft || !artisan || !c) return null;
  const { data: document } = await supabase.rpc("quote_document", { p_quote_id: draft.id });
  if (!document) return null;
  const data = quotePdfData(document as unknown as QuoteDocument);
  if (data.lines.length === 0) return null;
  const insurance = data.issuer.insurance;
  return {
    quoteId: draft.id,
    totalTtcCents: draft.total_ttc_cents,
    defaultDeposit: artisan.default_deposit_percent,
    data,
    model: quoteDocumentModel(data),
    insured: Boolean(insurance?.insurer && insurance.policy && insurance.coverage),
    client: {
      firstName: c.client.first_name,
      name: [c.client.first_name, c.client.last_name].filter(Boolean).join(" "),
      email: c.client.email,
      phone: c.client.phone,
    },
    chantier: { title: c.chantier.title, summary: c.summary },
    appointmentAt: c.appointment?.status === "planifie" ? c.appointment.starts_at : null,
  };
}

export type SendQuoteInput = {
  depositPercent: number;
  saveDefault: boolean;
  startDate: string;
  durationDays: number;
};

/**
 * F-21 « Envoyer le devis » : modalités contrôlées, puis la base attribue le numéro et fige le
 * devis ; le PDF envoyé est produit aussitôt, pour être conservé tel quel. Renvoie l'erreur à
 * afficher sur la date, ou une erreur générale.
 */
export async function sendQuote(
  quoteId: string,
  input: SendQuoteInput,
): Promise<{ startDate: string } | { error: string } | null> {
  const dateError = quoteStartDateError(input.startDate, parisToday());
  if (dateError) {
    return {
      startDate:
        dateError === "passee"
          ? messages.startDatePast
          : dateError === "trop_loin"
            ? messages.startDateTooFar
            : messages.startDateRequired,
    };
  }
  const { error } = await supabase.rpc("artisan_send_quote", {
    p_quote_id: quoteId,
    p_deposit_percent: input.depositPercent,
    p_start_date: input.startDate,
    p_duration_days: input.durationDays,
    p_save_default: input.saveDefault,
  });
  if (error) return { error: sqlError(error) };
  await supabase.functions.invoke("generate-pdf", { body: { quoteId } });
  return null;
}
