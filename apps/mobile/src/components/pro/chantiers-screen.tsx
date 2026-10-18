import { router } from "expo-router";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArtisanChantierCard } from "@/components/pro/chantier-row";
import { TabHeader } from "@/components/tab-header";
import { fr } from "@/i18n/fr";
import { loadArtisanChantiers } from "@/lib/pro-chantiers";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, ScreenSkeleton } from "@/ui";
import { theme } from "@/ui/theme";
import { EmptyState } from "@/components/empty-state";

const t = fr.proChantiers;
const { colors, spacing } = theme;

/**
 * Onglet « Chantiers » de l'artisan (F-18), comme sur le site et la barre d'onglets des maquettes :
 * état, lieu, client, rendez-vous ou démarrage de chaque chantier.
 */
export function ArtisanChantiersScreen() {
  const [rows, reload] = useFocusData(loadArtisanChantiers);
  const [refreshing, setRefreshing] = useState(false);

  if (rows === undefined) return <ScreenSkeleton />;
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
        <TabHeader title={t.title} subtitle={t.subtitle} />
        {rows === null ? <Notice tone="error">{t.error}</Notice> : null}
        {rows?.length === 0 ? <EmptyState illustration="chantiers">{t.empty}</EmptyState> : null}
        {(rows ?? []).map((r) => (
          <ArtisanChantierCard
            key={r.chantier_id}
            row={r}
            onPress={() => router.push(`/pro-chantier/${r.chantier_id}`)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing(5), gap: spacing(3), paddingBottom: spacing(10) },
});
