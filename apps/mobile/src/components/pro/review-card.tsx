import {
  REVIEW_CRITERIA,
  REVIEW_REPLY_MAX_LENGTH,
  REVIEW_REPORT_LIMITS,
  reviewStars,
} from "@menao/core";
import { reviewReplySchema, reviewReportSchema } from "@menao/validation";
import { Flag, Star } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { replyToReview, reportReview, type ArtisanReview } from "@/lib/pro-reviews";
import { Button, Card, Notice, TextField } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proFollowUp;
const r = fr.clientReview;
const p = fr.proReviews;
const { colors, font, radius, spacing } = theme;

/**
 * Avis du client sur un chantier, côté artisan (F-28), comme sur le site : notes, commentaire,
 * réponse publique (une seule fois) et signalement à l'équipe MENAO. Sur la fiche du chantier
 * comme dans « Mes avis ».
 */
export function ReviewCard({
  review,
  heading,
  meta,
  onReplied,
}: {
  review: ArtisanReview;
  heading: string;
  /** Lignes sous le titre (dates, chantier, « Sans réponse »). */
  meta?: ReactNode;
  onReplied: () => void;
}) {
  const stars = reviewStars(review.score);
  return (
    <Card>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text role="heading" style={styles.heading}>
            {heading}
          </Text>
          {meta}
        </View>
        <View
          role="img"
          aria-label={fr.profile.stars(review.score, stars)}
          style={styles.scoreBlock}
        >
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
          <Text style={styles.percent}>{r.percent(review.score)}</Text>
        </View>
      </View>
      {review.status === "masque" && review.moderationReason ? (
        <Notice tone="info">{t.reviewHidden(review.moderationReason)}</Notice>
      ) : null}
      <View style={styles.criteria}>
        {REVIEW_CRITERIA.map((criterion) => {
          // Propreté absente des avis antérieurs à ce critère (ADR 0091).
          const value = review[criterion];
          return value === null ? null : (
            <View key={criterion} style={styles.line}>
              <Text style={styles.label}>{r.criteria[criterion]}</Text>
              <Text style={styles.value}>{r.percent(value)}</Text>
            </View>
          );
        })}
        <View style={styles.line}>
          <Text style={styles.label}>{r.valueTitle}</Text>
          <Text style={[styles.value, styles.valueText]}>{r.values[review.valueForMoney]}</Text>
        </View>
      </View>
      <Text style={styles.text}>{review.comment}</Text>
      {review.reply ? (
        <View style={styles.reply}>
          <Text style={styles.replyTitle}>{t.yourReply}</Text>
          <Text style={styles.text}>{review.reply}</Text>
        </View>
      ) : review.status === "publie" ? (
        <ReplyForm reviewId={review.id} onReplied={onReplied} />
      ) : null}
      {review.status === "publie" ? <ReportForm reviewId={review.id} /> : null}
    </Card>
  );
}

/** F-28 : réponse publique de l'artisan à l'avis de son client, une seule fois. */
function ReplyForm({ reviewId, onReplied }: { reviewId: string; onReplied: () => void }) {
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    const parsed = reviewReplySchema.safeParse({ reply });
    if (!parsed.success) {
      setError(z.flattenError(parsed.error).fieldErrors.reply?.[0]);
      return;
    }
    setError(undefined);
    setFailure(null);
    setPending(true);
    const failed = await replyToReview(reviewId, parsed.data.reply);
    setPending(false);
    if (failed) return setFailure(failed);
    setSent(true);
    onReplied();
  }

  if (sent) return <Notice tone="success">{t.replySent}</Notice>;
  return (
    <View style={styles.form}>
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <TextField
        label={t.replyLabel}
        hint={t.replyHint}
        value={reply}
        onChangeText={(value) => {
          setReply(value);
          setError(undefined);
        }}
        maxLength={REVIEW_REPLY_MAX_LENGTH}
        multiline
        error={error}
      />
      <Button label={t.replySubmit} onPress={submit} loading={pending} />
    </View>
  );
}

/** F-28 : signalement de l'avis à l'équipe MENAO, avec un motif. */
function ReportForm({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    const parsed = reviewReportSchema.safeParse({ reason });
    if (!parsed.success) {
      setError(z.flattenError(parsed.error).fieldErrors.reason?.[0]);
      return;
    }
    setError(undefined);
    setFailure(null);
    setPending(true);
    const failed = await reportReview(reviewId, parsed.data.reason);
    setPending(false);
    if (failed) return setFailure(failed);
    setSent(true);
  }

  if (sent) return <Notice tone="success">{p.reportSent}</Notice>;
  if (!open) {
    return (
      <Pressable role="button" hitSlop={8} onPress={() => setOpen(true)} style={styles.reportLink}>
        <Flag size={14} color={colors["muted-foreground"]} />
        <Text style={styles.small}>{p.report}</Text>
      </Pressable>
    );
  }
  return (
    <View aria-label={p.reportTitle} style={styles.report}>
      <TextField
        label={p.reportLabel}
        hint={p.reportHint}
        value={reason}
        onChangeText={(value) => {
          setReason(value);
          setError(undefined);
        }}
        maxLength={REVIEW_REPORT_LIMITS.max}
        multiline
        error={error}
      />
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <Button label={p.reportSubmit} onPress={submit} loading={pending} />
      <Button label={p.reportCancel} variant="ghost" onPress={() => setOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing(3),
  },
  headText: { flex: 1, gap: spacing(1) },
  heading: { fontFamily: font.medium, fontSize: 17, color: colors.foreground },
  scoreBlock: { alignItems: "flex-end", gap: spacing(1) },
  stars: { flexDirection: "row", gap: 2 },
  percent: { fontFamily: font.medium, fontSize: 14, color: colors["primary-strong"] },
  criteria: { gap: spacing(2) },
  line: { flexDirection: "row", justifyContent: "space-between", gap: spacing(3) },
  label: {
    flexShrink: 1,
    fontFamily: font.regular,
    fontSize: 14,
    color: colors["muted-foreground"],
  },
  value: { fontFamily: font.medium, fontSize: 14, color: colors.foreground },
  valueText: { flexShrink: 1, textAlign: "right" },
  text: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.foreground },
  reply: {
    gap: spacing(1),
    borderLeftWidth: 2,
    borderLeftColor: colors["primary-soft"],
    paddingLeft: spacing(3),
  },
  replyTitle: { fontFamily: font.medium, fontSize: 12, color: colors["primary-strong"] },
  form: { gap: spacing(2) },
  small: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  reportLink: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  report: {
    gap: spacing(2),
    borderRadius: radius.input,
    backgroundColor: colors.background,
    padding: spacing(3),
  },
});
