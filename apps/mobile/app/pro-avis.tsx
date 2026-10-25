import { router } from "expo-router";
import { Info } from "lucide-react-native";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusPill } from "@/components/chantier/parts";
import { ReviewCard } from "@/components/pro/review-card";
import { ScoreBreakdown } from "@/components/score-breakdown";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { formatLongDate } from "@/lib/dates";
import { formatDay } from "@/lib/format";
import { loadMyReviews } from "@/lib/pro-reviews";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Card, Notice, ScreenSkeleton, Title } from "@/ui";
import { theme } from "@/ui/theme";
import { EmptyState } from "@/components/empty-state";
import { useExamplesActive } from "@/lib/examples";

const t = fr.proReviews;
const { colors, font, radius, spacing } = theme;

/**
 * « Mes avis » de l'artisan (F-28), comme sur le site : avis reçus (publiés ou masqués par
 * l'équipe) avec réponse publique et signalement, nombre d'avis sans réponse, score MENAO détaillé
 * et fonctionnement des avis. Aucun lien vers le site (règle 10).
 */
export default function MyReviews() {
  const [data, reload] = useFocusData(loadMyReviews);
  const examples = useExamplesActive();
  const [refreshing, setRefreshing] = useState(false);

  if (data === undefined) return <ScreenSkeleton header={<TopBar />} />;
  const reviews = data?.reviews ?? [];
  const toAnswer = reviews.filter((r) => r.status === "publie" && r.reply === null).length;
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TopBar />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            onRefresh={async () => {
              setRefreshing(true);
              await reload();
              setRefreshing(false);
            }}
          />
        }
      >
        <View style={styles.head}>
          <Title>{t.title}</Title>
          <Body muted>{t.subtitle}</Body>
        </View>
        {data === null ? <Notice tone="error">{t.error}</Notice> : null}
        {reviews.length > 0 ? (
          <Text
            style={[styles.toAnswer, toAnswer > 0 ? styles.toAnswerWarning : styles.toAnswerDone]}
          >
            {t.toAnswer(toAnswer)}
          </Text>
        ) : null}
        {data && reviews.length === 0 ? (
          <EmptyState illustration="avis">{t.empty}</EmptyState>
        ) : null}
        {reviews.map((review) => {
          const title = data?.chantierTitles.get(review.chantierId);
          return (
            <ReviewCard
              key={review.id}
              review={review}
              heading={review.authorName}
              onReplied={reload}
              example={examples}
              meta={
                <View style={styles.meta}>
                  <Text style={styles.small}>{t.publishedOn(formatDay(review.createdAt))}</Text>
                  <Text style={styles.small}>
                    {fr.profile.receivedOn(formatLongDate(review.experienceOn))}
                  </Text>
                  {title ? (
                    <Pressable
                      role="link"
                      hitSlop={8}
                      onPress={() => router.push(`/pro-chantier/${review.chantierId}`)}
                    >
                      <Text style={styles.link}>{t.chantier(title)}</Text>
                    </Pressable>
                  ) : null}
                  {review.status === "masque" ? (
                    <StatusPill text={t.hidden} tone="neutral" />
                  ) : review.reply === null ? (
                    <StatusPill text={t.noReply} tone="warning" />
                  ) : null}
                </View>
              }
            />
          );
        })}
        {data ? (
          <Card>
            <Text role="heading" style={styles.heading}>
              {t.scoreTitle}
            </Text>
            {data.score ? <ScoreBreakdown score={data.score} /> : <Body muted>{t.scoreEmpty}</Body>}
          </Card>
        ) : null}
        <Card>
          <View style={styles.row}>
            <Info size={18} color={colors.primary} />
            <Text role="heading" style={styles.heading}>
              {t.howTitle}
            </Text>
          </View>
          {t.how.map((line) => (
            <View key={line} style={styles.bullet}>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.text}>{line}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing(5), paddingTop: spacing(2) },
  content: { padding: spacing(5), gap: spacing(4), paddingBottom: spacing(10) },
  head: { gap: spacing(2) },
  toAnswer: {
    overflow: "hidden",
    borderRadius: radius.input,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    fontFamily: font.medium,
    fontSize: 13,
  },
  toAnswerWarning: { backgroundColor: colors["warning-soft"], color: colors.warning },
  toAnswerDone: { backgroundColor: colors["success-soft"], color: colors.success },
  meta: { gap: spacing(1) },
  small: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  link: { fontFamily: font.medium, fontSize: 12, color: colors["primary-strong"] },
  heading: { fontFamily: font.medium, fontSize: 17, color: colors.foreground },
  row: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  bullet: { flexDirection: "row", gap: spacing(2) },
  dot: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.primary },
  text: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.foreground,
  },
});
