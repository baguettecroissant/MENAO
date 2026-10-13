import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { ArtisanProfileView } from "@/components/artisan-profile";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { loadArtisanPage, type ArtisanPage } from "@/lib/requests";
import { Button, Notice, Screen } from "@/ui";
import { theme } from "@/ui/theme";

/** Fiche d'un artisan proposé pour le projet (F-10), avec l'envoi direct de la demande. */
export default function ArtisanFiche() {
  const { id, artisanId, canRequest } = useLocalSearchParams<{
    id: string;
    artisanId: string;
    canRequest?: string;
  }>();
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

  if (page === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }
  return (
    <Screen
      header={<TopBar />}
      footer={
        page && canRequest === "1" ? (
          <Button
            label={fr.profile.request}
            onPress={() =>
              router.push({ pathname: "/projet/[id]/envoyer", params: { id, artisans: artisanId } })
            }
          />
        ) : undefined
      }
    >
      {page ? (
        <ArtisanProfileView page={page} />
      ) : (
        <Notice tone="error">{fr.profile.notFound}</Notice>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
});
