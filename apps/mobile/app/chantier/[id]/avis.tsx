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
import { Check, CircleCheck, Eye } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { PersonRow } from "@/components/chantier/parts";
import {
  ActionScreen,
  ActionSubmit,
  JourneySteps,
  RadioCards,
  SectionLabel,
  SentCard,
} from "@/components/pro/action-kit";
import { FicheCard, FicheScreen, FicheSkeleton } from "@/components/pro/fiche-kit";
import { IconSquare, ToolField } from "@/components/pro/tools-kit";
import { RatingSlider } from "@/components/rating-slider";
import { fr } from "@/i18n/fr";
import { loadReviewState, submitReview } from "@/lib/reviews";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.clientReview;
const { colors, font, spacing } = theme;
// Fin de chantier (F-27) : PV, solde, puis avis.
const STEPS = [fr.reception.steps.pv, fr.reception.steps.solde, t.steps.avis];
const VALUES = VALUE_FOR_MONEY.map((value) => ({ value, label: t.values[value] }));
type Field = ReviewCriterion | "value_for_money" | "comment";

/**
 * Avis du client (F-28), comme sur le site (maquettes « Comment s'est passée votre expérience ? »
 * et « Merci pour votre évaluation ») : trois curseurs, rapport qualité/prix, commentaire de
 * 50 caractères au moins. Ordre de fin de chantier (F-27) : PV, solde, puis avis. Écran « Nette »
 * (lot 11) : critères en barres vertes avec leur libellé, rapport qualité/prix en cartes,
 * commentaire en 16 points avec son compteur, « Publier mon avis » collé en bas.
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

  if (state === undefined) return <FicheSkeleton title={t.steps.avis} />;
  if (state === null) {
    return (
      <FicheScreen title={t.steps.avis} onRefresh={reload}>
        <Notice tone="error">{fr.chantier.notFound}</Notice>
      </FicheScreen>
    );
  }
  if (!state.reviewed && !state.allowed) return <Redirect href={`/chantier/${id}`} />;

  const journey = <JourneySteps label={fr.reception.stepsLabel} steps={STEPS} current={2} />;
  const meta = [state.title, state.address].filter(Boolean).join(" · ");

  if (state.reviewed) {
    return (
      <ActionScreen
        bar={t.steps.avis}
        steps={journey}
        title={t.thanksTitle}
        meta={meta}
        footer={<ActionSubmit label={t.back} onPress={() => router.dismissTo(`/chantier/${id}`)} />}
      >
        <SentCard text={t.thanksText} />
        <Pressable
          role="link"
          hitSlop={8}
          style={styles.linkBox}
          onPress={() =>
            router.push({
              pathname: "/projet/[id]/artisan/[artisanId]",
              params: { id: state.projectId, artisanId: state.artisanId },
            })
          }
        >
          <Text style={styles.link}>{t.seeProfile(state.artisanName)}</Text>
        </Pressable>
      </ActionScreen>
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
    <ActionScreen
      bar={t.steps.avis}
      steps={journey}
      title={t.title(state.artisanName)}
      lead={t.intro}
      meta={meta}
      footer={<ActionSubmit label={t.submit} onPress={submit} loading={pending} />}
    >
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <FicheCard padding={4} gap={0}>
        <PersonRow name={state.artisanName} detail={state.tradeLabel} photoUrl={state.avatarUrl} />
        {REVIEW_CRITERIA.map((criterion) => {
          const rating = ratings[criterion];
          return (
            <View key={criterion} style={styles.criterion}>
              <RatingSlider
                nette
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
            </View>
          );
        })}
      </FicheCard>
      <RadioCards
        legend={t.valueTitle}
        options={VALUES}
        value={value}
        onChange={(next) => {
          setValue(next);
          setErrors((prev) => ({ ...prev, value_for_money: undefined }));
        }}
        error={errors.value_for_money}
      />
      <FicheCard padding={4} gap={2.5}>
        <View style={styles.commentHead}>
          <IconSquare icon={CircleCheck} tone="primary" size={36} />
          <View style={styles.commentTexts}>
            <SectionLabel text={t.commentTitle} />
            <Text style={styles.small}>{t.commentHelp}</Text>
          </View>
        </View>
        <ToolField
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
          <Text aria-live="polite" style={[styles.countText, enough && styles.countOk]}>
            {t.commentCount(length)}
          </Text>
          {enough ? <Check size={14} color={colors.success} strokeWidth={2.6} /> : null}
        </View>
      </FicheCard>
      <View style={styles.visibility}>
        <Eye size={16} color={colors["muted-foreground"]} style={styles.visibilityIcon} />
        <Text style={[styles.small, styles.flex]}>{t.visibility(state.artisanName)}</Text>
      </View>
    </ActionScreen>
  );
}

const styles = StyleSheet.create({
  criterion: {
    marginTop: spacing(3),
    paddingTop: spacing(3),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  commentHead: { flexDirection: "row", alignItems: "flex-start", gap: spacing(3) },
  commentTexts: { flex: 1, gap: spacing(1) },
  small: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors["muted-foreground"],
  },
  flex: { flex: 1 },
  count: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing(1),
  },
  countText: { fontFamily: font.semibold, fontSize: 13, color: colors["muted-foreground"] },
  countOk: { color: colors.success },
  visibility: { flexDirection: "row", alignItems: "flex-start", gap: spacing(2) },
  visibilityIcon: { marginTop: 2, flexShrink: 0 },
  linkBox: { alignSelf: "flex-start" },
  link: {
    fontFamily: font.semibold,
    fontSize: 14,
    color: colors["primary-strong"],
    textDecorationLine: "underline",
  },
});
