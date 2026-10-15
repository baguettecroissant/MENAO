import {
  CLIENT_RATING_COMMENT_LIMITS,
  CLIENT_RATING_CRITERIA,
  reviewBand,
  type ClientRatingCriterion,
} from "@menao/core";
import { clientRatingSchema } from "@menao/validation";
import { Check, UserRound } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { RatingSlider } from "@/components/rating-slider";
import { fr } from "@/i18n/fr";
import { rateClient } from "@/lib/client-ratings";
import { Body, Button, Notice, TextField } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proClientRating;
const r = fr.clientReview;
const { colors, font, radius, spacing } = theme;
type Field = ClientRatingCriterion | "comment";

/**
 * Notation du client par l'artisan (F-23, ADR 0106), comme sur le site : trois curseurs de 0 à
 * 100 % et un commentaire de 50 caractères au moins, une fois le chantier clôturé. Jamais montrée
 * au client. Une fois la note enregistrée, la fiche du chantier affiche son résumé.
 */
export function ClientRatingForm({
  chantierId,
  clientName,
  visibleToNetwork,
  onRated,
}: {
  chantierId: string;
  clientName: string;
  /** Moyenne visible des artisans qui reçoivent une demande du client (paramètre de l'équipe). */
  visibleToNetwork: boolean;
  onRated: () => void;
}) {
  const [ratings, setRatings] = useState<Record<ClientRatingCriterion, number | null>>({
    welcome: null,
    clarity: null,
    payment: null,
  });
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    const parsed = clientRatingSchema.safeParse({
      welcome: ratings.welcome === null ? "" : String(ratings.welcome),
      clarity: ratings.clarity === null ? "" : String(ratings.clarity),
      payment: ratings.payment === null ? "" : String(ratings.payment),
      comment,
    });
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      setErrors({
        welcome: fields.welcome?.[0],
        clarity: fields.clarity?.[0],
        payment: fields.payment?.[0],
        comment: fields.comment?.[0],
      });
      return;
    }
    setErrors({});
    setFailure(null);
    setPending(true);
    const failed = await rateClient(chantierId, parsed.data);
    setPending(false);
    if (failed) return setFailure(failed);
    onRated();
  }

  const length = comment.trim().length;
  const enough = length >= CLIENT_RATING_COMMENT_LIMITS.min;
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <UserRound size={20} color={colors["primary-strong"]} />
        </View>
        <View style={styles.headText}>
          <Text role="heading" style={styles.title}>
            {t.title(clientName)}
          </Text>
          <Body muted>{t.intro}</Body>
        </View>
      </View>
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      {CLIENT_RATING_CRITERIA.map((criterion) => {
        const rating = ratings[criterion];
        return (
          <RatingSlider
            key={criterion}
            label={t.criteria[criterion]}
            value={rating}
            onChange={(next) => {
              setRatings((prev) => ({ ...prev, [criterion]: next }));
              setErrors((prev) => ({ ...prev, [criterion]: undefined }));
            }}
            valueText={rating === null ? r.unset : r.percent(rating)}
            caption={rating === null ? r.dragToRate : t.bands[criterion][reviewBand(rating)]}
            error={errors[criterion]}
          />
        );
      })}
      <View style={styles.comment}>
        <TextField
          label={t.commentTitle}
          hint={t.commentHelp}
          value={comment}
          onChangeText={(next) => {
            setComment(next);
            setErrors((prev) => ({ ...prev, comment: undefined }));
          }}
          placeholder={t.commentPlaceholder}
          maxLength={CLIENT_RATING_COMMENT_LIMITS.max}
          multiline
          error={errors.comment}
        />
        <View style={styles.count}>
          <Text style={[styles.countText, enough && styles.countOk]}>{r.commentCount(length)}</Text>
          {enough ? <Check size={14} color={colors.success} /> : null}
        </View>
      </View>
      <Button label={t.submit} onPress={submit} loading={pending} />
      <Text style={styles.privacy}>
        {t.privacy} {visibleToNetwork ? t.privacyNetwork : t.privacyTeam}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing(4),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  head: { flexDirection: "row", alignItems: "flex-start", gap: spacing(3) },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  headText: { flex: 1, gap: spacing(1) },
  title: { fontFamily: font.medium, fontSize: 16, lineHeight: 22, color: colors["primary-strong"] },
  comment: { gap: spacing(2) },
  count: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing(1),
  },
  countText: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  countOk: { color: colors.success },
  privacy: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors["muted-foreground"],
  },
});
