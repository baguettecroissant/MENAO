import { StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { theme } from "@/ui/theme";

const t = fr.profile;
const { colors, font, spacing } = theme;
const ROWS = ["quality", "delays", "communication", "value_for_money"] as const;

export type ScoreDetail = Record<(typeof ROWS)[number], number> & {
  global: number;
  review_count: number;
};

/**
 * Score MENAO détaillé (F-28), comme sur le site : une barre par critère, le score global et le
 * nombre d'avis vérifiés. Sur la fiche d'un artisan et dans « Mes avis ».
 */
export function ScoreBreakdown({ score }: { score: ScoreDetail }) {
  return (
    <>
      {ROWS.map((row) => (
        <View key={row} style={styles.row}>
          <View style={styles.line}>
            <Text style={styles.label}>{t.scoreRows[row]}</Text>
            <Text style={styles.value}>{t.percent(score[row])}</Text>
          </View>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${score[row]}%` }]} />
          </View>
        </View>
      ))}
      <View style={styles.global}>
        <Text style={styles.globalLabel}>{t.scoreGlobal}</Text>
        <Text style={styles.globalValue}>{t.percent(score.global)}</Text>
      </View>
      <Text style={styles.basis}>{t.scoreBasis(score.review_count)}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing(1.5) },
  line: { flexDirection: "row", justifyContent: "space-between", gap: spacing(3) },
  label: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  value: { fontFamily: font.medium, fontSize: 13, color: colors["primary-strong"] },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors["primary-soft"], overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  global: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing(3),
  },
  globalLabel: { fontFamily: font.medium, fontSize: 17, color: colors.foreground },
  globalValue: { fontFamily: font.medium, fontSize: 24, color: colors["primary-strong"] },
  basis: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
});
