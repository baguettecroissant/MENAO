import { FunctionsHttpError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * PDF du devis (F-20) : produit par l'Edge Function generate-pdf avec le jeton de l'utilisateur
 * (quote_document ne renvoie rien aux autres comptes), puis transmis tel quel.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response(null, { status: 404 });
  const supabase = await createClient();
  const { data, error, response } = await supabase.functions.invoke<Blob>("generate-pdf", {
    body: { quoteId: id },
  });
  if (error || !(data instanceof Blob)) {
    const notFound = error instanceof FunctionsHttpError && error.context.status === 404;
    return new Response(null, { status: notFound ? 404 : 502 });
  }
  return new Response(data, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": response?.headers.get("content-disposition") ?? "inline",
      "cache-control": "private, no-store",
    },
  });
}
