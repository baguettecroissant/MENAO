import { isAwaitingQuote, isJournalOpen, type ChantierStatus } from "@menao/core";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { ListGroup } from "@/components/list-kit";
import { ChantierListRow } from "@/components/pro/chantier-row";
import { FicheScreen, FicheSkeleton } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { loadArtisanChantiers } from "@/lib/pro-chantiers";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proQuickActions;
const { colors, font, radius, spacing } = theme;

/**
 * Choix du chantier d'une action du bouton (+) : `action=devis`, un chantier qui attend un devis
 * (vers la préparation du devis) ; `action=photo`, un chantier en cours (vers son suivi).
 */
export default function ChooseChantierScreen() {
  const { action } = useLocalSearchParams<{ action?: string }>();
  const photo = action === "photo";
  const [rows] = useFocusData(loadArtisanChantiers, undefined, "tab:chantiers");

  const bar = photo ? t.photo : t.quote;
  if (rows === undefined) return <FicheSkeleton title={bar} />;
  const list = (rows ?? []).filter((r) =>
    photo ? isJournalOpen(r.status as ChantierStatus) : isAwaitingQuote(r.status as ChantierStatus),
  );
  return (
    // Refonte « Nette » (lot 49, ADR 0318) : l'action dans la barre, la question en titre.
    <FicheScreen title={bar}>
      <View style={styles.head}>
        <Text role="heading" style={styles.title}>
          {photo ? t.choosePhotoTitle : t.chooseQuoteTitle}
        </Text>
        <Text style={styles.intro}>{photo ? t.choosePhotoIntro : t.chooseQuoteIntro}</Text>
      </View>
      {rows === null ? <Notice tone="error">{fr.proChantiers.error}</Notice> : null}
      {rows !== null && list.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{photo ? t.emptyPhoto : t.emptyQuote}</Text>
        </View>
      ) : null}
      {list.length > 0 ? (
        <ListGroup>
          {list.map((r) => (
            <ChantierListRow
              key={r.chantier_id}
              row={r}
              onPress={() =>
                router.replace(
                  photo ? `/pro-chantier/${r.chantier_id}` : `/pro-chantier/${r.chantier_id}/devis`,
                )
              }
            />
          ))}
        </ListGroup>
      ) : null}
    </FicheScreen>
  );
}

const styles = StyleSheet.create({
  head: { gap: spacing(1.5) },
  title: { fontFamily: font.display, fontSize: 22, letterSpacing: -0.44, color: colors.foreground },
  intro: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  empty: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(6),
    paddingVertical: spacing(10),
  },
  emptyText: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors["muted-foreground"],
    textAlign: "center",
  },
});
