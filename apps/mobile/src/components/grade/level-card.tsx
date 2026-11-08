import { levelProgress, nextReward, type GradeLevel } from "@menao/core";
import { StyleSheet, Text, View } from "react-native";
import { ProgressBar } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { theme } from "@/ui/theme";

const t = fr.grade;
const { colors, font, spacing } = theme;
/** Blanc estompé sur le bleu nuit (contraste AA conservé). */
const SOFT_WHITE = "rgba(255, 255, 255, 0.8)";

/**
 * Carte de niveau, refonte « Nette » (lot 8, maquette « GradeNette ») : sur fond bleu nuit, le
 * niveau en grand, les points sur le seuil du niveau suivant, une barre blanche et la prochaine
 * récompense de niveau.
 */
export function LevelCard({ xp, levels }: { xp: number; levels: readonly GradeLevel[] }) {
  const { current, next, progress } = levelProgress(levels, xp);
  const level = current?.level ?? 1;
  const reward = nextReward(levels, level);
  const percent = Math.round(progress * 100);
  const rewardText = reward?.reward ? t.nextRewardText(reward.reward) : next ? null : t.maxLevel;
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{t.levelEyebrow}</Text>
      <View style={styles.row}>
        <Text role="heading" style={styles.level}>
          {t.levelBig(level)}
        </Text>
        <Text style={styles.xp}>{t.xp(xp, next?.xpMin ?? null)}</Text>
      </View>
      {next ? (
        <ProgressBar
          value={percent}
          target={100}
          label={t.levelProgress}
          color={colors.surface}
          track="rgba(255, 255, 255, 0.18)"
          height={10}
        />
      ) : null}
      {rewardText ? <Text style={styles.reward}>{rewardText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing(3.5),
    borderRadius: 18,
    backgroundColor: colors.foreground,
    padding: spacing(6),
  },
  eyebrow: { fontFamily: font.bold, fontSize: 13, letterSpacing: 0.8, color: SOFT_WHITE },
  row: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", columnGap: spacing(2.5) },
  level: {
    fontFamily: font.display,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1,
    color: colors["primary-foreground"],
  },
  xp: { fontFamily: font.regular, fontSize: 15, color: SOFT_WHITE },
  reward: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: SOFT_WHITE },
});
