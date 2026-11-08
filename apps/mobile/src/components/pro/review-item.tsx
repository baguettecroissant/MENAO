import { reviewAwaitsReply, reviewStars } from "@menao/core";
import { router } from "expo-router";
import { Reply, Star } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/components/avatar";
import { ExampleLock } from "@/components/examples";
import { FicheButton, FicheTag } from "@/components/pro/fiche-kit";
import { ReplyForm, ReportForm } from "@/components/pro/review-card";
import { fr } from "@/i18n/fr";
import { formatDay } from "@/lib/format";
import type { ArtisanReview } from "@/lib/pro-reviews";
import { Button, Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proReviews;
const { colors, font, radius, spacing } = theme;

/**
 * Un avis dans la liste « Avis » de l'artisan (refonte « Nette », lot 5) : initiale, nom,
 * « chantier · date », étoiles et score, texte ; puis « Sans réponse » et « Répondre » (le
 * formulaire de réponse publique s'ouvre dessous), ou « Votre réponse » sur fond beige. Avis
 * masqué par l'équipe : sa mention et son motif. Signalement à l'équipe sous chaque avis publié.
 */
export function ReviewItem({
  review,
  chantierTitle,
  onReplied,
  example,
}: {
  review: ArtisanReview;
  chantierTitle: string | null;
  onReplied: () => void;
  /** Exemples (ADR 0184) : réponse et signalement inactifs. */
  example: boolean;
}) {
  const [replying, setReplying] = useState(false);
  const stars = reviewStars(review.score);
  const date = formatDay(review.createdAt);
  const published = review.status === "publie";
  const awaiting = reviewAwaitsReply(review);
  return (
    <View style={styles.item}>
      <View style={styles.head}>
        <Avatar url={null} name={review.authorName} size={40} />
        <View style={styles.who}>
          <Text role="heading" style={styles.name} numberOfLines={1}>
            {review.authorName}
          </Text>
          {chantierTitle ? (
            <Pressable
              role="link"
              aria-label={t.openChantier(chantierTitle, date)}
              hitSlop={6}
              onPress={() => router.push(`/pro-chantier/${review.chantierId}`)}
            >
              <Text style={styles.meta} numberOfLines={1}>
                {`${chantierTitle} · ${date}`}
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.meta}>{date}</Text>
          )}
        </View>
        <View role="img" aria-label={fr.profile.stars(review.score, stars)} style={styles.score}>
          <View style={styles.stars}>
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                size={14}
                color={i < stars ? colors.primary : colors["border-strong"]}
                fill={i < stars ? colors.primary : "transparent"}
              />
            ))}
          </View>
          <Text style={styles.percent}>{fr.clientReview.percent(review.score)}</Text>
        </View>
      </View>
      <Text style={styles.text}>{review.comment}</Text>
      {published ? null : (
        <View style={styles.tag}>
          <FicheTag text={t.hidden} tone="neutral" />
        </View>
      )}
      {!published && review.moderationReason ? (
        <Notice tone="info">{fr.proFollowUp.reviewHidden(review.moderationReason)}</Notice>
      ) : null}
      {review.reply ? (
        <View style={styles.reply}>
          <Text style={styles.replyTitle}>{t.yourReply}</Text>
          <Text style={styles.replyText}>{review.reply}</Text>
        </View>
      ) : awaiting ? (
        <>
          <View style={styles.tag}>
            <FicheTag text={t.noReply} tone="warning" dot />
          </View>
          <ExampleLock locked={example} note={replying}>
            {replying ? (
              <View style={styles.form}>
                <ReplyForm reviewId={review.id} onReplied={onReplied} />
                <Button label={t.replyCancel} variant="ghost" onPress={() => setReplying(false)} />
              </View>
            ) : (
              <View style={styles.tag}>
                <FicheButton
                  label={t.reply}
                  icon={Reply}
                  variant="secondary"
                  onPress={() => setReplying(true)}
                />
              </View>
            )}
          </ExampleLock>
        </>
      ) : null}
      {published && !example ? <ReportForm reviewId={review.id} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { gap: spacing(2.5), paddingHorizontal: spacing(4), paddingVertical: spacing(4.5) },
  head: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  who: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontFamily: font.bold, fontSize: 15, color: colors.foreground },
  meta: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  score: { alignItems: "flex-end", gap: 2 },
  stars: { flexDirection: "row", gap: 1 },
  percent: { fontFamily: font.semibold, fontSize: 12, color: colors["primary-strong"] },
  text: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.label },
  tag: { alignSelf: "flex-start" },
  reply: {
    gap: spacing(1),
    borderRadius: radius.input,
    backgroundColor: colors.background,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(3),
  },
  replyTitle: {
    fontFamily: font.bold,
    fontSize: 12,
    letterSpacing: 0.5,
    color: colors["muted-foreground"],
  },
  replyText: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  form: { gap: spacing(1) },
});
