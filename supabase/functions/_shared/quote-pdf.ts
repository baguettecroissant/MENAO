// PDF du devis envoyé (F-21) : produit une fois depuis les données figées, conservé dans le
// bucket privé quote-pdfs, puis relu tel quel (generate-pdf, signature-create). ADR 0021.
import type { SupabaseClient } from "@supabase/supabase-js";
import { quotePdfData, type QuoteDocument } from "../../../packages/documents/src/quote-data.ts";
import { renderQuotePdf } from "../../../packages/documents/src/quote-pdf.ts";

export async function sentQuotePdf(
  admin: SupabaseClient,
  doc: QuoteDocument,
): Promise<Uint8Array<ArrayBuffer>> {
  const storage = admin.storage.from("quote-pdfs");
  const path = `${doc.quote.artisan_id}/${doc.quote.id}.pdf`;
  const { data: stored } = await storage.download(path);
  if (stored) return new Uint8Array(await stored.arrayBuffer());
  // Copie dans un ArrayBuffer simple, type attendu par Response et par le stockage.
  const pdf = new Uint8Array(await renderQuotePdf(quotePdfData(doc)));
  const { error } = await storage.upload(path, pdf, {
    contentType: "application/pdf",
    upsert: false,
  });
  // Deux premières lectures simultanées : le fichier existe déjà, contenu identique.
  if (error) console.error("PDF du devis : conservation en échec", error.message);
  return pdf;
}
