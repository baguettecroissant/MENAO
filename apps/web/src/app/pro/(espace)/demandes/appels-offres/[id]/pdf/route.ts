import { FunctionsHttpError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** PDF du DPGF chiffré (ADR 0287) : Edge Function generate-pdf, avec le jeton de l'utilisateur. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response(null, { status: 404 });
  const supabase = await createClient();
  // DPGF créé depuis les plans (ADR 0292) : export seulement après « J'ai vérifié les quantités ».
  const { data: tender } = await supabase
    .from("tenders")
    .select("source_kind, quantities_checked_at")
    .eq("id", id)
    .maybeSingle();
  if (tender?.source_kind === "plan" && !tender.quantities_checked_at) {
    return Response.redirect(new URL(`../${id}?export=verifier`, request.url), 303);
  }
  const { data, error, response } = await supabase.functions.invoke<Blob>("generate-pdf", {
    body: { tenderId: id },
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
