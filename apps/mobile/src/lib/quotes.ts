import {
  LEGAL_DOCUMENT_VERSIONS,
  type QuoteRefusalReason,
  type SignatureConsent,
} from "@menao/core";
import {
  quoteDocumentModel,
  quotePdfData,
  type QuoteDocument,
  type QuoteDocumentModel,
  type QuotePdfData,
} from "@menao/documents";
import type { Database } from "@menao/db";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { fr } from "@/i18n/fr";
import { env } from "./env";
import { supabase } from "./supabase";

type Tables = Database["public"]["Tables"];
export type QuoteStatus = Tables["quotes"]["Row"]["status"];
type PaymentStatus = Tables["payments"]["Row"]["status"];

export type ClientQuote = {
  id: string;
  status: QuoteStatus;
  validUntil: string | null;
  clientMessage: string | null;
  signedAt: string | null;
  data: QuotePdfData;
  model: QuoteDocumentModel;
  /** Nom commercial de l'artisan, sinon sa raison sociale. */
  artisan: string;
  logoUrl: string | null;
  deposit: { status: PaymentStatus; amountCents: number; paidAt: string | null } | null;
  depositInvoice: { id: string; numero: string } | null;
  /** Nouvelle version, si ce devis a été remplacé. */
  newerId: string | null;
};

/**
 * Devis reçu par le client (F-21), comme sur le site : contenu figé à l'envoi, acompte et facture
 * d'acompte. quote_document ne renvoie rien aux autres comptes.
 */
export async function loadQuote(id: string): Promise<ClientQuote | null> {
  const [{ data: document }, { data: quote }, { data: deposit }, { data: invoice }] =
    await Promise.all([
      supabase.rpc("quote_document", { p_quote_id: id }),
      supabase
        .from("quotes")
        .select("id, status, valid_until, client_message, signed_at")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("payments")
        .select("status, amount_cents, paid_at")
        .eq("quote_id", id)
        .eq("kind", "acompte")
        .in("status", ["en_attente", "en_cours", "paye"])
        .maybeSingle(),
      supabase
        .from("invoices")
        .select("id, numero")
        .eq("quote_id", id)
        .eq("kind", "acompte")
        .maybeSingle(),
    ]);
  if (!document || !quote || quote.status === "brouillon") return null;
  const doc = document as unknown as QuoteDocument;
  const data = quotePdfData(doc);
  const [{ data: newer }, logo] = await Promise.all([
    quote.status === "remplace"
      ? supabase
          .from("quotes")
          .select("id")
          .eq("supersedes_id", id)
          .neq("status", "brouillon")
          .maybeSingle()
      : Promise.resolve({ data: null }),
    // Logo de l'entreprise (ADR 0038) : le bucket décide de l'accès.
    doc.issuer.logo_path
      ? supabase.storage.from("artisan-logos").createSignedUrl(doc.issuer.logo_path, 3600)
      : Promise.resolve({ data: null }),
  ]);
  return {
    id: quote.id,
    status: quote.status,
    validUntil: quote.valid_until,
    clientMessage: quote.client_message,
    signedAt: quote.signed_at,
    data,
    model: quoteDocumentModel(data),
    artisan: data.issuer.tradeName ?? data.issuer.name,
    logoUrl: logo.data?.signedUrl ?? null,
    deposit: deposit
      ? { status: deposit.status, amountCents: deposit.amount_cents, paidAt: deposit.paid_at }
      : null,
    depositInvoice: invoice,
    newerId: newer?.id ?? null,
  };
}

/** Message d'une fonction refusée pour une règle métier (409), sinon le message proposé. */
async function functionError(error: unknown, fallback: string): Promise<string> {
  if (!(error instanceof FunctionsHttpError) || error.context.status !== 409) return fallback;
  const body = (await error.context.json().catch(() => null)) as { message?: string } | null;
  return body?.message ?? fallback;
}

export type Opened = { url: string } | { error: string };

/**
 * F-13 « Signer le devis » : cases cochées (horodatées en base avec les versions des conditions),
 * puis signature chez le prestataire, avec retour dans l'application (ADR 0060).
 */
export async function startQuoteSignature(
  quoteId: string,
  consents: Record<SignatureConsent, true>,
): Promise<Opened> {
  const { data, error } = await supabase.functions.invoke<{ status: string; url?: string }>(
    "signature-create",
    {
      body: {
        quoteId,
        consents: {
          ...consents,
          versions: {
            cgu: LEGAL_DOCUMENT_VERSIONS.cgu,
            confidentialite: LEGAL_DOCUMENT_VERSIONS.confidentialite,
          },
        },
        app: true,
      },
    },
  );
  if (error || !data?.url) {
    return { error: await functionError(error, fr.quote.signature.unavailable) };
  }
  return { url: data.url };
}

/**
 * F-31 « Payer l'acompte » : Stripe Checkout ouvert directement sur le compte de l'artisan (aucune
 * commission MENAO), avec retour dans l'application (ADR 0060).
 */
export async function startDepositPayment(quoteId: string): Promise<Opened> {
  const { data, error } = await supabase.functions.invoke<{ status: string; url?: string }>(
    "deposit-checkout",
    { body: { quoteId, origin: env.siteUrl, app: true } },
  );
  if (error || !data?.url) {
    return { error: await functionError(error, fr.quote.deposit.unavailable) };
  }
  return { url: data.url };
}

/** Erreur SQL : message des règles métier (code 22023), sinon message générique. */
const sqlError = (error: { code?: string; message: string }) =>
  error.code === "22023" ? error.message : fr.errors.generic;

/** F-21 : refus du devis (motif de la liste, message facultatif pour l'artisan). */
export async function refuseQuote(
  quoteId: string,
  reason: QuoteRefusalReason,
  comment: string,
): Promise<string | null> {
  const { error } = await supabase.rpc("particulier_refuse_quote", {
    p_quote_id: quoteId,
    p_reason: reason,
    p_comment: comment,
  });
  return error ? sqlError(error) : null;
}

/** F-21 : demande de modification ; l'artisan prépare une nouvelle version. */
export async function requestQuoteRevision(
  quoteId: string,
  message: string,
): Promise<string | null> {
  const { error } = await supabase.rpc("particulier_request_quote_revision", {
    p_quote_id: quoteId,
    p_message: message,
  });
  return error ? sqlError(error) : null;
}
