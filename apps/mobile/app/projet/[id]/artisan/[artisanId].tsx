import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ArtisanProfileView } from "@/components/artisan-profile";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { loadArtisanPage, type ArtisanPage } from "@/lib/requests";
import { Button, Notice, Screen } from "@/ui";
import { theme } from "@/ui/theme";

const { colors, spacing } = theme;

/**
 * Fiche d'un artisan proposé pour le projet (F-10), d'après la maquette « Fiche artisan » : grande
 * photo bord à bord (barre d'état claire), puis la fiche, avec l'envoi direct de la demande.
 */
export default function ArtisanFiche() {
  const { id, artisanId, canRequest } = useLocalSearchParams<{
    id: string;
    artisanId: string;
    canRequest?: string;
  }>();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState<ArtisanPage | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    loadArtisanPage(artisanId).then((found) => {
      if (active) setPage(found);
    });
    return () => {
      active = false;
    };
  }, [artisanId]);
  // Photo en haut de l'écran : barre d'état claire tant que la fiche est affichée.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light");
      return () => setStatusBarStyle("dark");
    }, []),
  );

  if (page === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (page === null) {
    return (
      <Screen header={<TopBar />}>
        <Notice tone="error">{fr.profile.notFound}</Notice>
      </Screen>
    );
  }
  const request = canRequest === "1";
  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <ScrollView contentContainerStyle={!request && { paddingBottom: insets.bottom }}>
        <ArtisanProfileView page={page} />
      </ScrollView>
      {request ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing(3) }]}>
          <Button
            label={fr.profile.request}
            onPress={() =>
              router.push({ pathname: "/projet/[id]/envoyer", params: { id, artisans: artisanId } })
            }
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  safe: { flex: 1, backgroundColor: colors.background },
  footer: {
    paddingHorizontal: spacing(5),
    paddingTop: spacing(3),
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
