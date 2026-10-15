import { CHARTER_SCORE_WEIGHTS, type CharterScoreKey } from "@menao/core";
import { CalendarCheck } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { formatDay } from "@/lib/format";
import { confirmPlanning, loadCharterScore, type CharterScore } from "@/lib/score";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, Card, Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proScore;
const { colors, font, radius, spacing } = theme;

// Colonnes renvoyées par my_charter_score() pour chaque critère de la charte.
const COLUMN: Record<CharterScoreKey, keyof CharterScore> = {
  notes: "notes",
  delai72h: "delai72h",
  reactivite: "reactivite",
  planning: "planning",
  chantiersTermines: "chantiers_termines",
  anciennete: "anciennete",
};

/**
 * Score MENAO de la charte qualité (ADR 0105), comme sur le site : total, critères pondérés et
 * « Mon planning est à jour », sur « Mon grade MENAO » et « Mes disponibilités ». Rechargée à
 * chaque retour sur l'écran. Sans lien vers le site (règle 10).
 */
export function CharterScoreCard() {
  const [score, reload] = useFocusData(loadCharterScore);
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
        <View style={styles.head}>
          <View style={styles.headText}>
            <Text role="heading" style={styles.title}>
              {t.title}
            </Text>
            <Body muted>{t.intro}</Body>
          </View>
          <Text style={styles.total}>
            {score.score} <Text style={styles.outOf}>{t.outOf}</Text>
          </Text>
        </View>
        <View style={styles.list}>
          {CHARTER_SCORE_WEIGHTS.map((w) => {
            const value = Number(score[COLUMN[w.key]] ?? 0);
            return (
              <View
                key={w.key}
                style={styles.item}
                accessible
                aria-label={t.criterion(w.label, t.weight(w.weight), t.value(value))}
              >
                <View style={styles.row}>
                  <Text style={styles.label}>
                    {w.label} <Text style={styles.weight}>({t.weight(w.weight)})</Text>
                  </Text>
                  <Text style={styles.value}>{t.value(value)}</Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, value))}%` }]} />
                </View>
              </View>
            );
          })}
        </View>
        <View style={styles.planning}>
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
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing(4) },
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing(3),
  },
  headText: { flex: 1, gap: spacing(1) },
  title: { fontFamily: font.medium, fontSize: 17, color: colors.foreground },
  total: { fontFamily: font.bold, fontSize: 28, color: colors["primary-strong"] },
  outOf: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  list: { gap: spacing(3) },
  item: { gap: spacing(1) },
  row: { flexDirection: "row", justifyContent: "space-between", gap: spacing(2) },
  label: { flex: 1, fontFamily: font.regular, fontSize: 14, color: colors.foreground },
  weight: { color: colors["muted-foreground"] },
  value: { fontFamily: font.medium, fontSize: 14, color: colors.foreground },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors["primary-soft"],
    overflow: "hidden",
  },
  fill: { height: "100%", backgroundColor: colors.primary },
  planning: {
    gap: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing(3),
  },
  planningText: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors["muted-foreground"],
  },
});
