import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { ChantierCardsSkeleton } from "@/components/skeletons";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArtisanChantierCard } from "@/components/pro/chantier-row";
import { TabHeader } from "@/components/tab-header";
import { fr } from "@/i18n/fr";
import { loadArtisanChantiers } from "@/lib/pro-chantiers";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, useReveal } from "@/ui";
import { theme } from "@/ui/theme";
import { EmptyState } from "@/components/empty-state";
import { SpaceExamplesNotice } from "@/components/examples";
import { exampleChantierList } from "@/lib/example-data";
import { loadSpaceExamplesShown } from "@/lib/examples";

const t = fr.proChantiers;
const { colors, spacing } = theme;

/**
 * Onglet « Chantiers » de l'artisan (F-18), comme sur le site et la barre d'onglets des maquettes :
 * état, lieu, client, rendez-vous ou démarrage de chaque chantier.
 */
export function ArtisanChantiersScreen({ switcher }: { switcher?: ReactNode }) {
  const [rows, reload] = useFocusData(loadArtisanChantiers, undefined, "tab:chantiers");
  // Rien reçu : chantiers d'exemple (ADR 0184), comme sur le site.
  const [examples, reloadExamples] = useFocusData(loadSpaceExamplesShown);
  const [refreshing, setRefreshing] = useState(false);
  // Squelette des cartes pendant le premier chargement, puis fondu (ADR 0192).
  const reveal = useReveal(rows !== undefined);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
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
        <TabHeader title={t.title}>{switcher}</TabHeader>
        {rows === undefined ? (
          <ChantierCardsSkeleton />
        ) : (
          <Animated.View entering={reveal} style={styles.list}>
            {rows === null ? <Notice tone="error">{t.error}</Notice> : null}
            {rows?.length === 0 && examples ? (
              <>
                <SpaceExamplesNotice onHidden={() => void reloadExamples()} />
                {exampleChantierList().map((r) => (
                  <ArtisanChantierCard
                    key={r.chantier_id}
                    row={r}
                    onPress={() => router.push(`/pro-chantier/${r.chantier_id}`)}
                  />
                ))}
              </>
            ) : rows?.length === 0 ? (
              <EmptyState illustration="chantiers">{t.empty}</EmptyState>
            ) : null}
            {(rows ?? []).map((r) => (
              <ArtisanChantierCard
                key={r.chantier_id}
                row={r}
                onPress={() => router.push(`/pro-chantier/${r.chantier_id}`)}
              />
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing(5), gap: spacing(3), paddingBottom: spacing(10) },
  list: { gap: spacing(3) },
});
