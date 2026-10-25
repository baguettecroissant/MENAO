import { FileDown, FileText } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { fr } from "@/i18n/fr";
import { formatDay } from "@/lib/format";
import { ExampleBadge, ExampleLock } from "./examples";

const t = fr.pro.invoices;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

type Snapshot = {
  client?: { first_name?: string | null; last_name?: string | null };
  chantier?: { title?: string };
};

/** Facture de la liste (table invoices) ; `document` : copie figée à l'émission. */
export type InvoiceListItem = {
  id: string;
  numero: string;
  kind: keyof typeof t.kinds;
  issued_on: string;
  total_ttc_cents: number;
  document: unknown;
};

/**
 * Factures de l'artisan (F-35) : émises en son nom à chaque paiement, export pour le comptable.
 * Exemples (ADR 0184) : pastille « Exemple », PDF et export inactifs.
 */
export function InvoiceList({
  invoices,
  example = false,
}: {
  invoices: readonly InvoiceListItem[];
  example?: boolean;
}) {
  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.title}</h1>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          </div>
          {invoices.length > 0 && (
            <ExampleLock locked={example}>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- fichier CSV téléchargé (route), pas une page */}
              <a
                href="/pro/factures/export"
                className="inline-flex min-h-touch shrink-0 items-center gap-2 self-start rounded-button border border-primary bg-surface px-5 text-[0.9375rem] font-medium text-primary-strong hover:bg-primary-softer focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
              >
                <FileDown aria-hidden="true" className="size-4" />
                {t.export}
              </a>
            </ExampleLock>
          )}
        </div>
        {invoices.length === 0 ? (
          <EmptyState illustration="documents">{t.empty}</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {invoices.map((invoice) => {
              const doc = invoice.document as Snapshot;
              const client = [doc.client?.first_name, doc.client?.last_name]
                .filter(Boolean)
                .join(" ");
              const body = (
                <>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="inline-flex flex-wrap items-center gap-2 font-medium">
                      <FileText aria-hidden="true" className="size-4 text-primary" />
                      {invoice.numero}
                      {example && <ExampleBadge />}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t.line(t.kinds[invoice.kind], formatDay(invoice.issued_on), client || null)}
                    </span>
                    {doc.chantier?.title && (
                      <span className="truncate text-xs text-muted-foreground">
                        {doc.chantier.title}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-medium text-primary">
                    {euros.format(invoice.total_ttc_cents / 100)}
                  </span>
                </>
              );
              const card =
                "flex items-start justify-between gap-3 rounded-card border border-border bg-surface p-4 shadow-card sm:p-5";
              return (
                <li key={invoice.id}>
                  {example ? (
                    <div className={card}>{body}</div>
                  ) : (
                    <a
                      href={`/factures/${invoice.id}/pdf`}
                      target="_blank"
                      rel="noopener"
                      aria-label={t.view(invoice.numero)}
                      className={`${card} transition-shadow hover:shadow-raised focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none`}
                    >
                      {body}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
