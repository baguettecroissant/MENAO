import {
  REVIEW_COMMENT_LIMITS,
  REVIEW_CRITERIA,
  VALUE_FOR_MONEY,
  reviewBand,
  type ReviewCriterion,
  type ValueForMoney,
} from "@menao/core";
import { reviewSchema } from "@menao/validation";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Check, CircleCheck, MapPin } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { PersonRow } from "@/components/chantier/parts";
import { HeaderBand } from "@/components/header-band";
import { RadioGroup } from "@/components/radio-group";
import { RatingSlider } from "@/components/rating-slider";
import { StepTabs } from "@/components/step-tabs";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { loadReviewState, submitReview } from "@/lib/reviews";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, Card, LinkText, Notice, Screen, TextField } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.clientReview;
const { colors, font, radius, spacing } = theme;
const VALUES = VALUE_FOR_MONEY.map((value) => ({ value, label: t.values[value] }));
type Field = ReviewCriterion | "value_for_money" | "comment";

/**
 * Avis du client (F-28), comme sur le site (maquettes « Comment s'est passée votre expérience ? »
 * et « Merci pour votre évaluation ») : trois curseurs, rapport qualité/prix, commentaire de
 * 50 caractères au moins. Ordre de fin de chantier (F-27) : PV, solde, puis avis.
 */
export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback(() => loadReviewState(id), [id]);
  const [state, reload] = useFocusData(load);
  const [ratings, setRatings] = useState<Record<ReviewCriterion, number | null>>({
    quality: null,
    delays: null,
    communication: null,
    cleanliness: null,
  });
  const [value, setValue] = useState<ValueForMoney | null>(null);
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (state === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (state === null) {
    return (
      <Screen header={<TopBar />}>
        <Notice tone="error">{fr.chantier.notFound}</Notice>
      </Screen>
    );
  }
  if (!state.reviewed && !state.allowed) return <Redirect href={`/chantier/${id}`} />;

  const steps = [
    { key: "pv", label: fr.reception.steps.pv },
    { key: "solde", label: fr.reception.steps.solde },
    { key: "avis", label: t.steps.avis },
  ] as const;

  const band = (
    <HeaderBand
      title={state.title}
      meta={state.address ? [{ icon: MapPin, text: state.address }] : []}
    >
      <StepTabs steps={steps} current="avis" />
    </HeaderBand>
  );

  if (state.reviewed) {
    return (
      <Screen band={band}>
        <Card>
          <View style={styles.thanks}>
            <View style={styles.badge}>
              <Check size={24} color={colors["primary-foreground"]} strokeWidth={2.5} />
            </View>
            <Text role="heading" style={styles.thanksTitle}>
              {t.thanksTitle}
            </Text>
            <Body muted center>
              {t.thanksText}
            </Body>
            <Button label={t.back} onPress={() => router.dismissTo(`/chantier/${id}`)} />
            <LinkText
              label={t.seeProfile(state.artisanName)}
              onPress={() =>
                router.push({
                  pathname: "/projet/[id]/artisan/[artisanId]",
                  params: { id: state.projectId, artisanId: state.artisanId },
                })
              }
            />
          </View>
        </Card>
      </Screen>
    );
  }

  async function submit() {
    const parsed = reviewSchema.safeParse({
      quality: ratings.quality === null ? "" : String(ratings.quality),
      delays: ratings.delays === null ? "" : String(ratings.delays),
      communication: ratings.communication === null ? "" : String(ratings.communication),
      cleanliness: ratings.cleanliness === null ? "" : String(ratings.cleanliness),
      value_for_money: value ?? "",
      comment,
    });
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      setErrors({
        quality: fields.quality?.[0],
        delays: fields.delays?.[0],
        communication: fields.communication?.[0],
        value_for_money: fields.value_for_money?.[0],
        comment: fields.comment?.[0],
      });
      return;
    }
    setErrors({});
    setFailure(null);
    setPending(true);
    const failed = await submitReview(id, parsed.data);
    setPending(false);
    if (failed) return setFailure(failed);
    await reload();
  }

  const length = comment.trim().length;
  const enough = length >= REVIEW_COMMENT_LIMITS.min;
  return (
    <Screen band={band} footer={<Button label={t.submit} onPress={submit} loading={pending} />}>
      <View style={styles.intro}>
        <View style={styles.badge}>
          <CircleCheck size={24} color={colors["primary-foreground"]} />
        </View>
        <Text role="heading" style={styles.title}>
          {t.title(state.artisanName)}
        </Text>
        <Body muted center>
          {t.intro}
        </Body>
      </View>
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <Card>
        <View style={styles.criteria}>
          <PersonRow
            name={state.artisanName}
            detail={state.tradeLabel}
            photoUrl={state.avatarUrl}
          />
          {REVIEW_CRITERIA.map((criterion) => {
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
                valueText={rating === null ? t.unset : t.percent(rating)}
                caption={rating === null ? t.dragToRate : t.bands[criterion][reviewBand(rating)]}
                error={errors[criterion]}
              />
            );
          })}
          <RadioGroup
            legend={t.valueTitle}
            options={VALUES}
            value={value}
            onChange={(next) => {
              setValue(next);
              setErrors((prev) => ({ ...prev, value_for_money: undefined }));
            }}
            error={errors.value_for_money}
          />
        </View>
      </Card>
      <View style={styles.comment}>
        <Text role="heading" style={styles.commentTitle}>
          {t.commentTitle}
        </Text>
        <Body muted>{t.commentHelp}</Body>
        <TextField
          label={t.commentLabel}
          value={comment}
          onChangeText={(next) => {
            setComment(next);
            setErrors((prev) => ({ ...prev, comment: undefined }));
          }}
          placeholder={t.commentPlaceholder(state.artisanName)}
          maxLength={REVIEW_COMMENT_LIMITS.max}
          multiline
          error={errors.comment}
        />
        <View style={styles.count}>
          <Text style={[styles.countText, enough && styles.countOk]}>{t.commentCount(length)}</Text>
          {enough ? <Check size={14} color={colors.success} /> : null}
        </View>
      </View>
      <Body muted center>
        {t.visibility(state.artisanName)}
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  intro: { alignItems: "center", gap: spacing(3) },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: font.medium,
    fontSize: 21,
    lineHeight: 27,
    textAlign: "center",
    color: colors.foreground,
  },
  criteria: { gap: spacing(5) },
  comment: {
    gap: spacing(3),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  commentTitle: { fontFamily: font.medium, fontSize: 16, color: colors["primary-strong"] },
  count: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing(1),
  },
  countText: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  countOk: { color: colors.success },
  thanks: { alignItems: "center", gap: spacing(4), paddingVertical: spacing(4) },
  thanksTitle: {
    fontFamily: font.medium,
    fontSize: 20,
    textAlign: "center",
    color: colors.foreground,
  },
});
