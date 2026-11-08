import { claimableReward } from "@menao/core";
import { router } from "expo-router";
import { Check } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BottomSheet } from "@/components/bottom-sheet";
import { BadgeIcon } from "@/components/grade/badge-icon";
import { LevelCard } from "@/components/grade/level-card";
import { GroupTitle, ListGroup } from "@/components/list-kit";
import {
  FicheButton,
  FicheScreen,
  FicheSkeleton,
  FicheTag,
  NextStepCard,
} from "@/components/pro/fiche-kit";
import { MenaoScoreCard } from "@/components/pro/menao-score-card";
import { IconSquare, ProgressBar } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { formatDateNumeric } from "@/lib/format";
import { loadGrade, type GradeView } from "@/lib/grade";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, Tappable } from "@/ui";
import { theme } from "@/ui/theme";
import { withTeamPermission } from "@/components/team-gate";

const t = fr.grade;
const { colors, font, radius, spacing } = theme;

type Badge = GradeView["badges"][number];

/**
 * « Mon grade MENAO » (F-24) : niveau et points, score MENAO de la charte (ADR 0105), prochaine
 * récompense, objectifs en cours puis atteints, badges obtenus puis à obtenir (un appui ouvre la
 * progression du badge), récompense du niveau 5 à réclamer. Refonte « Nette » (lot 8, maquette
 * « GradeNette » en une colonne) : carte de niveau bleu nuit, objectifs avec leur barre et leurs
 * points, badges en grille (à obtenir estompés).
 */
function GradeScreen() {
  // Rechargé à chaque retour sur l'écran (récompense demandée, nouveau badge).
  const [grade] = useFocusData(loadGrade);
  const [open, setOpen] = useState<Badge | null>(null);

  if (grade === undefined) return <FicheSkeleton title={t.title} />;
  if (grade === null) {
    return (
      <FicheScreen title={t.title}>
        <Notice tone="error">{t.error}</Notice>
      </FicheScreen>
    );
  }
  const claimable = claimableReward(grade.levels, grade.level, grade.claimedLevels);
  const claimed = grade.levels.some((l) => l.reward && grade.claimedLevels.includes(l.level));
  const current = grade.objectives.filter((o) => !o.achieved_at);
  const achieved = grade.objectives.filter((o) => o.achieved_at);
  const toEarn = grade.badges.filter((b) => !b.unlocked_at);
  const earned = grade.badges.filter((b) => b.unlocked_at);

  return (
    <FicheScreen title={t.title}>
      <LevelCard xp={grade.xp} levels={grade.levels} />
      {claimable ? (
        <NextStepCard title={t.rewardReady} text={claimable.reward}>
          <FicheButton
            label={t.claim}
            tall
            onPress={() =>
              router.push({ pathname: "/pro-recompense", params: { niveau: claimable.level } })
            }
          />
        </NextStepCard>
      ) : claimed ? (
        <Notice tone="success">{t.claimed}</Notice>
      ) : null}
      <MenaoScoreCard />

      <GroupTitle title={t.objectivesTitle} count={current.length} />
      {current.length === 0 ? (
        <Notice tone="success">{t.noObjective}</Notice>
      ) : (
        <ListGroup>
          {current.map((o) => (
            <View key={o.code} style={styles.objective}>
              <View style={styles.objectiveHead}>
                <Text style={styles.objectiveTitle}>{o.title}</Text>
                <FicheTag text={t.xpGain(o.xp)} tone="primary" />
              </View>
              <Text style={styles.small}>{o.description}</Text>
              <ProgressBar
                value={o.progress}
                target={o.target}
                label={t.objectiveProgress(o.title)}
              />
              <Text style={styles.small}>{t.badgesCount(o.progress, o.target)}</Text>
            </View>
          ))}
        </ListGroup>
      )}

      {achieved.length > 0 ? (
        <>
          <GroupTitle title={t.achievedTitle} count={achieved.length} />
          <ListGroup>
            {achieved.map((o) => (
              <View key={o.code} style={styles.achieved}>
                <IconSquare icon={Check} tone="success" />
                <View style={styles.achievedText}>
                  <Text style={styles.objectiveTitle}>{o.title}</Text>
                  {o.achieved_at ? (
                    <Text style={styles.small}>
                      {t.achievedOn(formatDateNumeric(o.achieved_at))}
                    </Text>
                  ) : null}
                </View>
                <FicheTag text={t.xpGain(o.xp)} tone="success" />
              </View>
            ))}
          </ListGroup>
        </>
      ) : null}

      <GroupTitle title={t.tabs.badges} count={t.badgesCount(earned.length, grade.badges.length)} />
      {earned.length === 0 ? <Text style={styles.small}>{t.noBadge}</Text> : null}
      <BadgeGrid badges={[...earned, ...toEarn]} onOpen={setOpen} />

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
              <ProgressBar value={open.progress} target={open.target} label={t.progression} />
              {!open.unlocked_at ? (
                <Text style={styles.small}>{t.remaining(open.target - open.progress)}</Text>
              ) : null}
            </View>
            <FicheButton label={t.continue} tall onPress={() => setOpen(null)} />
          </View>
        ) : null}
      </BottomSheet>
    </FicheScreen>
  );
}

function BadgeGrid({ badges, onOpen }: { badges: Badge[]; onOpen: (badge: Badge) => void }) {
  return (
    <View style={styles.grid}>
      {badges.map((b) => {
        const on = Boolean(b.unlocked_at);
        return (
          <Tappable
            key={b.code}
            role="button"
            aria-label={on ? t.badgeEarned(b.label) : t.badgeToEarn(b.label, b.progress, b.target)}
            onPress={() => onOpen(b)}
            style={styles.badge}
          >
            <View style={on ? null : styles.faded}>
              <BadgeIcon code={b.code} unlocked={on} />
            </View>
            <Text style={[styles.badgeLabel, !on && styles.badgeLabelOff]} numberOfLines={2}>
              {b.label}
            </Text>
            {on ? null : (
              <View style={styles.badgeBar}>
                <ProgressBar value={b.progress} target={b.target} label={b.label} height={4} />
              </View>
            )}
          </Tappable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  small: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  center: { textAlign: "center" },
  percent: { fontFamily: font.semibold, fontSize: 13, color: colors["primary-strong"] },
  objective: { gap: spacing(2), paddingHorizontal: spacing(5), paddingVertical: spacing(4) },
  objectiveHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing(3),
  },
  objectiveTitle: {
    flexShrink: 1,
    fontFamily: font.bold,
    fontSize: 15,
    lineHeight: 21,
    color: colors.foreground,
  },
  achieved: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3.5),
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3.5),
  },
  achievedText: { flex: 1, gap: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing(3) },
  badge: {
    width: "31%",
    flexGrow: 1,
    maxWidth: "32%",
    alignItems: "center",
    gap: spacing(2),
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(4),
  },
  faded: { opacity: 0.45 },
  badgeBar: { alignSelf: "stretch", paddingHorizontal: spacing(2) },
  badgeLabel: {
    minHeight: 32,
    fontFamily: font.bold,
    fontSize: 13,
    lineHeight: 16,
    textAlign: "center",
    color: colors.foreground,
  },
  badgeLabelOff: { color: colors["muted-foreground"] },
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

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("storefront", GradeScreen);
