import { MENAO_SCORE_PARTS, MENAO_SCORE_POINTS } from "@menao/core";
import type { MenaoScoreParts } from "@menao/validation";
import { StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { theme } from "@/ui/theme";

const t = fr.profile;
const { colors, font, radius, spacing } = theme;
const pointsFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

/**
 * Score MENAO sur 100 (ADR 0155), comme sur le site : total et points de chaque critère, sur la
 * fiche d'un artisan et dans l'espace de l'artisan.
 */
export function MenaoScore({ score }: { score: MenaoScoreParts }) {
  return (
    <View style={styles.body}>
      <Text style={styles.total} accessibilityLabel={t.scoreTotal(Math.round(score.score))}>
        {Math.round(score.score)} <Text style={styles.outOf}>{t.scoreOutOf}</Text>
      </Text>
      <View style={styles.list}>
        {MENAO_SCORE_PARTS.map((part) => {
          const max = MENAO_SCORE_POINTS[part];
          const points = t.scorePoints(pointsFormat.format(score[part]), max);
          return (
            <View
              key={part}
              style={styles.item}
              accessible
              aria-label={`${t.scoreParts[part]} : ${points}`}
            >
              <View style={styles.row}>
                <Text style={styles.label}>{t.scoreParts[part]}</Text>
                <Text style={styles.value}>{points}</Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[styles.fill, { width: `${Math.min(100, (score[part] / max) * 100)}%` }]}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing(3) },
  total: { fontFamily: font.bold, fontSize: 32, color: colors["primary-strong"] },
  outOf: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  list: { gap: spacing(3) },
  item: { gap: spacing(1) },
  row: { flexDirection: "row", justifyContent: "space-between", gap: spacing(2) },
  label: { flex: 1, fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  value: { fontFamily: font.medium, fontSize: 13, color: colors["primary-strong"] },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors["primary-soft"],
    overflow: "hidden",
  },
  fill: { height: "100%", backgroundColor: colors.primary },
});
