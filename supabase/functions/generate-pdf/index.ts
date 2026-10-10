// Edge Function generate-pdf (F-20) : PDF du devis, à partir de la fonction SQL quote_document
// appelée avec le jeton de l'utilisateur (elle seule décide de l'accès). Brouillon : aperçu, non
// conservé. Devis envoyé : PDF conservé tel qu'envoyé (F-21). Devis signé : PDF signé chez le
// prestataire (F-13). ADR 0020, 0021, 0022.
import { createClient } from "@supabase/supabase-js";
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

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const authorization = req.headers.get("Authorization") ?? "";
  if (!/^Bearer\s+\S+$/i.test(authorization)) return json({ status: "forbidden" }, 401);

  const body = (await req.json().catch(() => null)) as { quoteId?: unknown } | null;
  const quoteId = typeof body?.quoteId === "string" ? body.quoteId : "";
  if (!UUID.test(quoteId)) return json({ status: "invalid" }, 400);

  // Client au nom de l'utilisateur : auth.uid() et ses droits s'appliquent en base.
  const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
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
});
