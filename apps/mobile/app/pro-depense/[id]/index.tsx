import { expenseStatus, isExampleId, parisToday } from "@menao/core";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ExternalLink, Pencil } from "lucide-react-native";
import { useCallback, useState, type ReactNode } from "react";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import { ExampleBadge, ExampleLock } from "@/components/examples";
import { ExpenseLines, ExpenseStatusPill, ToClassifyPill } from "@/components/pro/expense-parts";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { formatCents, formatDay } from "@/lib/format";
import { deleteExpense, loadExpenseView, setExpensePaid } from "@/lib/pro-expenses";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, Card, LinkText, Notice, Screen, ScreenSkeleton, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proExpenses;
const d = t.detail;
const { colors, font, radius, spacing } = theme;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowValue}>
        {typeof children === "string" ? <Text style={styles.rowText}>{children}</Text> : children}
      </View>
    </View>
  );
}

/**
 * Fiche d'une dépense (F-62), comme sur le site : statut, pièce (URL signée), informations,
 * totaux et lignes lues ; « Marquer comme payée », « Modifier » et « Supprimer la dépense ».
 * Exemples (ADR 0184) : la fiche se lit, les boutons sont inactifs.
 */
export default function ExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback(() => loadExpenseView(id), [id]);
  const [expense, reload] = useFocusData(load);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const example = isExampleId(id);

  if (expense === undefined) return <ScreenSkeleton header={<TopBar />} />;
  if (expense === null) {
    return (
      <Screen header={<TopBar />}>
        <Notice tone="error">{d.notFound}</Notice>
      </Screen>
    );
  }

  const status = expenseStatus(expense, parisToday());
  const { documentUrl, document_path: documentPath } = expense;
  const isImage = expense.document_mime?.startsWith("image/") ?? false;

  async function togglePaid() {
    setFailure(null);
    setBusy(true);
    const ok = await setExpensePaid(id, status !== "paye");
    await reload();
    setBusy(false);
    if (!ok) setFailure(d.actionFailed);
  }

  function confirmDelete() {
    Alert.alert(d.deleteTitle, d.deleteText, [
      { text: d.deleteCancel, style: "cancel" },
      {
        text: d.deleteConfirm,
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          const ok = await deleteExpense(id);
          setBusy(false);
          if (ok) router.back();
          else setFailure(d.actionFailed);
        },
      },
    ]);
  }

  return (
    <Screen header={<TopBar />} onRefresh={reload}>
      <View style={styles.head}>
        <Title>{expense.title}</Title>
        <View style={styles.pills}>
          <ExpenseStatusPill status={status} />
          {example ? <ExampleBadge /> : null}
        </View>
        {status === "paye" && expense.paid_on ? (
          <Body muted>{d.paidOn(formatDay(expense.paid_on))}</Body>
        ) : status === "en_retard" && expense.due_on ? (
          <Body muted>{d.overdueSince(formatDay(expense.due_on))}</Body>
        ) : expense.due_on ? (
          <Body muted>{d.dueOn(formatDay(expense.due_on))}</Body>
        ) : null}
        <Text style={styles.amount}>{formatCents(expense.total_ttc_cents)}</Text>
      </View>

      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <ExampleLock locked={example} note>
        <View style={styles.actions}>
          <Button
            label={status === "paye" ? d.markUnpaid : d.markPaid}
            variant={status === "paye" ? "secondary" : "primary"}
            loading={busy}
            onPress={() => void togglePaid()}
          />
          <Button
            label={d.edit}
            variant="secondary"
            icon={Pencil}
            onPress={() => router.push(`/pro-depense/${id}/modifier`)}
          />
        </View>
      </ExampleLock>

      <Card>
        <Text style={styles.cardTitle}>{d.document}</Text>
        {documentUrl ? (
          <>
            {isImage ? (
              <Image
                source={{ uri: documentUrl }}
                style={styles.document}
                accessibilityLabel={d.documentAlt(expense.title)}
              />
            ) : null}
            <Button
              label={d.openDocument}
              variant="secondary"
              icon={ExternalLink}
              onPress={() => void WebBrowser.openBrowserAsync(documentUrl)}
            />
          </>
        ) : documentPath ? null : (
          <Body muted>{d.noDocument}</Body>
        )}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>{d.info}</Text>
        {expense.supplier_name ? <Row label={d.rows.supplier}>{expense.supplier_name}</Row> : null}
        {expense.reference ? <Row label={d.rows.reference}>{expense.reference}</Row> : null}
        <Row label={d.rows.chantier}>
          {expense.chantier_id && expense.chantier_title ? (
            <LinkText
              label={expense.chantier_title}
              onPress={() => router.push(`/pro-chantier/${expense.chantier_id}`)}
            />
          ) : (
            <ToClassifyPill />
          )}
        </Row>
        <Row label={d.rows.issuedOn}>{formatDay(expense.issued_on)}</Row>
        {expense.due_on ? <Row label={d.rows.dueOn}>{formatDay(expense.due_on)}</Row> : null}
        <Row label={d.rows.kind}>{t.kinds[expense.kind]}</Row>
        {expense.category ? (
          <Row label={d.rows.category}>{t.categories[expense.category]}</Row>
        ) : null}
        {expense.notes ? <Row label={d.rows.notes}>{expense.notes}</Row> : null}
        <View style={styles.totals}>
          <Row label={d.totals.ht}>{formatCents(expense.total_ht_cents)}</Row>
          <Row label={d.totals.tva}>{formatCents(expense.total_tva_cents)}</Row>
          <Row label={d.totals.ttc}>
            <Text style={styles.ttc}>{formatCents(expense.total_ttc_cents)}</Text>
          </Row>
        </View>
      </Card>

      {expense.lines.length > 0 ? (
        <Card>
          <Text style={styles.cardTitle}>{d.lines}</Text>
          <ExpenseLines lines={expense.lines} />
        </Card>
      ) : null}

      <ExampleLock locked={example}>
        <Button label={d.delete} variant="danger" disabled={busy} onPress={confirmDelete} />
      </ExampleLock>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: spacing(2) },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  amount: { fontFamily: font.medium, fontSize: 26, color: colors.foreground },
  actions: { gap: spacing(2) },
  cardTitle: { fontFamily: font.medium, fontSize: 17, color: colors.foreground },
  document: {
    width: "100%",
    height: 320,
    borderRadius: radius.input,
    backgroundColor: colors.background,
    resizeMode: "contain",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(4),
    paddingVertical: spacing(1.5),
  },
  rowLabel: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  rowValue: { flexShrink: 1, alignItems: "flex-end" },
  rowText: { fontFamily: font.regular, fontSize: 14, color: colors.foreground, textAlign: "right" },
  totals: {
    borderRadius: radius.input,
    backgroundColor: colors.background,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1),
  },
  ttc: { fontFamily: font.medium, fontSize: 14, color: colors.foreground },
});
