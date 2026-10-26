import {
  expenseStatus,
  expensesSummary,
  matchesExpenseFilter,
  matchesExpenseQuery,
  parisToday,
  type ExpenseFilter,
  type ExpenseStatus,
} from "@menao/core";
import { router } from "expo-router";
import { Check, RotateCcw, Trash2 } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { StyleSheet, Text } from "react-native";
import Animated from "react-native-reanimated";
import { EmptyState } from "@/components/empty-state";
import { FiltersSkeleton, ListRowsSkeleton } from "@/components/skeletons";
import { ExampleBadge } from "@/components/examples";
import {
  ListFilters,
  ListGroup,
  ListHeader,
  ListRow,
  ListSearch,
  type ListTone,
  Swipe,
} from "@/components/list-kit";
import { TabHeader } from "@/components/tab-header";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { useExamplesActive } from "@/lib/examples";
import { formatCents, formatDayMonthNumeric } from "@/lib/format";
import {
  deleteExpense,
  hideExpense,
  loadExpenses,
  setExpensePaid,
  shareExpensesCsv,
  unhideExpense,
} from "@/lib/pro-expenses";
import { invalidateScreen } from "@/lib/screen-cache";
import { runUndoable } from "@/lib/undo";
import { prefetchExpense } from "@/lib/prefetch";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Notice, Screen, toast, useReveal } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proExpenses;

/** Couleur du statut, comme sur le site ; l'orangé reste à « À classer », qui demande une action. */
const STATUS_TONE: Record<ExpenseStatus, ListTone> = {
  paye: "success",
  en_retard: "danger",
  a_payer: "neutral",
};

/**
 * Dépenses de l'artisan (F-62), en lignes comme sur le site (ADR 0189) : filtres avec le reste à
 * payer et la part en retard, recherche, puis une ligne par dépense (chantier ou « À classer »,
 * montant, état). « Ajouter » seul en bouton ; exporter, envoi au comptable et factures
 * électroniques dans « … ». Exemples (ADR 0184) : les dépenses fictives s'ouvrent, les actions
 * restent inactives. Dans l'onglet Argent (ADR 0188), sous les puces Devis · Factures · Dépenses
 * (`switcher`) ; sinon écran ouvert par-dessus les onglets, avec la barre de retour.
 */
