import {
  belowMarginAlert,
  lineCostCents,
  parseAiAgents,
  parseMoneyOverview,
  quoteMargin,
  parisToday,
  quoteStartDateError,
  type MoneyOverview,
  type PaymentKind,
  type VoiceLine,
} from "@menao/core";
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
  voiceDraftLines,
  type QuoteLineInput,
} from "@menao/validation";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { fr } from "@/i18n/fr";
import { supabase } from "./supabase";
import { myArtisanKey } from "./team";
import { isExampleId } from "@menao/core";
import { exampleQuoteDraft } from "./example-data";
import { loadQuoteCosts, type LineCost } from "./library";

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
    .eq("id", await myArtisanKey())
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
  /** « Dicter avec Manon » inclus dans la formule (ADR 0234, 0235). */
  conversation: boolean;
  /** Lignes d'un appel précédent avec Manon, pas encore reprises ni écartées. */
  voiceDraft: QuoteLineInput[] | null;
  /** En-tête de l'éditeur : titre du chantier et « Client · CP Ville » (null si inconnus). */
  chantierTitle: string | null;
  clientLine: string | null;
  /** Acompte de l'échéancier par défaut (%), pour l'acompte prévu dans les totaux. */
  defaultDeposit: number;
  /** Coût privé de chaque ligne, dans l'ordre (bibliothèque d'ouvrages, ADR 0294). */
  costs?: (LineCost | null)[];
  /** Seuil d'alerte de marge réglé par l'entreprise (null : pas d'alerte). */
  marginAlertBp?: number | null;
};

/** « Marc Fabre · 06800 Cagnes-sur-Mer » à partir du détail du chantier. */
export function quoteClientLine(detail: {
  client: { first_name: string | null; last_name: string | null };
  code_postal: string | null;
  ville_nom: string | null;
}): string | null {
  const name = [detail.client.first_name, detail.client.last_name].filter(Boolean).join(" ");
  const place = [detail.code_postal, detail.ville_nom].filter(Boolean).join(" ");
  return [name, place].filter(Boolean).join(" · ") || null;
}

