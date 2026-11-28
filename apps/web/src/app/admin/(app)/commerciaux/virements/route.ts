import { transfersCsv } from "@menao/core";
import { requireAdmin } from "@/lib/admin/guard";
import { csvResponse, getAdminStatements, monthParam } from "@/lib/admin/commercial-statements";

/**
 * Fichier de virement des conseillers (ADR 0397) : une ligne par facture reçue et pas encore
 * payée, avec l'IBAN des informations de facturation. Chargé dans la banque ; rien n'est viré
 * automatiquement. Réservé aux admins.
 */
export async function GET(request: Request) {
  const { supabase } = await requireAdmin();
  const month = monthParam(new URL(request.url).searchParams.get("mois"));
  const rows = (await getAdminStatements(supabase, month)) ?? [];
  const csv = transfersCsv(
    rows
      .filter((r) => r.invoice_id && !r.paid_at && r.iban)
      .map((r) => ({
        name: r.billing_name ?? r.commercial,
        iban: r.iban ?? "",
        amountCents: r.total_ttc_cents ?? r.total_cents,
        reference: r.invoice_number ? `MENAO ${r.invoice_number}` : `MENAO releve ${month}`,
      })),
  );
  return csvResponse(csv, `menao-virements-conseillers-${month}.csv`);
}
