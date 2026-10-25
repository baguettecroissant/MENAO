import { formatQuantity, type ExpenseLinePrefill, type ExpenseStatus } from "@menao/core";
import { unit as unitLabel } from "@menao/documents";
import { X } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { formatCents } from "@/lib/format";
import { Tappable } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proExpenses;
const { colors, font, radius, spacing } = theme;

/** Couleur du statut, comme sur le site ; l'orangé reste à « À classer », qui demande une action. */
const TONE: Record<ExpenseStatus, { bg: string; fg: string }> = {
  paye: { bg: colors["success-soft"], fg: colors.success },
  en_retard: { bg: colors["danger-soft"], fg: colors.danger },
  a_payer: { bg: colors.background, fg: colors["muted-foreground"] },
};

function Pill({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <View style={[styles.dot, { backgroundColor: fg }]} />
      <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

/** Statut d'une dépense (F-62) : payée, à payer, en retard. */
export function ExpenseStatusPill({ status }: { status: ExpenseStatus }) {
  return <Pill label={t.statuses[status]} {...TONE[status]} />;
}

/** Dépense sans chantier. */
export function ToClassifyPill() {
  return <Pill label={t.toClassify} bg={colors["warning-soft"]} fg={colors.warning} />;
}

/** Lignes lues sur la pièce ; `onRemove` : un bouton pour retirer chaque ligne (formulaire). */
export function ExpenseLines({
  lines,
  onRemove,
}: {
  lines: readonly ExpenseLinePrefill[];
  onRemove?: (index: number) => void;
}) {
  return (
    <View style={styles.lines}>
      {lines.map((line, index) => (
        <View key={`${index}-${line.designation}`} style={styles.line}>
          <View style={styles.lineText}>
            <Text style={styles.designation}>{line.designation}</Text>
            <Text style={styles.lineMeta}>
              {[
                line.quantityMilli !== null &&
                  t.detail.lineQuantity(
                    formatQuantity(line.quantityMilli),
                    line.unit ? unitLabel(line.unit) : null,
                  ),
                line.unitPriceHtCents !== null && formatCents(line.unitPriceHtCents),
                line.reference,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
          {line.totalHtCents !== null ? (
            <Text style={styles.lineTotal}>{formatCents(line.totalHtCents)}</Text>
          ) : null}
          {onRemove ? (
            <Tappable
              role="button"
              aria-label={t.form.lines.remove(line.designation)}
              onPress={() => onRemove(index)}
              hitSlop={8}
              style={styles.remove}
            >
              <X size={16} color={colors["muted-foreground"]} />
            </Tappable>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing(1.5),
    borderRadius: radius.chip,
    paddingHorizontal: spacing(2),
    paddingVertical: 3,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontFamily: font.medium, fontSize: 12 },
  lines: { gap: spacing(2) },
  line: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(3),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: spacing(2),
  },
  lineText: { flex: 1, gap: 2 },
  designation: { fontFamily: font.regular, fontSize: 14, color: colors.foreground },
  lineMeta: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  lineTotal: { fontFamily: font.regular, fontSize: 14, color: colors.foreground },
  remove: { padding: 2 },
});
