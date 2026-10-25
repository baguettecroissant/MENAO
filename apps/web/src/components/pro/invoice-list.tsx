import { EmptyState } from "@/components/empty-state";
import { ListHeader, ListPanel, ListRow } from "@/components/list-kit";
import { MoreMenu } from "@/components/more-menu";
import { fr } from "@/i18n/fr";
import { ExampleBadge, ExampleLock } from "./examples";

const t = fr.pro.invoices;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const shortDate = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Paris",
});

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
 * Factures de l'artisan (F-35), en lignes (ADR 0189) : émises en son nom à chaque paiement, une
 * ligne par facture (PDF dans un nouvel onglet). Exporter et envoi au comptable dans « … ».
 * Exemples (ADR 0184) : pastille « Exemple », PDF et menu inactifs.
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
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-5 pb-10 sm:px-6">
        <ListHeader
          title={t.title}
          actions={
            <ExampleLock locked={example}>
              <MoreMenu
                label={fr.pro.lists.more}
                items={[
                  ...(invoices.length > 0
                    ? [{ kind: "download" as const, href: "/pro/factures/export", label: t.export }]
                    : []),
                  { kind: "link" as const, href: "/pro/comptable", label: fr.pro.accountant.link },
                ]}
              />
            </ExampleLock>
          }
        />
        {invoices.length === 0 ? (
          <EmptyState illustration="documents">{t.empty}</EmptyState>
        ) : (
          <ListPanel label={t.title}>
            {invoices.map((invoice) => {
              const doc = invoice.document as Snapshot;
              const client = [doc.client?.first_name, doc.client?.last_name]
                .filter(Boolean)
                .join(" ");
              return (
                <ListRow
                  key={invoice.id}
                  href={example ? undefined : `/factures/${invoice.id}/pdf`}
                  external
                  label={t.view(invoice.numero)}
                  title={client || invoice.numero}
                  badge={example ? <ExampleBadge /> : undefined}
                  detail={[invoice.numero, shortDate.format(new Date(invoice.issued_on))].join(
                    " · ",
                  )}
                  context={doc.chantier?.title ?? ""}
                  value={euros.format(invoice.total_ttc_cents / 100)}
                  status={{ text: t.kinds[invoice.kind], tone: "neutral" }}
                />
              );
            })}
          </ListPanel>
        )}
      </div>
    </main>
  );
}
