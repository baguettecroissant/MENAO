import { Check } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { theme } from "@/ui/theme";

const { colors, font, spacing } = theme;

/**
 * Étapes d'un parcours (« Signature du devis · Paiement de l'acompte ») : étape en cours
 * soulignée, étapes passées cochées, comme sur le site.
 */
export function StepTabs<K extends string>({
  steps,
  current,
}: {
  steps: readonly { key: K; label: string }[];
  current: K;
}) {
  const index = steps.findIndex((s) => s.key === current);
  return (
    <View style={styles.tabs}>
      {steps.map((step, i) => {
        const done = i < index;
        const active = i === index;
        return (
          <View key={step.key} style={[styles.tab, active && styles.tabActive]}>
            {done ? <Check size={14} color={colors.success} strokeWidth={2.6} /> : null}
            <Text
              aria-label={
                active
                  ? `${step.label}, ${fr.nav.currentStep}`
                  : done
                    ? `${step.label}, ${fr.nav.doneStep}`
                    : step.label
              }
              style={[styles.label, active && styles.labelActive, done && styles.labelDone]}
              numberOfLines={2}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(1),
    paddingBottom: spacing(3),
    paddingHorizontal: spacing(1),
    marginBottom: -1,
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  label: {
    fontFamily: font.regular,
    fontSize: 14,
    textAlign: "center",
    color: colors["subtle-foreground"],
  },
  labelActive: { fontFamily: font.medium, color: colors["primary-strong"] },
  labelDone: { color: colors.success },
});
