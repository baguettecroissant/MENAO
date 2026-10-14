import { roleFromAppMetadata } from "@menao/core";
import { invoiceCsvParties, invoicesCsv } from "@menao/documents";
import { fr } from "@/i18n/fr";
import { createClient } from "@/lib/supabase/server";

const t = fr.pro.invoices;

/**
 * Export des factures de l'artisan pour son comptable (F-35), au format CSV (`invoicesCsv`, commun
 * avec l'application).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth || roleFromAppMetadata(auth.claims.app_metadata) !== "artisan") {
    return new Response(null, { status: 403 });
  }
  const { data: artisan } = await supabase
    .from("artisans")
    .select("id")
    .eq("user_id", auth.claims.sub)
    .single();
  if (!artisan) return new Response(null, { status: 403 });
  const { data } = await supabase
    .from("invoices")
    .select("numero, kind, issued_on, total_ht_cents, total_tva_cents, total_ttc_cents, document")
    .eq("artisan_id", artisan.id)
    .order("issued_on")
    .order("numero");

  const csv = invoicesCsv(
    t.csv.headers,
    (data ?? []).map((invoice) => ({
      numero: invoice.numero,
      issuedOn: invoice.issued_on,
      kind: t.kinds[invoice.kind],
      ...invoiceCsvParties(invoice.document),
      totalHtCents: invoice.total_ht_cents,
      totalTvaCents: invoice.total_tva_cents,
      totalTtcCents: invoice.total_ttc_cents,
    })),
  );
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${t.csv.filename}"`,
      "cache-control": "private, no-store",
    },
  });
}
