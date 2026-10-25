import { StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { haptic } from "@/lib/haptics";
import { Tappable } from "@/ui";
import { theme } from "@/ui/theme";

const { colors, font, radius, spacing } = theme;

export const MONEY_VIEWS = ["devis", "factures", "depenses"] as const;
export type MoneyView = (typeof MONEY_VIEWS)[number];

/**
 * Puces « Devis », « Factures » et « Dépenses » en tête de l'onglet Argent (ADR 0188), comme les
 * onglets de la rubrique « Argent » du site.
 */
export function MoneySwitcher({
  value,
  onChange,
}: {
  value: MoneyView;
  onChange: (value: MoneyView) => void;
}) {
  const options: { value: MoneyView; label: string }[] = [
    { value: "devis", label: fr.tabs.quotes },
    { value: "factures", label: fr.tabs.invoices },
    { value: "depenses", label: fr.tabs.expenses },
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
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
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
