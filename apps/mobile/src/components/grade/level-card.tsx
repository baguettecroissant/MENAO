import { levelProgress, nextReward, type GradeLevel } from "@menao/core";
import { Shirt } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { theme } from "@/ui/theme";

const t = fr.grade;
const { colors, font, radius, spacing } = theme;

/**
 * Carte de niveau (maquette « Mon grade Menao ») : points sur le seuil du niveau suivant et
 * pourcentage, barre entre « Niv. N » et « Niv. N+1 », prochaine récompense de niveau.
 */
export function LevelCard({ xp, levels }: { xp: number; levels: readonly GradeLevel[] }) {
  const { current, next, progress } = levelProgress(levels, xp);
  const level = current?.level ?? 1;
  const reward = nextReward(levels, level);
  const percent = Math.round(progress * 100);
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.small}>{t.xp(xp, next?.xpMin ?? null)}</Text>
        <Text style={styles.percent}>{next ? `${percent} %` : t.maxLevel}</Text>
      </View>
      <View style={styles.bar}>
        <LevelPill label={t.level(level)} filled />
        <View
          style={styles.track}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <View style={[styles.fill, { width: `${percent}%` }]} />
        </View>
        {next ? <LevelPill label={t.level(next.level)} filled={false} /> : null}
      </View>
      {reward ? (
        <View style={styles.reward}>
          <Text style={[styles.small, styles.center]}>{t.nextReward}</Text>
          <Text style={styles.rewardName}>{reward.reward}</Text>
          <View style={styles.rewardImage}>
            <Shirt size={56} color={colors.primary} strokeWidth={1.4} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function LevelPill({ label, filled }: { label: string; filled: boolean }) {
  return (
    <View style={[styles.pill, filled && styles.pillFilled]}>
      <Text style={[styles.pillText, filled && styles.pillTextFilled]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing(3),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  small: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  percent: { fontFamily: font.medium, fontSize: 12, color: colors.primary },
  bar: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  track: {
    flex: 1,
    height: 8,
    overflow: "hidden",
    borderRadius: radius.pill,
    backgroundColor: colors["primary-soft"],
  },
  fill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.primary },
  pill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors["primary-soft"],
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
  },
  pillFilled: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { fontFamily: font.medium, fontSize: 11, color: colors["primary-strong"] },
  pillTextFilled: { color: colors["primary-foreground"] },
  reward: { alignItems: "center", gap: spacing(1) },
  center: { textAlign: "center" },
  rewardName: { fontFamily: font.medium, fontSize: 14, color: colors["primary-strong"] },
  rewardImage: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing(2),
    minHeight: 110,
    borderRadius: radius.input,
    backgroundColor: colors["primary-softer"],
  },
});
