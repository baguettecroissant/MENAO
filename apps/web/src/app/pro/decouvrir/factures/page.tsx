import { exampleInvoices } from "@menao/core";
import type { Metadata } from "next";
import { InvoiceList } from "@/components/pro/invoice-list";
import { fr } from "@/i18n/fr";
import { requireExampleViewer } from "@/lib/artisan/examples";

export const metadata: Metadata = { title: `${fr.pro.invoices.title} — MENAO` };

/** Factures d'exemple (ADR 0184) : facture d'acompte du chantier en cours. */
export default async function ExampleInvoicesPage() {
  await requireExampleViewer();
  return <InvoiceList invoices={exampleInvoices()} example />;
}
