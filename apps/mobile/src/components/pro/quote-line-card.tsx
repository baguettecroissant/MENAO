import { formatQuantity, lineTotalHtCents } from "@menao/core";
import type { QuoteLineInput } from "@menao/validation";
import { Pencil, Trash2 } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { formatCents } from "@/lib/format";
import { theme } from "@/ui/theme";

const t = fr.proQuote;
const { colors, font, radius, spacing } = theme;
const vatLabel = (bp: number) => `${(bp / 100).toLocaleString("fr-FR")} %`;

/** Ligne du devis, comme sur le site : type, désignation, quantité × prix, TVA, total HT. */
export function LineCard({
  line,
  generated = false,
  assujettiTva,
  onEdit,
  onDelete,
}: {
  line: QuoteLineInput;
  /** Proposée par la dictée, à vérifier. */
  generated?: boolean;
  assujettiTva: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.tags}>
          <Text style={styles.tag}>{t.types[line.type]}</Text>
          {generated ? <Text style={[styles.tag, styles.review]}>{t.toReview}</Text> : null}
        </View>
        <View style={styles.actions}>
          <Pressable
            role="button"
            aria-label={t.editAction(line.designation)}
            onPress={onEdit}
            style={styles.icon}
          >
            <Pencil size={16} color={colors.primary} />
          </Pressable>
          <Pressable
            role="button"
            aria-label={t.remove(line.designation)}
            onPress={onDelete}
            style={styles.icon}
          >
            <Trash2 size={16} color={colors.danger} />
          </Pressable>
        </View>
      </View>
      <Text style={styles.designation}>{line.designation}</Text>
      {line.description ? <Text style={styles.small}>{line.description}</Text> : null}
      <View style={styles.amounts}>
        <Text style={styles.small}>
          {`${formatQuantity(line.quantityMilli)} ${t.units[line.unit]} × ${formatCents(line.unitPriceHtCents)}`}
          {assujettiTva ? ` · ${t.vat} ${vatLabel(line.vatRateBp)}` : ""}
        </Text>
        <Text style={styles.total}>
          {formatCents(lineTotalHtCents(line.quantityMilli, line.unitPriceHtCents))}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing(1.5),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  top: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing(1.5) },
  tag: {
    overflow: "hidden",
    borderRadius: radius.chip,
    backgroundColor: colors.background,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    fontFamily: font.regular,
    fontSize: 12,
    color: colors["muted-foreground"],
  },
  review: {
    backgroundColor: colors["warning-soft"],
    color: colors.warning,
    fontFamily: font.medium,
  },
  actions: { flexDirection: "row", marginTop: -spacing(2), marginRight: -spacing(2) },
  icon: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  designation: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  small: {
    flexShrink: 1,
    fontFamily: font.regular,
    fontSize: 12,
    color: colors["muted-foreground"],
  },
  amounts: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing(3),
  },
  total: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
});
