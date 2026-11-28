import { commercialInvoicesCsv } from "@menao/core";
import { requireAdmin } from "@/lib/admin/guard";
import { csvResponse, getAdminStatements, monthParam } from "@/lib/admin/commercial-statements";

const parisDay = (iso: string) =>
  new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date(iso));

/** Factures des conseillers d'un mois pour le comptable (ADR 0397). Réservé aux admins. */
export async function GET(request: Request) {
  const { supabase } = await requireAdmin();
  const month = monthParam(new URL(request.url).searchParams.get("mois"));
  const rows = (await getAdminStatements(supabase, month)) ?? [];
  const csv = commercialInvoicesCsv(
    rows
      .filter((r) => r.invoice_id)
      .map((r) => ({
        commercial: r.billing_name ?? r.commercial,
        number: r.invoice_number,
        issuedOn: r.invoice_issued_at ? parisDay(r.invoice_issued_at) : r.period_end,
        htCents: r.total_cents,
        vatCents: r.total_ttc_cents != null ? r.total_ttc_cents - r.total_cents : null,
        ttcCents: r.total_ttc_cents,
        paidOn: r.paid_at ? parisDay(r.paid_at) : null,
        reference: r.payout_reference,
      })),
  );
  return csvResponse(csv, `menao-factures-conseillers-${month}.csv`);
}
