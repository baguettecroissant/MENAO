import { StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { haptic } from "@/lib/haptics";
import { Tappable } from "@/ui";
import { theme } from "@/ui/theme";

const { colors, font, radius, spacing } = theme;

export type WorkView = "chantiers" | "devis";

/**
 * Puces « Chantiers » et « Devis » en tête de l'onglet Chantiers (ADR 0130) : les devis, liés à
 * un chantier, y sont regroupés depuis que les demandes ont leur propre onglet.
 */
export function WorkSwitcher({
  value,
  onChange,
}: {
  value: WorkView;
  onChange: (value: WorkView) => void;
}) {
  const options: { value: WorkView; label: string }[] = [
    { value: "chantiers", label: fr.tabs.chantiers },
    { value: "devis", label: fr.tabs.quotes },
  ];
  return (
    <View role="tablist" style={styles.row}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Tappable
            key={option.value}
            role="tab"
            aria-label={option.label}
            aria-selected={active}
            onPress={() => {
              if (active) return;
              haptic.select();
              onChange(option.value);
            }}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </Tappable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing(2) },
  chip: {
    minHeight: 40,
    paddingHorizontal: spacing(4.5),
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  labelActive: { color: colors["primary-foreground"] },
});
