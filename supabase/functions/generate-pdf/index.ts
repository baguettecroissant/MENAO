// Edge Function generate-pdf (F-20, F-35) : PDF des devis et des factures, à partir des fonctions
// SQL quote_document et invoice_document appelées avec le jeton de l'utilisateur (elles seules
// décident de l'accès). Devis : aperçu du brouillon non conservé, devis envoyé conservé tel qu'envoyé
// (F-21), devis signé chez le prestataire (F-13). Facture : produite une fois, conservée telle
// qu'émise. ADR 0020, 0021, 0022, 0024.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  invoicePdfData,
  invoicePdfFilename,
  type InvoiceDocument,
} from "../../../packages/documents/src/invoice-data.ts";
import { renderInvoicePdf } from "../../../packages/documents/src/invoice-pdf.ts";
import {
  quotePdfData,
  quotePdfFilename,
  type QuoteDocument,
} from "../../../packages/documents/src/quote-data.ts";
import { renderQuotePdf } from "../../../packages/documents/src/quote-pdf.ts";
import { adminClient, json } from "../_shared/artisan.ts";
import { env } from "../_shared/env.ts";
import { sentQuotePdf } from "../_shared/quote-pdf.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function pdfResponse(pdf: Uint8Array<ArrayBuffer>, filename: string): Response {
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

async function quotePdf(supabase: SupabaseClient, quoteId: string): Promise<Response> {
  const { data, error } = await supabase.rpc("quote_document", { p_quote_id: quoteId });
  if (error) {
    console.error("generate-pdf : quote_document en échec", error.code);
    return json({ status: "error" }, 500);
  }
  if (!data) return json({ status: "not_found" }, 404);

  const doc = data as QuoteDocument;
  const document = quotePdfData(doc);
  const filename = quotePdfFilename(document);
  if (document.preview) {
    return pdfResponse(new Uint8Array(await renderQuotePdf(document)), filename);
  }
  // Accès vérifié ci-dessus : fichiers lus avec la clé serveur.
  const admin = adminClient();
  if (doc.quote.status === "signe" && doc.quote.signed_pdf_path) {
    const { data: signed } = await admin.storage
      .from("quote-signatures")
      .download(doc.quote.signed_pdf_path);
    if (signed) {
      return pdfResponse(
        new Uint8Array(await signed.arrayBuffer()),
        filename.replace(/\.pdf$/, "-signe.pdf"),
      );
    }
  }
  return pdfResponse(await sentQuotePdf(admin, doc), filename);
}

async function invoicePdf(supabase: SupabaseClient, invoiceId: string): Promise<Response> {
  const { data, error } = await supabase.rpc("invoice_document", { p_invoice_id: invoiceId });
  if (error) {
    console.error("generate-pdf : invoice_document en échec", error.code);
    return json({ status: "error" }, 500);
  }
  if (!data) return json({ status: "not_found" }, 404);

  const doc = data as InvoiceDocument;
  const invoice = invoicePdfData(doc);
  const filename = invoicePdfFilename(invoice);
  // Accès vérifié ci-dessus : facture lue et conservée avec la clé serveur.
  const admin = adminClient();
  const storage = admin.storage.from("invoices");
  const path = doc.pdf_path ?? `${doc.invoice.artisan_id}/${doc.invoice.id}.pdf`;
  const { data: stored } = await storage.download(path);
  if (stored) return pdfResponse(new Uint8Array(await stored.arrayBuffer()), filename);
  // Copie dans un ArrayBuffer simple, type attendu par Response et par le stockage.
  const pdf = new Uint8Array(await renderInvoicePdf(invoice));
  const { error: uploadError } = await storage.upload(path, pdf, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (uploadError) {
    // Deux premières lectures simultanées : le fichier existe déjà, contenu identique.
    console.error("generate-pdf : conservation de la facture en échec", uploadError.message);
  } else {
    await admin
      .from("invoices")
      .update({ pdf_path: path })
      .eq("id", doc.invoice.id)
      .is("pdf_path", null);
  }
  return pdfResponse(pdf, filename);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const authorization = req.headers.get("Authorization") ?? "";
  if (!/^Bearer\s+\S+$/i.test(authorization)) return json({ status: "forbidden" }, 401);

  const body = (await req.json().catch(() => null)) as {
    quoteId?: unknown;
    invoiceId?: unknown;
  } | null;
  const quoteId = typeof body?.quoteId === "string" ? body.quoteId : "";
  const invoiceId = typeof body?.invoiceId === "string" ? body.invoiceId : "";
  if (!UUID.test(quoteId) && !UUID.test(invoiceId)) return json({ status: "invalid" }, 400);

  // Client au nom de l'utilisateur : auth.uid() et ses droits s'appliquent en base.
  const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return UUID.test(invoiceId) ? invoicePdf(supabase, invoiceId) : quotePdf(supabase, quoteId);
});
