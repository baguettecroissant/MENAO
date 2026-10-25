import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { EmptyState } from "@/components/empty-state";
import { ExampleBadge } from "@/components/examples";
import { ListGroup, ListHeader, ListRow } from "@/components/list-kit";
import { TabHeader } from "@/components/tab-header";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { useExamplesActive } from "@/lib/examples";
import { formatCents, formatDayMonthNumeric } from "@/lib/format";
import { sharePdf } from "@/lib/pdf";
import { loadArtisanInvoices, shareInvoicesCsv } from "@/lib/pro-documents";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, Screen, ScreenSkeleton } from "@/ui";

const t = fr.proInvoices;

/**
 * Factures de l'artisan (F-35), en lignes comme sur le site (ADR 0189) : émises en son nom à
 * chaque paiement, une ligne par facture, qui se partage en PDF. Exporter et envoi au comptable
 * dans « … ». Exemples (ADR 0184) : la facture d'exemple n'a pas de PDF, rien ne s'exporte. Dans
 * l'onglet Argent (ADR 0188), sous les puces Devis · Factures · Dépenses (`switcher`) ; sinon
 * écran ouvert par-dessus les onglets, avec la barre de retour.
 */
export function ArtisanInvoicesScreen({ switcher }: { switcher?: ReactNode } = {}) {
  const [invoices, reload] = useFocusData(loadArtisanInvoices);
  const examples = useExamplesActive();
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  if (invoices === undefined) return <ScreenSkeleton header={switcher ? undefined : <TopBar />} />;
  const list = invoices ?? [];

  async function exportCsv() {
    setFailure(null);
    const shared = await shareInvoicesCsv();
    if (!shared) setFailure(t.exportFailed);
  }

  async function share(id: string, numero: string) {
    setFailure(null);
    setBusy(id);
    const shared = await sharePdf({ invoiceId: id }, numero);
    setBusy(null);
    if (!shared) setFailure(fr.pdf.failed);
  }

  return (
    <Screen header={switcher ? undefined : <TopBar />} onRefresh={reload}>
      {switcher ? <TabHeader title={fr.tabs.money}>{switcher}</TabHeader> : null}
      <ListHeader
        title={t.title}
        locked={examples}
        more={[
          ...(list.length > 0 ? [{ label: t.export, onPress: exportCsv }] : []),
          { label: fr.proAccountant.title, onPress: () => router.push("/pro-comptable") },
        ]}
      />
      {invoices === null ? <Notice tone="error">{t.error}</Notice> : null}
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      {invoices && invoices.length === 0 ? (
        <EmptyState illustration="documents">{t.empty}</EmptyState>
      ) : list.length > 0 ? (
        <ListGroup>
          {list.map((invoice) => (
            <ListRow
              key={invoice.id}
              label={t.view(invoice.numero)}
              onPress={examples ? undefined : () => share(invoice.id, invoice.numero)}
              disabled={busy !== null}
              busy={busy === invoice.id}
              title={invoice.client || invoice.numero}
              detail={[invoice.numero, formatDayMonthNumeric(invoice.issuedOn), invoice.chantier]
                .filter(Boolean)
                .join(" · ")}
              badge={examples ? <ExampleBadge /> : undefined}
              value={formatCents(invoice.totalTtcCents)}
              status={{ text: t.kinds[invoice.kind], tone: "neutral" }}
            />
          ))}
        </ListGroup>
      ) : null}
    </Screen>
  );
}
