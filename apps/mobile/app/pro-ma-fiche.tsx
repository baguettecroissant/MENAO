import { router } from "expo-router";
import { Pencil } from "lucide-react-native";
import { StyleSheet, Text } from "react-native";
import { ArtisanProfileView } from "@/components/artisan-profile";
import { FicheButton, FicheScreen, FicheSkeleton } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { loadMyPage } from "@/lib/profile-hub";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice } from "@/ui";
import { theme } from "@/ui/theme";
import { ExampleLock } from "@/components/examples";
import { useExamplesActive } from "@/lib/examples";
import { withTeamPermission } from "@/components/team-gate";

const t = fr.proMyPage;
const { colors, font } = theme;

/**
 * « Voir ma fiche » (ADR 0129) : exactement la fiche que voient les particuliers (même vue que
 * dans leur recherche, refonte « Nette » lot 12), avec un accès direct à sa modification.
 */
function MaFiche() {
  const [page] = useFocusData(loadMyPage);
  // Exemples (ADR 0184) : la fiche d'exemple se lit, elle ne se modifie pas.
  const examples = useExamplesActive();

  if (page === undefined) return <FicheSkeleton />;
  if (page === null) {
    return (
      <FicheScreen>
        <Notice tone="error">{t.unavailable}</Notice>
      </FicheScreen>
    );
  }
  return (
    <FicheScreen
      footer={
        <>
          <Text style={styles.preview}>{t.preview}</Text>
          <ExampleLock locked={examples} note>
            <FicheButton
              label={t.edit}
              icon={Pencil}
              tall
              onPress={() => router.push("/pro-profil-public")}
            />
          </ExampleLock>
        </>
      }
    >
      <ArtisanProfileView page={page} />
    </FicheScreen>
  );
}

const styles = StyleSheet.create({
  preview: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors["muted-foreground"],
    textAlign: "center",
  },
});

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("storefront", MaFiche);
