import {
  formatQuantity,
  formatRateBp,
  lineTotalHtCents,
  lineTtcCents,
  markupRateBp,
} from "@menao/core";
import type { QuoteLineInput } from "@menao/validation";
import { Pencil, Trash2 } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FicheTag, type FicheTone } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { formatCents } from "@/lib/format";
import { theme } from "@/ui/theme";

const t = fr.proQuote;
const { colors, font, radius, spacing } = theme;
const vatLabel = (bp: number) => `${(bp / 100).toLocaleString("fr-FR")} %`;

/** Couleur de la puce du type, comme la maquette : matériel en bleu, main d'œuvre en vert. */
const TYPE_TONE: Record<QuoteLineInput["type"], FicheTone> = {
  materiel: "primary",
  main_oeuvre: "success",
  autre: "neutral",
};

/**
 * Ligne du devis dans la carte « Lignes du devis » (maquette « DevisApp ») : puce du type,
 * « À vérifier » si la ligne vient de la dictée, désignation, description, « quantité × prix HT »
 * (et le taux de TVA), total TTC de la ligne à droite (calcul de @menao/core), modifier et
 * supprimer dessous.
 */
export function LineCard({
  line,
  generated = false,
  assujettiTva,
  costCents,
  onEdit,
  onDelete,
}: {
  line: QuoteLineInput;
  /** Proposée par la dictée, à vérifier. */
  generated?: boolean;
  assujettiTva: boolean;
  /** Coût de la ligne (privé, ADR 0294) ; undefined : marge masquée, null : coût inconnu. */
  costCents?: number | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const rate =
    costCents == null
      ? null
      : markupRateBp(lineTotalHtCents(line.quantityMilli, line.unitPriceHtCents), costCents);
  const amount = t.lineAmount(
    `${formatQuantity(line.quantityMilli)} ${t.unitsShort[line.unit]}`,
    formatCents(line.unitPriceHtCents),
  );
  return (
    <View style={styles.row}>
      <View style={styles.main}>
        <View style={styles.tags}>
          <FicheTag text={t.types[line.type]} tone={TYPE_TONE[line.type]} />
          {generated ? <FicheTag text={t.toReview} tone="warning" dot /> : null}
        </View>
        <Text style={styles.designation}>{line.designation}</Text>
        {line.description ? <Text style={styles.description}>{line.description}</Text> : null}
        <Text style={styles.amount}>
          {assujettiTva ? `${amount} · ${t.vat} ${vatLabel(line.vatRateBp)}` : amount}
        </Text>
      </View>
      <View style={styles.side}>
        <Text style={styles.total}>{formatCents(lineTtcCents(line))}</Text>
        <Text style={styles.totalLabel}>{assujettiTva ? t.ttc : t.ht}</Text>
        {/* Marge de la ligne, pour l'artisan seul (maquette du lot 36 : sous le prix). */}
        {costCents !== undefined ? (
          <FicheTag
            text={
              rate === null
                ? t.library.unknownCost
                : rate < 0
                  ? t.library.loss
                  : t.library.lineMargin(formatRateBp(rate))
            }
            tone={rate === null ? "neutral" : rate < 0 ? "danger" : "success"}
          />
        ) : null}
        <View style={styles.actions}>
          <Pressable
            role="button"
            aria-label={t.editAction(line.designation)}
            onPress={onEdit}
            hitSlop={4}
            style={({ pressed }) => [styles.icon, pressed && styles.pressed]}
          >
            <Pencil size={16} color={colors["muted-foreground"]} />
          </Pressable>
          <Pressable
            role="button"
            aria-label={t.remove(line.designation)}
            onPress={onDelete}
            hitSlop={4}
            style={({ pressed }) => [styles.icon, pressed && styles.pressed]}
          >
            <Trash2 size={16} color={colors.danger} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(3.5),
    paddingHorizontal: spacing(4),
    paddingTop: spacing(4),
    paddingBottom: spacing(2),
  },
  main: { flex: 1, minWidth: 0, gap: spacing(1) },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing(1.5) },
  designation: {
    fontFamily: font.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.foreground,
  },
  description: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors["muted-foreground"],
  },
  amount: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  side: { alignItems: "flex-end", gap: spacing(1) },
  total: {
    fontFamily: font.display,
    fontSize: 17,
    fontVariant: ["tabular-nums"],
    color: colors.foreground,
  },
  totalLabel: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  actions: { flexDirection: "row", gap: spacing(1), marginRight: -spacing(2) },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { backgroundColor: colors["primary-soft"] },
});
