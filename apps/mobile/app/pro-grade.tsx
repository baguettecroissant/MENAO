import { claimableReward } from "@menao/core";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BottomSheet } from "@/components/bottom-sheet";
import { BadgeIcon } from "@/components/grade/badge-icon";
import { LevelCard } from "@/components/grade/level-card";
import { HeaderBand } from "@/components/header-band";
import { CharterScoreCard } from "@/components/pro/charter-score-card";
import { Segmented } from "@/components/segmented";
import { fr } from "@/i18n/fr";
import { formatDateNumeric } from "@/lib/format";
import { loadGrade, type GradeView } from "@/lib/grade";
import { useFocusData } from "@/lib/use-focus-data";
import { Button, Notice, Screen, Tappable } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.grade;
const { colors, font, radius, spacing } = theme;

type Badge = GradeView["badges"][number];

/**
 * « Mon grade MENAO » (F-24, maquettes « Mon grade Menao - Objectifs / Badges ») : niveau et
 * points, score MENAO de la charte (ADR 0105), prochaine récompense, objectifs en cours puis
 * atteints, badges à obtenir puis obtenus (un appui ouvre la progression du badge), récompense du
 * niveau 5 à réclamer.
 */
export default function GradeScreen() {
  // Rechargé à chaque retour sur l'écran (récompense demandée, nouveau badge).
  const [grade] = useFocusData(loadGrade);
  const [tab, setTab] = useState<"objectives" | "badges">("objectives");
  const [open, setOpen] = useState<Badge | null>(null);

  const band = <HeaderBand title={t.title} />;
  if (grade === undefined) return <Screen band={band}>{null}</Screen>;
  if (grade === null) {
    return (
      <Screen band={band}>
        <Notice tone="error">{t.error}</Notice>
      </Screen>
    );
  }
  const claimable = claimableReward(grade.levels, grade.level, grade.claimedLevels);
  const claimed = grade.levels.some((l) => l.reward && grade.claimedLevels.includes(l.level));
  const current = grade.objectives.filter((o) => !o.achieved_at);
  const achieved = grade.objectives.filter((o) => o.achieved_at);
  const toEarn = grade.badges.filter((b) => !b.unlocked_at);
  const earned = grade.badges.filter((b) => b.unlocked_at);

  return (
    <Screen band={band}>
      <LevelCard xp={grade.xp} levels={grade.levels} />
      <CharterScoreCard />
      {claimable ? (
        <View style={styles.claim}>
          <Text style={styles.claimTitle}>{t.rewardReady}</Text>
          <Text style={styles.small}>{claimable.reward}</Text>
          <Button
            label={t.claim}
            onPress={() =>
              router.push({ pathname: "/pro-recompense", params: { niveau: claimable.level } })
            }
          />
        </View>
      ) : claimed ? (
        <Notice tone="success">{t.claimed}</Notice>
      ) : null}

      <Segmented
        label={t.tabs.label}
        options={[
          { value: "objectives", label: t.tabs.objectives },
          { value: "badges", label: t.tabs.badges },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "objectives" ? (
        <>
          <Text role="heading" style={styles.section}>
            {t.objectivesTitle}
          </Text>
          {current.length === 0 ? <Notice tone="success">{t.noObjective}</Notice> : null}
          {current.map((o) => (
            <View key={o.code} style={styles.objective}>
              <View style={styles.objectiveHead}>
                <View style={styles.objectiveText}>
                  <Text style={styles.objectiveTitle}>{o.title}</Text>
                  <Text style={styles.small}>{o.description}</Text>
                </View>
                <View style={styles.xp}>
                  <Text style={styles.xpText}>{t.xpGain(o.xp)}</Text>
                </View>
              </View>
              <ProgressBar value={o.progress} target={o.target} />
            </View>
          ))}
          {achieved.length > 0 ? (
            <>
              <Text role="heading" style={styles.section}>
                {t.achievedTitle}
              </Text>
              {achieved.map((o) => (
                <View key={o.code} style={[styles.objective, styles.objectiveDone]}>
                  <View style={styles.objectiveHead}>
                    <View style={styles.objectiveText}>
                      <Text style={styles.objectiveTitle}>{o.title}</Text>
                      <Text style={styles.small}>{o.description}</Text>
                      {o.achieved_at ? (
                        <Text style={styles.small}>
                          {t.achievedOn(formatDateNumeric(o.achieved_at))}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.xp}>
                      <Text style={styles.xpText}>{t.xpGain(o.xp)}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </>
          ) : null}
        </>
      ) : (
        <>
          <Text role="heading" style={styles.section}>
            {t.badgesToEarn}
          </Text>
          <BadgeGrid badges={toEarn} onOpen={setOpen} />
          <Text role="heading" style={styles.section}>
            {t.badgesEarned}
          </Text>
          {earned.length === 0 ? (
            <Text style={styles.small}>{t.noBadge}</Text>
          ) : (
            <BadgeGrid badges={earned} onOpen={setOpen} />
          )}
        </>
      )}

      {/* Maquette « Artisan exceptionnel » : progression d'un badge. */}
      <BottomSheet
        visible={open !== null}
        onClose={() => setOpen(null)}
        title={open?.label ?? ""}
        closeLabel={t.close}
      >
        {open ? (
          <View style={styles.sheet}>
            <BadgeIcon code={open.code} unlocked={Boolean(open.unlocked_at)} size={96} />
            <View style={styles.status}>
              <Text style={styles.statusText}>
                {open.unlocked_at ? t.earnedOn(formatDateNumeric(open.unlocked_at)) : t.inProgress}
              </Text>
            </View>
            <Text style={[styles.small, styles.center]}>{open.description}</Text>
            <View style={styles.sheetProgress}>
              <View style={styles.between}>
                <Text style={styles.objectiveTitle}>{t.progression}</Text>
                <Text style={styles.percent}>{t.progress(open.progress, open.target)}</Text>
              </View>
              <ProgressBar value={open.progress} target={open.target} hideCount />
              {!open.unlocked_at ? (
                <Text style={styles.small}>{t.remaining(open.target - open.progress)}</Text>
              ) : null}
            </View>
            <Button label={t.continue} onPress={() => setOpen(null)} />
          </View>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

function ProgressBar({
  value,
  target,
  hideCount = false,
}: {
  value: number;
  target: number;
  hideCount?: boolean;
}) {
  const ratio = target > 0 ? Math.min(1, value / target) : 0;
  return (
    <View style={styles.progressRow}>
      <View
        style={styles.track}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={value}
      >
        <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
      </View>
      {hideCount ? null : <Text style={styles.small}>{t.progress(value, target)}</Text>}
    </View>
  );
}

function BadgeGrid({ badges, onOpen }: { badges: Badge[]; onOpen: (badge: Badge) => void }) {
  return (
    <View style={styles.grid}>
      {badges.map((b) => (
        <Tappable
          key={b.code}
          role="button"
          aria-label={b.label}
          onPress={() => onOpen(b)}
          style={styles.badge}
        >
          <BadgeIcon code={b.code} unlocked={Boolean(b.unlocked_at)} />
          <Text style={styles.badgeLabel} numberOfLines={2}>
            {b.label}
          </Text>
          {b.unlocked_at ? null : (
            <View style={styles.badgeTrack}>
              <View
                style={[styles.fill, { width: `${Math.min(1, b.progress / b.target) * 100}%` }]}
              />
            </View>
          )}
        </Tappable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  claim: {
    gap: spacing(2),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  claimTitle: { fontFamily: font.medium, fontSize: 16, color: colors["primary-strong"] },
  section: { fontFamily: font.medium, fontSize: 16, color: colors.foreground },
  small: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors["muted-foreground"],
  },
  center: { textAlign: "center" },
  percent: { fontFamily: font.medium, fontSize: 13, color: colors.primary },
  objective: {
    gap: spacing(3),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  objectiveDone: { backgroundColor: colors.background },
  objectiveHead: { flexDirection: "row", alignItems: "flex-start", gap: spacing(3) },
  objectiveText: { flex: 1, gap: 2 },
  objectiveTitle: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  xp: {
    borderRadius: radius.pill,
    backgroundColor: colors["primary-soft"],
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
  },
  xpText: { fontFamily: font.medium, fontSize: 12, color: colors["primary-strong"] },
  progressRow: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  track: {
    flex: 1,
    height: 6,
    overflow: "hidden",
    borderRadius: radius.pill,
    backgroundColor: colors["primary-soft"],
  },
  fill: { height: 6, borderRadius: radius.pill, backgroundColor: colors.primary },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing(3) },
  badge: {
    width: "31%",
    alignItems: "center",
    gap: spacing(2),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(3),
  },
  badgeLabel: {
    minHeight: 32,
    fontFamily: font.medium,
    fontSize: 12,
    textAlign: "center",
    color: colors.foreground,
  },
  badgeTrack: {
    alignSelf: "stretch",
    height: 4,
    overflow: "hidden",
    borderRadius: radius.pill,
    backgroundColor: colors["primary-soft"],
  },
  sheet: { alignItems: "center", gap: spacing(3) },
  status: {
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1),
  },
  statusText: { fontFamily: font.medium, fontSize: 12, color: colors["muted-foreground"] },
  sheetProgress: { alignSelf: "stretch", gap: spacing(2) },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
