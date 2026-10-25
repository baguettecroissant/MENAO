// PDF d'une facture (F-35, ADR 0024) : produit une fois, puis conservé tel qu'émis dans le bucket
// privé « invoices ». Partagé par generate-pdf (téléchargement) et accountant-export (envoi au
// comptable, F-63). L'accès à la facture est décidé par l'appelant.
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  invoicePdfData,
  type InvoiceDocument,
} from "../../../packages/documents/src/invoice-data.ts";
import { renderInvoicePdf } from "../../../packages/documents/src/invoice-pdf.ts";
import { documentLogo } from "./logo.ts";

export async function invoicePdfBytes(
  admin: SupabaseClient,
  doc: InvoiceDocument,
): Promise<Uint8Array<ArrayBuffer>> {
  const storage = admin.storage.from("invoices");
  const path = doc.pdf_path ?? `${doc.invoice.artisan_id}/${doc.invoice.id}.pdf`;
  const { data: stored } = await storage.download(path);
  if (stored) return new Uint8Array(await stored.arrayBuffer());
  // Copie dans un ArrayBuffer simple, type attendu par Response et par le stockage.
  const logo = await documentLogo(admin, doc.issuer.logo_path);
  const pdf = new Uint8Array(await renderInvoicePdf(invoicePdfData(doc), { logo }));
  const { error } = await storage.upload(path, pdf, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (error) {
    // Deux premières lectures simultanées : le fichier existe déjà, contenu identique.
    console.error("facture : conservation du PDF en échec", error.message);
  } else {
    await admin
      .from("invoices")
      .update({ pdf_path: path })
      .eq("id", doc.invoice.id)
      .is("pdf_path", null);
  }
  return pdf;
}
