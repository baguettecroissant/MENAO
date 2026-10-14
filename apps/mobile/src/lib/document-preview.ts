import {
  invoiceDocumentModel,
  invoicePdfData,
  quoteDocumentModel,
  quotePdfData,
  receptionDocumentModel,
  receptionPdfData,
  type InvoiceDocument,
  type InvoiceDocumentModel,
  type InvoiceKind,
  type QuoteDocument,
  type QuoteDocumentModel,
  type ReceptionDocument,
  type ReceptionDocumentModel,
} from "@menao/documents";
import type { PdfTarget } from "./pdf";
import { supabase } from "./supabase";

/** Documents du chantier ouverts en aperçu : devis, facture (acompte ou solde), PV de réception. */
export type DocumentType = "devis" | "facture" | "pv";

export type DocumentPreview = {
  numero: string;
  logoUrl: string | null;
  /** Document demandé à generate-pdf pour le téléchargement. */
  target: PdfTarget;
} & (
  | { type: "devis"; signed: boolean; model: QuoteDocumentModel }
  | { type: "facture"; invoiceKind: InvoiceKind; model: InvoiceDocumentModel }
  | { type: "pv"; model: ReceptionDocumentModel }
);

/** Logo de l'entreprise en tête des documents (ADR 0038) : le bucket décide de l'accès. */
async function logoUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("artisan-logos").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/**
 * Aperçu d'un document du chantier, comme le PDF ouvert sur le site : même contenu, issu du même
 * modèle (`@menao/documents`). Les fonctions SQL ne renvoient rien aux autres comptes ; null si
 * le document est introuvable.
 */
export async function loadDocumentPreview(
  type: DocumentType,
  id: string,
): Promise<DocumentPreview | null> {
  if (type === "devis") {
    const [{ data: document }, { data: quote }] = await Promise.all([
      supabase.rpc("quote_document", { p_quote_id: id }),
      supabase.from("quotes").select("status").eq("id", id).maybeSingle(),
    ]);
    if (!document || !quote || quote.status === "brouillon") return null;
    const doc = document as unknown as QuoteDocument;
    const data = quotePdfData(doc);
    return {
      type,
      numero: data.numero ?? "devis",
      signed: quote.status === "signe",
      model: quoteDocumentModel(data),
      logoUrl: await logoUrl(doc.issuer.logo_path),
      target: { quoteId: id },
    };
  }
  if (type === "facture") {
    const { data: document } = await supabase.rpc("invoice_document", { p_invoice_id: id });
    if (!document) return null;
    const doc = document as unknown as InvoiceDocument;
    const data = invoicePdfData(doc);
    return {
      type,
      numero: data.numero,
      invoiceKind: data.kind,
      model: invoiceDocumentModel(data),
      logoUrl: await logoUrl(doc.issuer.logo_path),
      target: { invoiceId: id },
    };
  }
  const { data: document } = await supabase.rpc("reception_document", { p_reception_id: id });
  if (!document) return null;
  const doc = document as unknown as ReceptionDocument;
  const data = receptionPdfData(doc);
  return {
    type,
    numero: data.numero,
    model: receptionDocumentModel(data),
    logoUrl: await logoUrl(doc.issuer.logo_path),
    target: { receptionId: id },
  };
}
