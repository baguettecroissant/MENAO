import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { ChantierView } from "@/components/chantier/chantier-view";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { loadChantier, type ChantierDetail } from "@/lib/chantiers";
import { Notice, Screen } from "@/ui";
import { theme } from "@/ui/theme";

/** Vue d'un chantier (F-12), rechargée à chaque retour sur l'écran. */
export default function ChantierScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<ChantierDetail | null | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadChantier(id).then((found) => {
        if (active) setDetail(found);
      });
      return () => {
        active = false;
      };
    }, [id]),
  );

  if (detail === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }
  if (detail === null) {
    return (
      <Screen header={<TopBar />}>
        <Notice tone="error">{fr.chantier.notFound}</Notice>
      </Screen>
    );
  }
  return <ChantierView detail={detail} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
});
