import { invoiceFigures, parisToday } from "@menao/core";
import { router } from "expo-router";
import { Euro, FileText } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { StyleSheet, Text } from "react-native";
import Animated from "react-native-reanimated";
import { EmptyState } from "@/components/empty-state";
import { FiguresSkeleton, ListRowsSkeleton } from "@/components/skeletons";
import { ExampleBadge, ExampleLock } from "@/components/examples";
import { ListGroup, ListHeader, ListRow, MoreButton } from "@/components/list-kit";
import { FicheButton } from "@/components/pro/fiche-kit";
import { MoneyActions, MoneyFigures } from "@/components/pro/money-kit";
import { TabHeader } from "@/components/tab-header";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { useExamplesActive } from "@/lib/examples";
import { formatCents, formatDayMonthNumeric } from "@/lib/format";
import { sharePdf } from "@/lib/pdf";
import { loadArtisanInvoices, shareInvoicesCsv } from "@/lib/pro-documents";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, Screen, useReveal } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proInvoices;

/**
 * Factures de l'artisan (F-35), en lignes comme sur le site (ADR 0189) : chiffres clés (facturé
 * ce mois et cette année, calculs de @menao/core), puis les factures émises en son nom à chaque
 * paiement, une ligne par facture, qui se partage en PDF. « Envoi au comptable » en bouton,
 * l'export dans « … » (refonte « Nette », lot 2). Exemples (ADR 0184) : la facture d'exemple n'a pas de PDF, rien ne s'exporte. Dans
 * l'onglet Argent (ADR 0188), sous les puces Devis · Factures · Dépenses (`switcher`) ; sinon
 * écran ouvert par-dessus les onglets, avec la barre de retour.
 */
export function ArtisanInvoicesScreen({ switcher }: { switcher?: ReactNode } = {}) {
  const [invoices, reload] = useFocusData(loadArtisanInvoices, undefined, "tab:factures");
  const examples = useExamplesActive();
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  // Squelette des lignes pendant le premier chargement, puis fondu (ADR 0192).
  const reveal = useReveal(invoices !== undefined);

  if (invoices === undefined) {
    return (
      <Screen header={switcher ? undefined : <TopBar />}>
        {switcher ? <TabHeader title={fr.tabs.money}>{switcher}</TabHeader> : null}
        {switcher ? null : <ListHeader title={t.title} />}
        <FiguresSkeleton />
        <ListRowsSkeleton rows={4} />
      </Screen>
    );
  }
  const list = invoices ?? [];
  const figures = invoiceFigures(list, parisToday());

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
      {switcher ? null : <ListHeader title={t.title} />}
      <Animated.View entering={reveal} style={styles.revealed}>
        {invoices === null ? <Notice tone="error">{t.error}</Notice> : null}
        {failure ? <Notice tone="error">{failure}</Notice> : null}
        {invoices ? (
          <MoneyFigures
            figures={[
              {
                label: t.figures.month,
                value: formatCents(figures.monthCents),
                hint: t.figures.monthHint(figures.monthCount),
              },
              { label: t.figures.year, value: formatCents(figures.yearCents) },
            ]}
          />
        ) : null}
        <ExampleLock locked={examples}>
          <MoneyActions>
            <FicheButton
              label={fr.proAccountant.title}
              variant="secondary"
              icon={FileText}
              grow
              onPress={() => router.push("/pro-comptable")}
            />
            {list.length > 0 ? (
              <MoreButton items={[{ label: t.export, onPress: exportCsv }]} />
            ) : null}
          </MoneyActions>
        </ExampleLock>
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
                icon={{ icon: Euro, tone: "success" }}
                value={formatCents(invoice.totalTtcCents)}
                status={{ text: t.kinds[invoice.kind], tone: "neutral" }}
                statusBelow
              />
            ))}
          </ListGroup>
        ) : null}
        {list.length > 0 ? <Text style={styles.hint}>{t.figures.hint}</Text> : null}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  revealed: { gap: theme.spacing(4) },
  hint: { fontFamily: theme.font.regular, fontSize: 13, color: theme.colors["muted-foreground"] },
});
