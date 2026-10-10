/**
 * Données renvoyées par la fonction SQL reception_document (noms de la base) → données du PV.
 * Partagé par les Edge Functions (signature, PDF) et le web (aperçu). ADR 0027.
 */
import type { ReceptionPdfData } from "./reception-model.ts";
import { issuerData, partiesData, type QuoteDocument } from "./quote-data.ts";

export type ReceptionDocument = {
  reception: {
    id: string;
    artisan_id: string;
    chantier_id: string;
    numero: string;
    status: string;
    issued_on: string;
    with_reserves: boolean;
    reserves: string | null;
    signed_at?: string | null;
    signed_pdf_path?: string | null;
  };
  quote: {
    numero: string | null;
    signed_on: string | null;
    total_ttc_cents: number;
    deposit_percent: number | null;
  };
  paid_cents: number;
  finished_on: string | null;
  issuer: QuoteDocument["issuer"];
  client: QuoteDocument["client"];
  chantier: QuoteDocument["chantier"];
};

export function receptionPdfData(doc: ReceptionDocument, preview = false): ReceptionPdfData {
  const parties = partiesData(doc.client, doc.chantier);
  return {
    numero: doc.reception.numero,
    issuedOn: doc.reception.issued_on,
    finishedOn: doc.finished_on,
    quote: {
      numero: doc.quote.numero,
      signedOn: doc.quote.signed_on,
      totalTtcCents: doc.quote.total_ttc_cents,
      depositPercent: doc.quote.deposit_percent,
    },
    paidCents: doc.paid_cents,
    withReserves: doc.reception.with_reserves,
    reserves: doc.reception.reserves,
    issuer: issuerData(doc.issuer, doc.reception.issued_on),
    client: parties.client,
    site: { ...parties.site, city: doc.chantier.ville_nom },
    preview,
  };
}

export const receptionPdfFilename = (data: ReceptionPdfData) => `${data.numero}.pdf`;
