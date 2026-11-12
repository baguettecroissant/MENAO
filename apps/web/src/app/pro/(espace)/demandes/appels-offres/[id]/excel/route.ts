import { FunctionsHttpError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * DPGF rendu au format de l'architecte (ADR 0287) : produit par l'Edge Function tender-sheet avec
 * le jeton de l'utilisateur (la base décide de l'accès), puis transmis tel quel.
 */
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
  const { data, error, response } = await supabase.functions.invoke<Blob>("tender-sheet", {
    body: { action: "export", tenderId: id },
  });
  if (error || !(data instanceof Blob)) {
    const status = error instanceof FunctionsHttpError ? error.context.status : 502;
    return new Response(null, { status: status === 404 ? 404 : 502 });
  }
  return new Response(data, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": response?.headers.get("content-disposition") ?? "attachment",
      "cache-control": "private, no-store",
    },
  });
}
