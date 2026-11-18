import { router } from "expo-router";
import { Check, Wallet } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { ExamplesCard } from "@/components/examples";
import { DossierGroup, DossierRow, PageHead } from "@/components/pro/dossier-kit";
import { FicheButton, FicheScreen, FicheSkeleton } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { loadDossier } from "@/lib/artisan-dossier";
import { useFocusData } from "@/lib/use-focus-data";
import { theme } from "@/ui/theme";

const t = fr.proGuide.sent;
const { colors } = theme;

/**
 * « Dossier envoyé » (ADR 0374), comme sur le site (ADR 0373) : la fin du parcours guidé. Pendant
 * que l'équipe vérifie, les paiements expliqués en une phrase, puis l'espace rempli d'exemples
 * (ADR 0184). Rien sur la formule dans l'application (règle 10).
 */
export default function DossierSentScreen() {
  const [dossier] = useFocusData(loadDossier);
  if (dossier === undefined) return <FicheSkeleton />;
  const paid = dossier?.progress.paiements === true;
  return (
    <FicheScreen
      footer={
        paid ? (
          <FicheButton label={t.back} tall onPress={() => router.back()} />
        ) : (
          <>
            <FicheButton label={t.payCta} tall onPress={() => router.replace("/pro-paiements")} />
            <FicheButton label={t.later} variant="secondary" onPress={() => router.back()} />
          </>
        )
      }
    >
      <View style={styles.success}>
        <Check size={28} color={colors["primary-foreground"]} strokeWidth={2.6} />
      </View>
      <PageHead title={t.title} lead={t.lead} />
      <DossierGroup title={t.nextTitle}>
        <DossierRow
          icon={Wallet}
          title={t.payTitle}
          hint={t.payText}
          tone={paid ? "done" : "todo"}
          status={paid ? t.done : t.toDo}
          href="/pro-paiements"
        />
      </DossierGroup>
      <ExamplesCard
        title={fr.proExamples.dossierCard.title}
        text={fr.proExamples.dossierCard.text}
        action={fr.proExamples.dossierCard.open}
      />
    </FicheScreen>
  );
}

const styles = StyleSheet.create({
  success: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
});
