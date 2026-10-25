import type { Metadata } from "next";
import { InvoiceList } from "@/components/pro/invoice-list";
import { fr } from "@/i18n/fr";
import { requireProSpace } from "@/lib/artisan/space";

export const metadata: Metadata = { title: `${fr.pro.invoices.title} — MENAO` };

/** Factures de l'artisan (F-35) : émises en son nom à chaque paiement, export pour le comptable. */
export default async function InvoicesPage() {
  const { supabase, artisanId } = await requireProSpace();
  const { data } = await supabase
    .from("invoices")
    .select("id, numero, kind, issued_on, total_ttc_cents, document")
    .eq("artisan_id", artisanId)
    .order("issued_on", { ascending: false })
    .order("numero", { ascending: false });
  return <InvoiceList invoices={data ?? []} />;
}
