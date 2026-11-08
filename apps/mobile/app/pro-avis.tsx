import { reviewFigures, reviewMatches, type ReviewFilter } from "@menao/core";
import { Info } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { FigureStrip, ListFilters, ListGroup } from "@/components/list-kit";
import { CardHeading, FicheCard, FicheScreen, FicheSkeleton } from "@/components/pro/fiche-kit";
import { ReviewItem } from "@/components/pro/review-item";
import { ScoreBreakdown } from "@/components/score-breakdown";
import { fr } from "@/i18n/fr";
import { loadMyReviews } from "@/lib/pro-reviews";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Notice } from "@/ui";
import { theme } from "@/ui/theme";
import { EmptyState } from "@/components/empty-state";
import { useExamplesActive } from "@/lib/examples";
import { withTeamPermission } from "@/components/team-gate";

const t = fr.proReviews;
const { colors, font, spacing } = theme;

const FILTERS: readonly ReviewFilter[] = ["tous", "sans_reponse", "note_basse"];

/**
 * « Avis » de l'artisan (F-28), refonte « Nette » (lot 5) : trois chiffres (note globale, avis
 * vérifiés, sans réponse), filtres en pastilles, puis un avis par bloc dans une seule carte, avec
 * réponse publique et signalement comme sur le site ; ensuite la note détaillée et le
 * fonctionnement des avis. Aucun lien vers le site (règle 10).
 */
function MyReviews() {
  const [data, reload] = useFocusData(loadMyReviews);
  const examples = useExamplesActive();
  const [filter, setFilter] = useState<ReviewFilter>("tous");

  if (data === undefined) return <FicheSkeleton title={t.screenTitle} />;
  const reviews = data?.reviews ?? [];
  const figures = reviewFigures(reviews, data?.score?.global ?? null);
  const shown = reviews.filter((review) => reviewMatches(review, filter));
  return (
    <FicheScreen title={t.screenTitle} onRefresh={reload}>
      {data === null ? <Notice tone="error">{t.error}</Notice> : null}
      {reviews.length > 0 ? (
        <>
          <FigureStrip
            label={t.figuresLabel}
            figures={[
              {
                label: t.rating,
                value: figures.rating === null ? "—" : fr.clientReview.percent(figures.rating),
                spoken: figures.rating === null ? t.noRating : undefined,
              },
              { label: t.published, value: String(figures.published) },
              {
                label: t.toAnswerShort,
                value: String(figures.toAnswer),
                danger: figures.toAnswer > 0,
              },
            ]}
          />
          <ListFilters
            chips
            gutter={spacing(4)}
            label={t.filtersLabel}
            value={filter}
            onChange={setFilter}
            // « 4 étoiles ou moins » seulement s'il y en a (ou s'il est déjà choisi).
            items={FILTERS.filter(
              (value) => value !== "note_basse" || figures.counts[value] > 0 || filter === value,
            ).map((value) => ({
              value,
              label: t.filters[value],
              detail: String(figures.counts[value]),
            }))}
          />
          {shown.length > 0 ? (
            <ListGroup>
              {shown.map((review) => (
                <ReviewItem
                  key={review.id}
                  review={review}
                  chantierTitle={data?.chantierTitles.get(review.chantierId) ?? null}
                  onReplied={reload}
                  example={examples}
                />
              ))}
            </ListGroup>
          ) : (
            <Body muted>{t.filterEmpty}</Body>
          )}
        </>
      ) : data ? (
        <>
          <Body muted>{t.subtitle}</Body>
          <EmptyState illustration="avis">{t.empty}</EmptyState>
        </>
      ) : null}
      {data ? (
        <FicheCard>
          <CardHeading title={t.scoreTitle} size={17} />
          {data.score ? <ScoreBreakdown score={data.score} /> : <Body muted>{t.scoreEmpty}</Body>}
        </FicheCard>
      ) : null}
      <FicheCard>
        <View style={styles.row}>
          <Info size={18} color={colors.primary} />
          <CardHeading title={t.howTitle} size={17} />
        </View>
        {t.how.map((line) => (
          <View key={line} style={styles.bullet}>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.text}>{line}</Text>
          </View>
        ))}
      </FicheCard>
    </FicheScreen>
  );
}

const styles = StyleSheet.create({
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

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("storefront", MyReviews);
