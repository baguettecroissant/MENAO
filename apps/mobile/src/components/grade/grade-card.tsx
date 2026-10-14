import { levelProgress } from "@menao/core";
import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BadgeIcon } from "./badge-icon";
import { fr } from "@/i18n/fr";
import type { GradeView } from "@/lib/grade";
import { theme } from "@/ui/theme";

const t = fr.grade;
const { colors, font, radius, spacing } = theme;

/**
 * Accès à « Mon grade MENAO » depuis le tableau de bord (F-24) : niveau, points vers le niveau
 * suivant, dernier badge obtenu.
 */
export function GradeCard({ grade }: { grade: GradeView }) {
  const { current, next, progress } = levelProgress(grade.levels, grade.xp);
  const lastBadge = grade.badges
    .filter((b) => b.unlocked_at)
    .sort((a, b) => (b.unlocked_at ?? "").localeCompare(a.unlocked_at ?? ""))[0];
  return (
    <Pressable
      role="link"
      aria-label={t.title}
      onPress={() => router.push("/pro-grade")}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <BadgeIcon
        code={lastBadge?.code ?? "main_d_argent"}
        unlocked={Boolean(lastBadge)}
        size={44}
      />
      <View style={styles.text}>
        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.meta}>
          {t.card(current?.level ?? 1)} · {t.xp(grade.xp, next?.xpMin ?? null)}
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      </View>
      <ChevronRight size={18} color={colors["muted-foreground"]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  pressed: { opacity: 0.85 },
  text: { flex: 1, gap: spacing(1) },
  title: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  meta: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  track: {
    height: 6,
    overflow: "hidden",
    borderRadius: radius.pill,
    backgroundColor: colors["primary-soft"],
  },
  fill: { height: 6, borderRadius: radius.pill, backgroundColor: colors.primary },
});
