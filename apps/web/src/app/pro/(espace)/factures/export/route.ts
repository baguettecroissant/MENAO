import { roleFromAppMetadata } from "@menao/core";
import { fr } from "@/i18n/fr";
import { createClient } from "@/lib/supabase/server";

const t = fr.pro.invoices;

type Snapshot = {
  client?: { first_name?: string | null; last_name?: string | null };
  chantier?: { title?: string };
  quote?: { numero?: string | null };
};

/** Champ CSV entre guillemets (séparateur « ; », ouverture directe dans un tableur français). */
const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;
const amount = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

/** Export des factures de l'artisan pour son comptable (F-35), au format CSV. */
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

  const rows = (data ?? []).map((invoice) => {
    const doc = invoice.document as Snapshot;
    return [
      invoice.numero,
      invoice.issued_on,
      t.kinds[invoice.kind],
      [doc.client?.first_name, doc.client?.last_name].filter(Boolean).join(" "),
      doc.chantier?.title ?? "",
      doc.quote?.numero ?? "",
      amount(invoice.total_ht_cents),
      amount(invoice.total_tva_cents),
      amount(invoice.total_ttc_cents),
    ];
  });
  const csv = [t.csv.headers, ...rows].map((row) => row.map(cell).join(";")).join("\r\n");
  // Marque d'ordre des octets : accents lus correctement par les tableurs.
  return new Response(String.fromCharCode(0xfeff) + csv + "\r\n", {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${t.csv.filename}"`,
      "cache-control": "private, no-store",
    },
  });
}
