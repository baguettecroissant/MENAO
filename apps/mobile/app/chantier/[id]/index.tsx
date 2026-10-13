import { useLocalSearchParams } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { ChantierView } from "@/components/chantier/chantier-view";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { loadChantier, type ChantierDetail } from "@/lib/chantiers";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, Screen } from "@/ui";
import { theme } from "@/ui/theme";

/**
 * Vue d'un chantier (F-12), rechargée à chaque retour sur l'écran. `retour` : fin de la signature
 * du PV ou du paiement du solde, rechargée jusqu'à son enregistrement (webhook).
 */
export default function ChantierScreen() {
  const { id, retour } = useLocalSearchParams<{ id: string; retour?: string }>();
  const load = useCallback(() => loadChantier(id), [id]);
  const waiting = useCallback(
    (d: ChantierDetail | null) =>
      d !== null &&
      ((retour === "reception" && d.c.status === "travaux_termines") ||
        (retour === "paiement" &&
          d.c.status === "receptionne" &&
          d.c.balance_status !== "en_cours")),
    [retour],
  );
  const [detail, reload] = useFocusData(load, waiting);

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
  return <ChantierView detail={detail} retour={retour} onChanged={reload} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
});