/** Brouillon du devis du chantier (F-19), comme sur le site : lignes dans l'ordre. */
export async function loadQuoteDraft(chantierId: string): Promise<QuoteDraft | null> {
  if (isExampleId(chantierId)) return exampleQuoteDraft(chantierId);
  const [
    { data: draft, error },
    artisan,
    { data: appointment },
    { data: agents },
    { data: voiceDraft },
    { data: detail },
  ] = await Promise.all([
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
    supabase.rpc("my_ai_agents"),
    supabase
      .from("voice_quote_drafts")
      .select("lines")
      .eq("chantier_id", chantierId)
      .is("settled_at", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.rpc("artisan_chantier_detail", { p_chantier_id: chantierId }),
  ]);
  if (error || !artisan) return null;
  const pending = voiceDraftLines(voiceDraft?.lines);
  const chantier = parseArtisanChantierDetail(detail);
  const sorted = [...(draft?.quote_lines ?? [])].sort((a, b) => a.position - b.position);
  const { costs, alertBp } = await loadQuoteCosts(
    draft?.id ?? null,
    sorted.map((l) => l.position),
  );
  return {
    appointmentAt: appointment?.starts_at ?? null,
    costs,
    marginAlertBp: alertBp,
    lines: sorted.map((l) => ({
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
    conversation: parseAiAgents(agents).agents.conversationalQuote,
    voiceDraft: pending.length ? pending : null,
    chantierTitle: chantier?.chantier.title ?? null,
    clientLine: chantier ? quoteClientLine(chantier) : null,
    defaultDeposit: artisan.default_deposit_percent,
  };
}

// ---------------------------------------------------------------------------
// Devis avec Manon (ADR 0235)
// ---------------------------------------------------------------------------

/** Session de l'artisan, passée à la page intégrée de l'appel (jamais dans l'adresse). */
export async function voiceSessionToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Lignes enregistrées par Manon pendant cet appel : elles font foi à la fin de l'appel. */
export async function voiceQuoteDraftForCall(
  chantierId: string,
  callId: string,
): Promise<QuoteLineInput[]> {
  if (!callId || callId.length > 100) return [];
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
  await supabase.rpc("settle_voice_quote_drafts", { p_chantier_id: chantierId });
}

/**
 * F-19 « Enregistrer » : remplace les lignes du brouillon ; les totaux sont calculés en base.
 * `costs` : coût privé de chaque ligne (ADR 0294), enregistré à part, jamais lu par le client.
 */
export async function saveQuoteDraft(
  chantierId: string,
  lines: QuoteLineInput[],
  costs?: LineCost[],
): Promise<string | null> {
  const parsed = quoteLinesSchema.safeParse(lines);
  if (!parsed.success) return parsed.error.issues[0]?.message ?? fr.errors.generic;
  const { data: quoteId, error } = await supabase.rpc("artisan_save_quote_draft", {
    p_chantier_id: chantierId,
    p_lines: parsed.data,
  });
  if (error) return sqlError(error);
  if (quoteId && costs) {
    await supabase.rpc("artisan_save_quote_costs", {
      p_quote_id: quoteId,
      p_costs: costs.map((c, i) => ({ position: i + 1, ...c })),
    });
  }
  return null;
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
  /** Marge sous le seuil fixé par l'artisan (ADR 0294) : taux et seuil, sinon null. */
  lowMargin: { markupBp: number; alertBp: number } | null;
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
  // Alerte avant l'envoi (ADR 0294) : seulement si l'artisan a fixé un seuil.
  const { data: lines } = await supabase
    .from("quote_lines")
    .select("position, quantity_milli, total_ht_cents")
    .eq("quote_id", draft.id)
    .order("position");
  const { costs, alertBp } = await loadQuoteCosts(
    draft.id,
    (lines ?? []).map((l) => l.position),
  );
  const margin = quoteMargin(
    (lines ?? []).map((l, i) => ({
      totalHtCents: l.total_ht_cents,
      costCents: lineCostCents(costs[i]?.unitCostCents ?? null, l.quantity_milli),
    })),
  );
  const lowMargin =
    alertBp !== null && margin.markupBp !== null && belowMarginAlert(margin.markupBp, alertBp)
      ? { markupBp: margin.markupBp, alertBp }
      : null;
  return {
    quoteId: draft.id,
    lowMargin,
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
  /** Paiement au démarrage des travaux (F-146), 0 : aucun. */
  startPercent?: number;
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
    p_start_percent: input.startPercent ?? 0,
  });
  if (error) return { error: sqlError(error) };
  await supabase.functions.invoke("generate-pdf", { body: { quoteId } });
  return null;
}

// ---------------------------------------------------------------------------
// Suivi de l'argent (ADR 0237)
// ---------------------------------------------------------------------------

/** Suivi de l'artisan connecté ; null si illisible. */
export async function loadMoneyOverview(): Promise<MoneyOverview | null> {
  const { data, error } = await supabase.rpc("my_money_overview");
  return error ? null : parseMoneyOverview(data);
}

/** « Relancer le client » (ADR 0238) : message d'erreur, ou null si la relance est partie. */
export async function sendPaymentReminder(
  chantierId: string,
  kind: PaymentKind,
): Promise<string | null> {
  const { error } = await supabase.rpc("artisan_send_payment_reminder", {
    p_chantier_id: chantierId,
    p_kind: kind,
  });
  if (!error) return null;
  return error.code === "22023" || error.code === "42501" ? error.message : fr.errors.generic;
}

/** « Relances automatiques » (ADR 0238) : message d'erreur, ou null. */
export async function setAutoReminders(enabled: boolean): Promise<string | null> {
  const { error } = await supabase.rpc("set_payment_reminders_auto", { p_enabled: enabled });
  if (!error) return null;
  return error.code === "42501" ? error.message : fr.errors.generic;
}
