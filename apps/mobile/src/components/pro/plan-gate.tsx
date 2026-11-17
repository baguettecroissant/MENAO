import type { AiAgentsRights } from "@menao/core";
import { Lock } from "lucide-react-native";
import type { ComponentType } from "react";
import { StyleSheet, Text, View } from "react-native";
import { FicheCard, FicheScreen, FicheSkeleton } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { loadPlanRights } from "@/lib/plan";
import { useFocusData } from "@/lib/use-focus-data";
import { theme } from "@/ui/theme";

const t = fr.proPlan.locked;
const { colors, font, spacing } = theme;

type BooleanRight = {
  [K in keyof AiAgentsRights]: AiAgentsRights[K] extends boolean ? K : never;
}[keyof AiAgentsRights];

/**
 * Écran d'une fonction réservée à certaines formules (ADR 0363) : sans le droit, une explication à
 * la place de l'outil, sans prix ni lien d'achat (CLAUDE.md règle 10). La base refuse de toute
 * façon l'action ; l'écran évite seulement d'y arriver pour rien.
 */
export function withPlanRight<P extends object>(
  right: BooleanRight,
  texts: { title: string; text: string },
  Screen: ComponentType<P>,
): ComponentType<P> {
  function PlanGatedScreen(props: P) {
    const [rights] = useFocusData(loadPlanRights);
    if (rights === undefined) return <FicheSkeleton title={texts.title} />;
    // Droits illisibles : l'écran s'ouvre, la base tranchera.
    if (rights === null || rights[right]) return <Screen {...props} />;
    return (
      <FicheScreen title={texts.title}>
        <FicheCard padding={4.5} gap={3}>
          <View style={styles.icon}>
            <Lock size={20} color={colors["primary-strong"]} />
          </View>
          <Text style={styles.text}>{texts.text}</Text>
          <Text style={styles.note}>{t.note}</Text>
        </FicheCard>
      </FicheScreen>
    );
  }
  PlanGatedScreen.displayName = `PlanGated(${Screen.displayName ?? Screen.name ?? "Screen"})`;
  return PlanGatedScreen;
}

const styles = StyleSheet.create({
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  text: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.label },
  note: {
    fontFamily: font.semibold,
    fontSize: 14,
    padding: spacing(3),
    borderRadius: 12,
    backgroundColor: colors.background,
    color: colors.foreground,
  },
});
