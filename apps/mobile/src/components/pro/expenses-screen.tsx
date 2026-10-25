import {
  EXPENSE_FILTERS,
  expenseStatus,
  expensesSummary,
  matchesExpenseFilter,
  matchesExpenseQuery,
  parisToday,
  type ExpenseFilter,
} from "@menao/core";
import { router } from "expo-router";
import { FileDown, Plus, Zap } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { EmptyState } from "@/components/empty-state";
import { ExampleBadge, ExampleLock } from "@/components/examples";
import { ExpenseStatusPill, ToClassifyPill } from "@/components/pro/expense-parts";
import { TabHeader } from "@/components/tab-header";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { useExamplesActive } from "@/lib/examples";
import { formatCents, formatDateNumeric } from "@/lib/format";
import { loadExpenses, shareExpensesCsv } from "@/lib/pro-expenses";
import { useFocusData } from "@/lib/use-focus-data";
import {
  Body,
  Button,
  Chip,
  Notice,
  Screen,
  ScreenSkeleton,
  Tappable,
  TextField,
  Title,
} from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proExpenses;
const { colors, font, radius, spacing } = theme;

/**
 * Dépenses de l'artisan (F-62), comme sur le site : reste à payer, onglets par statut, recherche,
 * puis la liste avec le chantier de chaque dépense ou « À classer ». Exemples (ADR 0184) : les
 * dépenses fictives s'ouvrent, l'ajout et l'export restent inactifs. Dans l'onglet Argent
 * (ADR 0188), sous les puces Devis · Factures · Dépenses (`switcher`) ; sinon écran ouvert
 * par-dessus les onglets, avec la barre de retour.
 */
export function ArtisanExpensesScreen({ switcher }: { switcher?: ReactNode } = {}) {
  const [expenses, reload] = useFocusData(loadExpenses);
  const examples = useExamplesActive();
  const [filter, setFilter] = useState<ExpenseFilter>("toutes");
  const [query, setQuery] = useState("");
  const [einvoice, setEinvoice] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  if (expenses === undefined) return <ScreenSkeleton header={switcher ? undefined : <TopBar />} />;
  const today = parisToday();
  const list = expenses ?? [];
  const rows = list.filter(
    (expense) =>
      matchesExpenseFilter(expense, filter, today) && matchesExpenseQuery(expense, query),
  );
  const summary = expensesSummary(list, today);

  async function exportCsv() {
    setFailure(null);
    setExporting(true);
    const shared = await shareExpensesCsv();
    setExporting(false);
    if (!shared) setFailure(t.exportFailed);
  }

  return (
    <Screen header={switcher ? undefined : <TopBar />} onRefresh={reload}>
      {switcher ? (
        <TabHeader title={fr.tabs.money}>{switcher}</TabHeader>
      ) : (
        <View style={styles.head}>
          <Title>{t.title}</Title>
          <Body muted>{t.subtitle}</Body>
        </View>
      )}
      <ExampleLock locked={examples}>
        <Button label={t.add} icon={Plus} onPress={() => router.push("/pro-depense/nouvelle")} />
      </ExampleLock>
      <ExampleLock locked={examples}>
        <View style={styles.actions}>
          {list.length > 0 ? (
            <Button
              label={t.export}
              variant="secondary"
              icon={FileDown}
              loading={exporting}
              onPress={exportCsv}
            />
          ) : null}
          <Tappable
            role="button"
            aria-expanded={einvoice}
            onPress={() => setEinvoice((value) => !value)}
            style={styles.einvoice}
          >
            <Zap size={16} color={colors.foreground} />
            <Text style={styles.einvoiceLabel}>{t.einvoice.button}</Text>
            <Text style={styles.soon}>{t.einvoice.soon}</Text>
          </Tappable>
          {einvoice ? <Body muted>{t.einvoice.text}</Body> : null}
        </View>
      </ExampleLock>
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      {expenses === null ? <Notice tone="error">{t.error}</Notice> : null}

      {list.length > 0 ? (
        <View style={styles.summary}>
          {summary.toPayCount === 0 ? (
            <Text style={styles.allPaid}>{t.nothingToPay}</Text>
          ) : (
            <>
              <Text style={styles.toPay}>{t.toPay(formatCents(summary.toPayCents))}</Text>
              {summary.overdueCount > 0 ? (
                <Text style={styles.overdue}>{t.overdue(formatCents(summary.overdueCents))}</Text>
              ) : null}
            </>
          )}
        </View>
      ) : null}

      {list.length > 0 ? (
        <>
          <View style={styles.filters}>
            {EXPENSE_FILTERS.map((value) => (
              <Chip
                key={value}
                label={t.filters[value]}
                selected={filter === value}
                onPress={() => setFilter(value)}
              />
            ))}
          </View>
          <TextField
            label={t.searchPlaceholder}
            value={query}
            onChangeText={setQuery}
            placeholder={t.searchPlaceholder}
            returnKeyType="search"
            autoCorrect={false}
          />
        </>
      ) : null}

      {expenses !== null && list.length === 0 ? (
        <EmptyState illustration="documents">{t.empty}</EmptyState>
      ) : list.length > 0 && rows.length === 0 ? (
        <Body muted>{t.noResults}</Body>
      ) : (
        rows.map((expense) => {
          const status = expenseStatus(expense, today);
          return (
            <Tappable
              key={expense.id}
              role="button"
              aria-label={t.open(expense.title)}
              onPress={() => router.push(`/pro-depense/${expense.id}`)}
              style={styles.card}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{expense.title}</Text>
                <View style={styles.amounts}>
                  <Text style={styles.ttc}>{formatCents(expense.total_ttc_cents)}</Text>
                  <Text style={styles.ht}>{t.ht(formatCents(expense.total_ht_cents))}</Text>
                </View>
              </View>
              <Text style={styles.meta}>
                {[
                  formatDateNumeric(expense.issued_on),
                  expense.supplier_name,
                  expense.reference && `N° ${expense.reference}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              <View style={styles.pills}>
                <ExpenseStatusPill status={status} />
                {expense.chantier_title ? (
                  <Text style={styles.chantier} numberOfLines={1}>
                    {expense.chantier_title}
                  </Text>
                ) : (
                  <ToClassifyPill />
                )}
                {examples ? <ExampleBadge /> : null}
              </View>
            </Tappable>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: spacing(1.5) },
  actions: { gap: spacing(2) },
  einvoice: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing(2),
    minHeight: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(4),
  },
  einvoiceLabel: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  soon: {
    overflow: "hidden",
    borderRadius: radius.chip,
    backgroundColor: colors.background,
    paddingHorizontal: spacing(2),
    paddingVertical: 2,
    fontFamily: font.regular,
    fontSize: 12,
    color: colors["muted-foreground"],
  },
  summary: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: spacing(2),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  toPay: { fontFamily: font.medium, fontSize: 18, color: colors.foreground },
  overdue: { fontFamily: font.medium, fontSize: 14, color: colors.danger },
  allPaid: { fontFamily: font.medium, fontSize: 15, color: colors.success },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  card: {
    gap: spacing(2),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing(3) },
  cardTitle: { flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  amounts: { alignItems: "flex-end" },
  ttc: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  ht: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  meta: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  pills: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing(2) },
  chantier: {
    flexShrink: 1,
    overflow: "hidden",
    borderRadius: radius.chip,
    backgroundColor: colors.background,
    paddingHorizontal: spacing(2),
    paddingVertical: 3,
    fontFamily: font.medium,
    fontSize: 12,
    color: colors["muted-foreground"],
  },
});
