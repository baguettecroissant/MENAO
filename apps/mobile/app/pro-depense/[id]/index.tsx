import { expenseStatus, isExampleId, parisToday, type ExpenseStatus } from "@menao/core";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Check, ExternalLink, Pencil, RotateCcw } from "lucide-react-native";
import { useCallback, useState, type ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { ExampleBadge, ExampleLock } from "@/components/examples";
import { ExpenseLines, ToClassifyPill } from "@/components/pro/expense-parts";
import {
  CardHeading,
  FicheButton,
  FicheCard,
  FicheHead,
  FicheRow,
  FicheScreen,
  FicheSkeleton,
  FicheTag,
  type FicheTone,
} from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { formatCents, formatDay, formatDayMonth } from "@/lib/format";
import {
  deleteExpense,
  expenseScreenKey,
  hideExpense,
  loadExpenseView,
  setExpensePaid,
  unhideExpense,
} from "@/lib/pro-expenses";
import { invalidateScreen, readScreenPreview } from "@/lib/screen-cache";
import { runUndoable } from "@/lib/undo";
import { useFocusData } from "@/lib/use-focus-data";
import { LinkText, Notice, toast } from "@/ui";
import { theme } from "@/ui/theme";
import { withTeamPermission } from "@/components/team-gate";

const t = fr.proExpenses;
const d = t.detail;
const { colors, font, spacing } = theme;

const STATUS_TONE: Record<ExpenseStatus, FicheTone> = {
  a_payer: "warning",
  en_retard: "danger",
  paye: "success",
};

/** Ligne « intitulé : valeur » de la carte Détails, valeur libre (lien du chantier, pastille). */
function Row({ label, children }: { label: string; children: ReactNode }) {
  if (typeof children === "string") return <FicheRow label={label} value={children} />;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowValue}>{children}</View>
    </View>
  );
}

/**
 * Fiche d'une dépense (F-62), comme sur le site : statut, pièce (URL signée), informations,
 * totaux et lignes lues ; « Marquer comme payée », « Modifier » et « Supprimer la dépense ».
 * Exemples (ADR 0184) : la fiche se lit, les boutons sont inactifs. Refonte « Nette » (lot 8,
 * maquette « DepenseNette » en une colonne) : pastilles catégorie et état, carte du total TTC,
 * carte Détails, aperçu de la pièce.
 */
function ExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback(() => loadExpenseView(id), [id]);
  const [expense, reload] = useFocusData(load, undefined, expenseScreenKey(id));
  // Payée ou non : affiché tout de suite, avant la réponse du serveur (ADR 0195).
  const [paidOverride, setPaidOverride] = useState<boolean | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const example = isExampleId(id);

  if (expense === undefined) {
    return <FicheSkeleton title={t.title} preview={readScreenPreview(expenseScreenKey(id))} />;
  }
  if (expense === null) {
    return (
      <FicheScreen title={t.title}>
        <Notice tone="error">{d.notFound}</Notice>
      </FicheScreen>
    );
  }

  const today = parisToday();
  const view =
    paidOverride === null ? expense : { ...expense, paid_on: paidOverride ? today : null };
  const status = expenseStatus(view, today);
  const { documentUrl, document_path: documentPath } = expense;
  const isImage = expense.document_mime?.startsWith("image/") ?? false;

  // Payée ou non : tout de suite à l'écran, puis enregistré ; « Annuler » revient en arrière.
  async function setPaid(paid: boolean) {
    setFailure(null);
    setPaidOverride(paid);
    const ok = await setExpensePaid(id, paid);
    if (!ok) {
      setPaidOverride(null);
      setFailure(d.actionFailed);
      return;
    }
    await reload();
    setPaidOverride(null);
    invalidateScreen("tab:depenses");
    toast.undo(paid ? d.markedPaid : d.markedUnpaid, fr.toastUndo, () => void setPaid(!paid));
  }

  // Suppression annulable (ADR 0195) : la dépense disparaît tout de suite, et n'est supprimée
  // qu'au bout de 5 secondes, sauf « Annuler ».
  function remove() {
    runUndoable({
      message: d.deleted,
      apply: () => {
        hideExpense(id);
        invalidateScreen("tab:depenses");
        router.back();
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
      failed: d.actionFailed,
    });
  }

  const statusText =
    status !== "paye" && expense.due_on
      ? d.statusDue(t.statuses[status], formatDayMonth(expense.due_on))
      : t.statuses[status];
  const meta = [expense.supplier_name, expense.reference, formatDay(expense.issued_on)]
    .filter(Boolean)
    .join(" · ");

  return (
    <FicheScreen title={t.title} onRefresh={reload}>
      <FicheHead
        tags={
          <>
            {expense.category ? (
              <FicheTag text={t.categories[expense.category]} tone="primary" />
            ) : null}
            <FicheTag text={statusText} tone={STATUS_TONE[status]} dot />
            {example ? <ExampleBadge /> : null}
          </>
        }
        title={expense.title}
        meta={meta}
      />

      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <ExampleLock locked={example} note>
        <View style={styles.actions}>
          <FicheButton
            label={d.edit}
            variant="secondary"
            icon={Pencil}
            onPress={() => router.push(`/pro-depense/${id}/modifier`)}
          />
          <FicheButton
            label={status === "paye" ? d.markUnpaid : d.markPaid}
            variant={status === "paye" ? "secondary" : "primary"}
            icon={status === "paye" ? RotateCcw : Check}
            grow
            onPress={() => void setPaid(status !== "paye")}
          />
        </View>
      </ExampleLock>

      <FicheCard padding={5.5} gap={3}>
        <Text style={styles.totalLabel}>{d.totals.ttc}</Text>
        <Text
          style={styles.total}
          accessibilityLabel={`${d.totals.ttc} : ${formatCents(expense.total_ttc_cents)}`}
        >
          {formatCents(expense.total_ttc_cents)}
        </Text>
        <View>
          <FicheRow label={d.totals.ht} value={formatCents(expense.total_ht_cents)} />
          <FicheRow label={d.totals.tva} value={formatCents(expense.total_tva_cents)} />
        </View>
      </FicheCard>

      <FicheCard gap={2}>
        <CardHeading title={d.details} size={17} />
        <View>
          {expense.supplier_name ? (
            <Row label={d.rows.supplier}>{expense.supplier_name}</Row>
          ) : null}
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
          <Row label={d.rows.kind}>{t.kinds[expense.kind]}</Row>
          {expense.category ? (
            <Row label={d.rows.category}>{t.categories[expense.category]}</Row>
          ) : null}
          <Row label={d.rows.issuedOn}>{formatDay(expense.issued_on)}</Row>
          {expense.due_on ? <Row label={d.rows.dueOn}>{formatDay(expense.due_on)}</Row> : null}
          {status === "paye" && view.paid_on ? (
            <Row label={d.rows.paidOn}>{formatDay(view.paid_on)}</Row>
          ) : null}
          {expense.notes ? <Row label={d.rows.notes}>{expense.notes}</Row> : null}
        </View>
      </FicheCard>

      <FicheCard gap={3}>
        <CardHeading
          title={d.document}
          size={17}
          link={
            documentUrl
              ? {
                  label: d.openDocument,
                  onPress: () => void WebBrowser.openBrowserAsync(documentUrl),
                }
              : null
          }
        />
        {documentUrl ? (
          isImage ? (
            <Image
              source={{ uri: documentUrl }}
              style={styles.document}
              accessibilityLabel={d.documentAlt(expense.title)}
            />
          ) : (
            <FicheButton
              label={d.openDocument}
              variant="secondary"
              icon={ExternalLink}
              onPress={() => void WebBrowser.openBrowserAsync(documentUrl)}
            />
          )
        ) : documentPath ? null : (
          <Text style={styles.muted}>{d.noDocument}</Text>
        )}
      </FicheCard>

      {expense.lines.length > 0 ? (
        <FicheCard gap={3}>
          <CardHeading title={d.lines} size={17} />
          <ExpenseLines lines={expense.lines} />
        </FicheCard>
      ) : null}

      <ExampleLock locked={example}>
        <Pressable
          role="button"
          onPress={remove}
          hitSlop={6}
          style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
        >
          <Text style={styles.deleteText}>{d.delete}</Text>
        </Pressable>
      </ExampleLock>
    </FicheScreen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: spacing(2.5) },
  totalLabel: { fontFamily: font.semibold, fontSize: 14, color: colors.label },
  total: {
    fontFamily: font.display,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
    color: colors.foreground,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(3),
    minHeight: 37,
    paddingVertical: spacing(1),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowLabel: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  rowValue: { flexShrink: 1, alignItems: "flex-end" },
  document: {
    width: "100%",
    height: 320,
    borderRadius: 14,
    backgroundColor: colors.background,
    resizeMode: "contain",
  },
  muted: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors["muted-foreground"],
  },
  delete: {
    alignSelf: "center",
    minHeight: theme.touchTarget,
    justifyContent: "center",
    paddingHorizontal: spacing(4),
  },
  deleteText: { fontFamily: font.semibold, fontSize: 15, color: colors.danger },
  pressed: { opacity: 0.7 },
});

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("money", ExpenseScreen);
