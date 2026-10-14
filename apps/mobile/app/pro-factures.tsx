import { FileDown, FileText } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { formatCents, formatDay } from "@/lib/format";
import { sharePdf } from "@/lib/pdf";
import { loadArtisanInvoices, shareInvoicesCsv } from "@/lib/pro-documents";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, Notice, Title } from "@/ui";
import { theme } from "@/ui/theme";
import { EmptyState } from "@/components/empty-state";

const t = fr.proInvoices;
const { colors, font, radius, spacing } = theme;

/**
 * Factures de l'artisan (F-35), comme sur le site : émises en son nom à chaque paiement ; chaque
 * facture se partage en PDF, et l'export CSV pour le comptable est proposé au partage.
 */
export default function ArtisanInvoicesScreen() {
  const [invoices, reload] = useFocusData(loadArtisanInvoices);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  if (invoices === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  async function exportCsv() {
    setFailure(null);
    setBusy("csv");
    const shared = await shareInvoicesCsv();
    setBusy(null);
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
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TopBar />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            onRefresh={async () => {
              setRefreshing(true);
              await reload();
              setRefreshing(false);
            }}
          />
        }
      >
        <View style={styles.head}>
          <Title>{t.title}</Title>
          <Body muted>{t.subtitle}</Body>
        </View>
        {invoices === null ? <Notice tone="error">{t.error}</Notice> : null}
        {failure ? <Notice tone="error">{failure}</Notice> : null}
        {invoices && invoices.length > 0 ? (
          <Button
            label={t.export}
            variant="secondary"
            onPress={exportCsv}
            loading={busy === "csv"}
          />
        ) : null}
        {invoices && invoices.length === 0 ? (
          <EmptyState illustration="documents">{t.empty}</EmptyState>
        ) : null}
        {(invoices ?? []).map((invoice) => (
          <Pressable
            key={invoice.id}
            role="button"
            aria-label={t.view(invoice.numero)}
            aria-busy={busy === invoice.id}
            disabled={busy !== null}
            onPress={() => share(invoice.id, invoice.numero)}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <View style={styles.cardText}>
              <View style={styles.row}>
                <FileText size={16} color={colors.primary} />
                <Text style={styles.numero}>{invoice.numero}</Text>
              </View>
              <Text style={styles.meta}>
                {t.line(t.kinds[invoice.kind], formatDay(invoice.issuedOn), invoice.client || null)}
              </Text>
              {invoice.chantier ? (
                <Text style={styles.meta} numberOfLines={1}>
                  {invoice.chantier}
                </Text>
              ) : null}
            </View>
            <View style={styles.side}>
              <Text style={styles.amount}>{formatCents(invoice.totalTtcCents)}</Text>
              {busy === invoice.id ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <FileDown size={16} color={colors["muted-foreground"]} />
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  header: { paddingHorizontal: spacing(5), paddingTop: spacing(2) },
  content: { padding: spacing(5), gap: spacing(3), paddingBottom: spacing(10) },
  head: { gap: spacing(2), marginBottom: spacing(1) },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(3),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  pressed: { opacity: 0.85 },
  cardText: { flex: 1, gap: spacing(1) },
  row: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  numero: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  meta: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  side: { alignItems: "flex-end", gap: spacing(2) },
  amount: { fontFamily: font.medium, fontSize: 15, color: colors.primary },
});
