import { isAwaitingQuote, isJournalOpen, type ChantierStatus } from "@menao/core";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { ArtisanChantierCard } from "@/components/pro/chantier-row";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { loadArtisanChantiers } from "@/lib/pro-chantiers";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Notice, Screen, Title } from "@/ui";
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
  const [rows] = useFocusData(loadArtisanChantiers);

  if (rows === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  const list = (rows ?? []).filter((r) =>
    photo ? isJournalOpen(r.status as ChantierStatus) : isAwaitingQuote(r.status as ChantierStatus),
  );
  return (
    <Screen header={<TopBar />}>
      <Title>{photo ? t.choosePhotoTitle : t.chooseQuoteTitle}</Title>
      <Body muted>{photo ? t.choosePhotoIntro : t.chooseQuoteIntro}</Body>
      {rows === null ? <Notice tone="error">{fr.proChantiers.error}</Notice> : null}
      {rows !== null && list.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{photo ? t.emptyPhoto : t.emptyQuote}</Text>
        </View>
      ) : null}
      {list.map((r) => (
        <ArtisanChantierCard
          key={r.chantier_id}
          row={r}
          onPress={() =>
            router.replace(
              photo ? `/pro-chantier/${r.chantier_id}` : `/pro-chantier/${r.chantier_id}/devis`,
            )
          }
        />
      ))}
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
