import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/ui/theme";
import { haptic } from "@/lib/haptics";

const { colors, font, radius, spacing } = theme;

/** Choix unique dans une liste (motif d'annulation, raison du refus…), avec sa légende. */
export function RadioGroup<V extends string>({
  legend,
  options,
  value,
  onChange,
  error,
}: {
  legend: string;
  options: readonly { value: V; label: string }[];
  value: V | null;
  onChange: (value: V) => void;
  error?: string;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.legend}>{legend}</Text>
      <View role="radiogroup" aria-label={legend} style={styles.options}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.value}
              role="radio"
              aria-checked={selected}
              onPress={() => {
                haptic.select();
                onChange(option.value);
              }}
              style={[styles.option, selected && styles.optionOn]}
            >
              <View style={[styles.radio, selected && styles.radioOn]}>
                {selected && <View style={styles.radioDot} />}
              </View>
              <Text style={styles.label}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing(2) },
  legend: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  options: { gap: spacing(2) },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    minHeight: theme.touchTarget + 4,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(4),
  },
  optionOn: { borderColor: colors.primary, backgroundColor: colors["primary-softer"] },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors["border-strong"],
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },
  label: { flex: 1, fontFamily: font.regular, fontSize: 15, color: colors.foreground },
  error: { fontFamily: font.regular, fontSize: 13, color: colors.danger },
});
