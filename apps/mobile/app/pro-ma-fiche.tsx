import { router, useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { Pencil } from "lucide-react-native";
import { useCallback } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ArtisanProfileView } from "@/components/artisan-profile";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { loadMyPage } from "@/lib/profile-hub";
import { useFocusData } from "@/lib/use-focus-data";
import { Button, Notice, Screen, ScreenSkeleton } from "@/ui";
import { theme } from "@/ui/theme";
import { ExampleLock } from "@/components/examples";
import { useExamplesActive } from "@/lib/examples";

const t = fr.proMyPage;
const { colors, font, spacing } = theme;

/**
 * « Voir ma fiche » (ADR 0129) : exactement la fiche que voient les particuliers (même vue que
 * dans leur recherche), avec un accès direct à sa modification.
 */
export default function MaFiche() {
  const insets = useSafeAreaInsets();
  const [page] = useFocusData(loadMyPage);
  // Exemples (ADR 0184) : la fiche d'exemple se lit, elle ne se modifie pas.
  const examples = useExamplesActive();
  // Photo en haut de l'écran : barre d'état claire tant que la fiche est affichée.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light");
      return () => setStatusBarStyle("dark");
    }, []),
  );

  if (page === undefined) return <ScreenSkeleton header={<TopBar />} />;
  if (page === null) {
    return (
      <Screen header={<TopBar />}>
        <Notice tone="error">{t.unavailable}</Notice>
      </Screen>
    );
  }
  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <ScrollView>
        <ArtisanProfileView page={page} />
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing(3) }]}>
        <Text style={styles.preview}>{t.preview}</Text>
        <ExampleLock locked={examples} note>
          <Button label={t.edit} icon={Pencil} onPress={() => router.push("/pro-profil-public")} />
        </ExampleLock>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  footer: {
    gap: spacing(2),
    paddingHorizontal: spacing(5),
    paddingTop: spacing(3),
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  preview: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors["muted-foreground"],
    textAlign: "center",
  },
});
