import { Check, Search } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Body } from "@/ui";
import { theme } from "@/ui/theme";
import { haptic } from "@/lib/haptics";

const { colors, font, radius, spacing } = theme;

/** Briques communes aux étapes de l'inscription artisan (ADR 0113). */

/** Comparaison sans accents ni majuscules (« electricien » trouve « Électricien »). */
export function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function StepTitle({ title, lead }: { title: string; lead?: string }) {
  return (
    <View style={styles.title}>
      <Text role="heading" style={styles.heading}>
        {title}
      </Text>
      {lead ? <Body muted>{lead}</Body> : null}
    </View>
  );
}

export function Progress({
  label,
  step,
  total,
  text,
}: {
  label: string;
  step: number;
  total: number;
  text: string;
}) {
  return (
    <View style={styles.progress}>
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>{label}</Text>
        <Text style={styles.progressText}>{text}</Text>
      </View>
      <View
        role="progressbar"
        aria-label={label}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={step}
        style={styles.track}
      >
        <View style={[styles.bar, { width: `${(step / total) * 100}%` }]} />
      </View>
    </View>
  );
}

export function SearchField({
  label,
  value,
  onChangeText,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  hint?: string;
}) {
  return (
    <View style={styles.searchWrap}>
      <View style={styles.search}>
        <Search size={20} color={colors["muted-foreground"]} />
        <TextInput
          aria-label={label}
          placeholder={label}
          placeholderTextColor={colors["subtle-foreground"]}
          value={value}
          onChangeText={onChangeText}
          autoCorrect={false}
          autoCapitalize="none"
          style={styles.searchInput}
        />
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** Question à réponses en gros boutons (boutons radio). */
export function ChoiceGroup<T extends string | number | boolean>({
  legend,
  hint,
  value,
  options,
  onChange,
  columns = 2,
}: {
  legend: string;
  hint?: string;
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  columns?: 2 | 3;
}) {
  return (
    <View style={styles.choice}>
      <Text style={styles.legend}>{legend}</Text>
      <View role="radiogroup" aria-label={legend} style={styles.options}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              key={String(option.value)}
              role="radio"
              aria-checked={selected}
              aria-label={option.label}
              onPress={() => {
                haptic.select();
                onChange(option.value);
              }}
              style={({ pressed }) => [
                styles.option,
                { flexBasis: columns === 3 ? "30%" : "45%" },
                selected && styles.optionOn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.optionText, selected && styles.optionTextOn]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** Ligne à cocher (métiers). */
export function CheckRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onPress={() => {
        haptic.select();
        onToggle();
      }}
      style={({ pressed }) => [styles.row, checked && styles.rowOn, pressed && styles.pressed]}
    >
      <View style={[styles.box, checked && styles.boxOn]}>
        {checked ? <Check size={14} color={colors["primary-foreground"]} strokeWidth={3} /> : null}
      </View>
      <Text style={styles.rowText}>{label}</Text>
    </Pressable>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text style={styles.hint}>{children}</Text>;
}

const styles = StyleSheet.create({
  title: { gap: spacing(2) },
  heading: { fontFamily: font.bold, fontSize: 24, lineHeight: 30, color: colors.foreground },
  progress: { gap: spacing(2) },
  progressRow: { flexDirection: "row", justifyContent: "space-between" },
  progressText: { fontFamily: font.medium, fontSize: 13, color: colors["muted-foreground"] },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors["primary-soft"],
    overflow: "hidden",
  },
  bar: { height: "100%", borderRadius: radius.pill, backgroundColor: colors.primary },
  searchWrap: { gap: spacing(1) },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    minHeight: 52,
    paddingHorizontal: spacing(4),
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchInput: { flex: 1, fontFamily: font.regular, fontSize: 16, color: colors.foreground },
  hint: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  choice: { gap: spacing(3) },
  legend: { fontFamily: font.bold, fontSize: 17, color: colors.foreground },
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  option: {
    flexGrow: 1,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing(3),
    borderRadius: radius.input,
    borderWidth: 1.5,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
  },
  optionOn: { borderColor: colors.primary, backgroundColor: colors["primary-softer"] },
  optionText: {
    fontFamily: font.bold,
    fontSize: 15,
    color: colors.foreground,
    textAlign: "center",
  },
  optionTextOn: { color: colors["primary-strong"] },
  pressed: { opacity: 0.85 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    minHeight: 52,
    paddingHorizontal: spacing(4),
    borderRadius: radius.input,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowOn: { borderColor: colors.primary, backgroundColor: colors["primary-softer"] },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors["border-strong"],
    alignItems: "center",
    justifyContent: "center",
  },
  boxOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  rowText: { flex: 1, fontFamily: font.regular, fontSize: 16, color: colors.foreground },
});
