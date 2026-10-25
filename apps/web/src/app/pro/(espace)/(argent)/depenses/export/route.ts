import { roleFromAppMetadata } from "@menao/core";
import { expensesCsv } from "@menao/documents";
import { fr } from "@/i18n/fr";
import { loadExpenses } from "@/lib/artisan/expenses";
import { createClient } from "@/lib/supabase/server";

const t = fr.pro.expenses;

/**
 * Export des dépenses de l'artisan pour son comptable (F-62), au format CSV (`expensesCsv`, commun
 * avec l'application), dans l'ordre des dates.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth || roleFromAppMetadata(auth.claims.app_metadata) !== "artisan") {
    return new Response(null, { status: 403 });
  }
  const expenses = await loadExpenses(supabase);
  const csv = expensesCsv(
    t.csv.headers,
    [...expenses].reverse().map((expense) => ({
      issuedOn: expense.issued_on,
      supplier: expense.supplier_name ?? "",
      reference: expense.reference ?? "",
      title: expense.title,
      kind: t.kinds[expense.kind],
      category: expense.category ? t.categories[expense.category] : "",
      chantier: expense.chantier_title ?? "",
      totalHtCents: expense.total_ht_cents,
      totalTvaCents: expense.total_tva_cents,
      totalTtcCents: expense.total_ttc_cents,
      dueOn: expense.due_on ?? "",
      paidOn: expense.paid_on ?? "",
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
