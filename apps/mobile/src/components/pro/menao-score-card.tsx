import { menaoScoreTips, type MenaoScoreTip } from "@menao/core";
import { router, type Href } from "expo-router";
import { CalendarCheck, ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MenaoScore } from "@/components/menao-score";
import { fr } from "@/i18n/fr";
import { formatDay } from "@/lib/format";
import { confirmPlanning, loadMenaoScore } from "@/lib/score";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, Card, Notice, Tappable } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proScore;
const { colors, font, spacing } = theme;

/** Écran où l'artisan gagne les points de chaque conseil. */
const TIP_HREF: Record<MenaoScoreTip["key"], Href> = {
  verifie: "/pro-documents",
  diplome: "/pro-metiers",
  qualification: "/pro-metiers",
  profil: "/pro-profil-public",
};

/**
 * Score MENAO de l'artisan (ADR 0155), comme sur le site : total, points de chaque critère et
 * conseils pour en gagner, sur « Mon grade MENAO ». Rechargé à chaque retour sur l'écran. Sans
 * lien vers le site (règle 10).
 */
export function MenaoScoreCard() {
  const [score] = useFocusData(loadMenaoScore);
  if (score === undefined) return null;
  if (score === null) return <Notice tone="error">{t.error}</Notice>;
  const tips = menaoScoreTips(score.parts, {
    verified: score.facts.verified,
    diploma: score.facts.diplome,
    qualification: score.facts.qualification,
  });
  return (
    <Card>
      <View style={styles.body}>
        <View style={styles.headText}>
          <Text role="heading" style={styles.title}>
            {t.title}
          </Text>
          <Body muted>{t.intro}</Body>
        </View>
        <MenaoScore score={{ score: score.score, ...score.parts }} />
        {tips.length > 0 ? (
          <View style={styles.tips}>
            <Text role="heading" style={styles.tipsTitle}>
              {t.tipsTitle}
            </Text>
            {tips.map((tip) => (
              <Tappable
                key={tip.key}
                onPress={() => router.push(TIP_HREF[tip.key])}
                accessibilityRole="link"
                style={styles.tip}
              >
                <Text style={styles.tipText}>{t.tips[tip.key]}</Text>
                <Text style={styles.tipPoints}>{t.tipPoints(tip.points)}</Text>
                <ChevronRight size={16} color={colors["subtle-foreground"]} />
              </Tappable>
            ))}
          </View>
        ) : null}
        <Text style={styles.hint}>{t.progressHint}</Text>
      </View>
    </Card>
  );
}

/** « Mon planning est à jour », à confirmer chaque semaine (« Mes disponibilités »). */
export function PlanningCard() {
  const [score, reload] = useFocusData(loadMenaoScore);
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<"confirmed" | "failed" | null>(null);
  if (score === undefined) return null;
  if (score === null) return <Notice tone="error">{t.error}</Notice>;

  async function confirm() {
    setPending(true);
    setOutcome(null);
    const ok = await confirmPlanning();
    setPending(false);
    setOutcome(ok ? "confirmed" : "failed");
    if (ok) await reload();
  }

  return (
    <Card>
      <View style={styles.body}>
        <Text style={styles.planningText}>
          {score.planning_updated_at
            ? t.planningUpdated(formatDay(score.planning_updated_at))
            : t.planningNever}{" "}
          {t.planningHint}
        </Text>
        {outcome === "confirmed" ? <Notice tone="success">{t.confirmed}</Notice> : null}
        {outcome === "failed" ? <Notice tone="error">{fr.errors.generic}</Notice> : null}
        <Button
          label={t.confirm}
          icon={CalendarCheck}
          variant="secondary"
          onPress={confirm}
          loading={pending}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing(4) },
  headText: { gap: spacing(1) },
  title: { fontFamily: font.medium, fontSize: 17, color: colors.foreground },
  tips: {
    gap: spacing(1),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing(3),
  },
  tipsTitle: { fontFamily: font.medium, fontSize: 14, color: colors.foreground },
  tip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    paddingVertical: spacing(2),
  },
  tipText: { flex: 1, fontFamily: font.regular, fontSize: 14, color: colors.foreground },
  tipPoints: { fontFamily: font.medium, fontSize: 14, color: colors.success },
  hint: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  planningText: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors["muted-foreground"],
  },
});
