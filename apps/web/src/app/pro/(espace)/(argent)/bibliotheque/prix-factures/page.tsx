import type { Metadata, Route } from "next";
import Link from "next/link";
import { type InvoiceChangeView, InvoicePrices } from "@/components/pro/invoice-prices";
import { ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { loadLibrary } from "@/lib/artisan/library";
import { loadInvoicePrices } from "@/lib/artisan/library-invoices";
import { requireTeamPermission } from "@/lib/artisan/space";

const t = fr.pro.library.invoices;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/**
 * Prix d'achat repérés dans les factures (F-149, ADR 0311, maquette lot 43) : factures lues dans
 * « Dépenses » rapprochées des fournitures ; l'artisan coche et met à jour. Patron et chef d'équipe.
 */
export default async function InvoicePricesPage() {
  const { supabase } = await requireTeamPermission("money");
  const library = await loadLibrary(supabase, { seed: false });
  const prices = await loadInvoicePrices(supabase, library);
  const supplies = new Map(library.supplies.map((s) => [s.id, s]));
  const changes: InvoiceChangeView[] = prices.changes.map((c) => ({
    ...c,
    designation: supplies.get(c.supplyId)?.designation ?? "",
    reference: supplies.get(c.supplyId)?.reference ?? null,
  }));
  const empty = changes.length === 0 && prices.fresh.length === 0;
  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href={"/pro/bibliotheque?vue=fournitures" as Route}
          className="self-start text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          ← {fr.pro.library.work.back}
        </Link>
        <h1 className="text-[1.75rem] leading-[1.05] sm:text-[2rem]">{t.title}</h1>
        {empty ? (
          <div className="flex flex-col items-start gap-4 rounded-card border border-border bg-surface p-6">
            <p className="text-sm text-muted-foreground">{t.empty}</p>
            <ButtonLink href={"/pro/depenses" as Route} size="sm" variant="secondary" block={false}>
              {t.toExpenses}
            </ButtonLink>
          </div>
        ) : (
          <InvoicePrices
            changes={changes}
            fresh={prices.fresh}
            since={prices.since}
            works={prices.works}
          />
        )}
      </div>
    </main>
  );
}
