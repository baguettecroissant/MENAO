import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/ui/theme";
import { haptic } from "@/lib/haptics";

const { colors, font, radius, spacing } = theme;

/** Choix unique en quelques boutons côte à côte (type de ligne, taux de TVA). */
export function Segmented<V extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: V; label: string }[];
  value: V;
  onChange: (value: V) => void;
}) {
  return (
    <View role="radiogroup" aria-label={label} style={styles.group}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            role="radio"
            aria-checked={selected}
            onPress={() => {
              haptic.select();
              onChange(option.value);
            }}
            style={[styles.option, selected && styles.optionOn]}
          >
            <Text style={[styles.text, selected && styles.textOn]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: "row",
    gap: spacing(1),
    borderRadius: radius.input,
    backgroundColor: colors.background,
    padding: spacing(1),
  },
  option: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.input - 4,
    paddingHorizontal: spacing(2),
  },
  optionOn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary },
  text: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  textOn: { fontFamily: font.medium, color: colors["primary-strong"] },
});