export function ArtisanExpensesScreen({ switcher }: { switcher?: ReactNode } = {}) {
  const [expenses, reload] = useFocusData(loadExpenses, undefined, "tab:depenses");
  const examples = useExamplesActive();
  const [filter, setFilter] = useState<ExpenseFilter>("toutes");
  const [query, setQuery] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  // Payée ou non depuis la liste : affiché tout de suite, avant le serveur (ADR 0195, 0196).
  const [paidOverrides, setPaidOverrides] = useState<Record<string, string | null>>({});
  // Squelette des lignes pendant le premier chargement, puis fondu (ADR 0192).
  const reveal = useReveal(expenses !== undefined);

  if (expenses === undefined) {
    return (
      <Screen header={switcher ? undefined : <TopBar />}>
        {switcher ? <TabHeader title={fr.tabs.money}>{switcher}</TabHeader> : null}
        <ListHeader title={t.title} />
        <FiltersSkeleton />
        <ListRowsSkeleton />
      </Screen>
    );
  }
  const today = parisToday();
  const list = (expenses ?? []).map((expense) =>
    expense.id in paidOverrides
      ? { ...expense, paid_on: paidOverrides[expense.id] ?? null }
      : expense,
  );
  const dropOverride = (id: string) => setPaidOverrides(({ [id]: _dropped, ...rest }) => rest);

  async function setPaid(id: string, paid: boolean) {
    setPaidOverrides((current) => ({ ...current, [id]: paid ? today : null }));
    const ok = await setExpensePaid(id, paid);
    if (!ok) {
      dropOverride(id);
      toast.error(fr.proExpenses.detail.actionFailed);
      return;
    }
    await reload();
    dropOverride(id);
    toast.undo(
      paid ? fr.proExpenses.detail.markedPaid : fr.proExpenses.detail.markedUnpaid,
      fr.toastUndo,
      () => void setPaid(id, !paid),
    );
  }

  // Suppression annulable, comme dans la fiche (ADR 0195).
  function remove(id: string) {
    runUndoable({
      message: fr.proExpenses.detail.deleted,
      apply: () => {
        hideExpense(id);
        invalidateScreen("tab:depenses");
      },
      revert: () => {
        unhideExpense(id);
        invalidateScreen("tab:depenses");
      },
      commit: async () => {
        const ok = await deleteExpense(id);
        unhideExpense(id);
        invalidateScreen("tab:depenses");
        return ok;
      },
      failed: fr.proExpenses.detail.actionFailed,
    });
  }
  const rows = list.filter(
    (expense) =>
      matchesExpenseFilter(expense, filter, today) && matchesExpenseQuery(expense, query),
  );
  const summary = expensesSummary(list, today);

  async function exportCsv() {
    setFailure(null);
    const shared = await shareExpensesCsv();
    if (!shared) setFailure(t.exportFailed);
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
          { label: t.einvoice.button, soon: t.einvoice.soon, note: t.einvoice.text },
        ]}
        primary={{ label: fr.proLists.add, onPress: () => router.push("/pro-depense/nouvelle") }}
      />
      <Animated.View entering={reveal} style={styles.revealed}>
        {failure ? <Notice tone="error">{failure}</Notice> : null}
        {expenses === null ? <Notice tone="error">{t.error}</Notice> : null}

        {list.length > 0 ? (
          <>
            <ListFilters
              label={t.filtersLabel}
              value={filter}
              onChange={setFilter}
              items={[
                { value: "toutes", label: t.filters.toutes, detail: String(list.length) },
                {
                  value: "a_payer",
                  label: t.filters.a_payer,
                  detail: formatCents(summary.toPayCents),
                },
                {
                  value: "en_retard",
                  label: t.filters.en_retard,
                  detail: formatCents(summary.overdueCents),
                  tone: summary.overdueCount > 0 ? "danger" : undefined,
                },
                {
                  value: "paye",
                  label: t.filters.paye,
                  detail: String(list.length - summary.toPayCount),
                },
              ]}
            />
            <ListSearch value={query} onChangeText={setQuery} placeholder={t.searchPlaceholder} />
          </>
        ) : null}

        {expenses !== null && list.length === 0 ? (
          <EmptyState illustration="documents">{t.empty}</EmptyState>
        ) : list.length > 0 && rows.length === 0 ? (
          <Body muted>{t.noResults}</Body>
        ) : rows.length > 0 ? (
          <ListGroup>
            {rows.map((expense) => {
              const status = expenseStatus(expense, today);
              return (
                <Swipe
                  key={expense.id}
                  enabled={!examples}
                  actions={[
                    status === "paye"
                      ? {
                          label: fr.proLists.swipe.unpaid,
                          icon: RotateCcw,
                          tone: "primary",
                          onPress: () => void setPaid(expense.id, false),
                        }
                      : {
                          label: fr.proLists.swipe.paid,
                          icon: Check,
                          tone: "success",
                          onPress: () => void setPaid(expense.id, true),
                        },
                    {
                      label: fr.proLists.swipe.delete,
                      icon: Trash2,
                      tone: "danger",
                      onPress: () => remove(expense.id),
                    },
                  ]}
                >
                  <ListRow
                    label={t.open(expense.title)}
                    onPressIn={() => prefetchExpense(expense.id, expense.title)}
                    onPress={() => router.push(`/pro-depense/${expense.id}`)}
                    title={expense.title}
                    detail={
                      <>
                        {[formatDayMonthNumeric(expense.issued_on), expense.supplier_name]
                          .filter(Boolean)
                          .join(" · ")}
                        {" · "}
                        {expense.chantier_title ?? (
                          <Text style={{ color: theme.colors.warning }}>{t.toClassify}</Text>
                        )}
                      </>
                    }
                    badge={examples ? <ExampleBadge /> : undefined}
                    value={formatCents(expense.total_ttc_cents)}
                    status={{ text: t.statuses[status], tone: STATUS_TONE[status] }}
                  />
                </Swipe>
              );
            })}
          </ListGroup>
        ) : null}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({ revealed: { gap: theme.spacing(4) } });
