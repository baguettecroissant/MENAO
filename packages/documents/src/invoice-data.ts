/**
 * Données renvoyées par la fonction SQL invoice_document (noms de la base) → données de la
 * facture. Partagé par l'Edge Function generate-pdf et le web (ADR 0024).
 */
import type { VatPart } from "../../core/src/invoice.ts";
import { money, quantity, unit } from "./format.ts";
import type { InvoiceKind, InvoicePdfData } from "./invoice-model.ts";
import { issuerData, partiesData, type QuoteDocument } from "./quote-data.ts";

export type InvoiceDocument = {
  invoice: {
    id: string;
    artisan_id: string;
    numero: string;
    kind: InvoiceKind;
    issued_on: string;
    paid_on: string | null;
    total_ht_cents: number;
    total_tva_cents: number;
    total_ttc_cents: number;
    vat_breakdown: VatPart[];
  };
  quote: { numero: string | null; total_ttc_cents: number; deposit_percent: number | null };
  issuer: QuoteDocument["issuer"];
  client: QuoteDocument["client"];
  chantier: QuoteDocument["chantier"];
  /** Facture de solde : lignes et totaux du devis, acomptes déjà facturés. */
  lines?: QuoteDocument["lines"];
  quote_totals?: {
    total_ht_cents: number;
    total_tva_cents: number;
    total_ttc_cents: number;
    vat_breakdown: VatPart[];
  };
  deposits?: { numero: string; paid_on: string | null; total_ttc_cents: number }[];
  /** PDF conservé tel qu'émis, s'il a déjà été produit. */
  pdf_path?: string | null;
};

export function invoicePdfData(doc: InvoiceDocument): InvoicePdfData {
  const { invoice, quote } = doc;
  return {
    kind: invoice.kind,
    numero: invoice.numero,
    issuedOn: invoice.issued_on,
    paidOn: invoice.paid_on,
    quote: {
      numero: quote.numero,
      totalTtcCents: quote.total_ttc_cents,
      depositPercent: quote.deposit_percent,
    },
    issuer: issuerData(doc.issuer, invoice.issued_on),
    ...partiesData(doc.client, doc.chantier),
    vat: invoice.vat_breakdown,
    totals: {
      totalHtCents: invoice.total_ht_cents,
      totalTvaCents: invoice.total_tva_cents,
      totalTtcCents: invoice.total_ttc_cents,
    },
    ...(doc.lines && doc.quote_totals
      ? {
          lines: doc.lines.map((l) => ({
            designation: l.designation,
            detail: `${quantity(l.quantity_milli)} ${unit(l.unit)} × ${money(l.unit_price_ht_cents)} HT`,
            totalHtCents: l.total_ht_cents,
          })),
          quoteTotals: {
            totalHtCents: doc.quote_totals.total_ht_cents,
            totalTvaCents: doc.quote_totals.total_tva_cents,
            totalTtcCents: doc.quote_totals.total_ttc_cents,
            vat: doc.quote_totals.vat_breakdown,
          },
          deposits: (doc.deposits ?? []).map((dep) => ({
            numero: dep.numero,
            paidOn: dep.paid_on,
            totalTtcCents: dep.total_ttc_cents,
          })),
        }
      : {}),
  };
}

export const invoicePdfFilename = (data: InvoicePdfData) => `${data.numero}.pdf`;
