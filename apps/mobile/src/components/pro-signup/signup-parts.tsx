import { Check, Search } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { PageHead, StepsBar } from "@/components/pro/dossier-kit";
import { theme } from "@/ui/theme";
import { haptic } from "@/lib/haptics";

const { colors, font, radius, spacing } = theme;

/**
 * Briques communes aux étapes de l'inscription artisan (ADR 0113), reprises par les écrans du
 * dossier (entreprise, métiers, zone). Refonte « Nette » (lot 9) : grand titre, barre d'étapes
 * segmentée, champ de recherche en 16 points, questions en cartes de choix bordées de bleu nuit.
 */

/** Comparaison sans accents ni majuscules (« electricien » trouve « Électricien »). */
export function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function StepTitle({ title, lead }: { title: string; lead?: string }) {
  return <PageHead title={title} lead={lead} />;
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
  return <StepsBar label={label} step={step} total={total} text={text} />;
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
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.searchWrap}>
      <View style={[styles.search, focused && styles.searchFocused]}>
        <Search size={18} color={colors["muted-foreground"]} />
        <TextInput
          aria-label={label}
          placeholder={label}
          placeholderTextColor={colors["muted-foreground"]}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCorrect={false}
          autoCapitalize="none"
          style={styles.searchInput}
        />
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** Question à réponses en cartes de choix (boutons radio) : la carte choisie bordée de bleu nuit. */
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
      <View style={styles.legendBox}>
        <Text style={styles.legend}>{legend}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
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
              <Text style={styles.optionText}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Ligne à cocher (métiers, spécialités) : case bleu nuit, ligne bordée de bleu nuit une fois cochée. */
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
  searchWrap: { gap: spacing(1.5) },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2.5),
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
  },
  searchFocused: { borderColor: colors.primary },
  searchInput: {
    flex: 1,
    alignSelf: "stretch",
    fontFamily: font.regular,
    // 16 points au moins : pas de zoom automatique sur iPhone (version web).
    fontSize: 16,
    color: colors.foreground,
    outlineWidth: 0,
  },
  hint: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  choice: { gap: spacing(2.5) },
  legendBox: { gap: spacing(1) },
  legend: { fontFamily: font.bold, fontSize: 16, lineHeight: 22, color: colors.foreground },
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2.5) },
  option: {
    flexGrow: 1,
    minHeight: 52,
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
  },
  // Bordure de 2 px : la marge intérieure perd 1 px, la carte garde sa taille.
  optionOn: {
    borderWidth: 2,
    borderColor: colors.foreground,
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  optionText: { fontFamily: font.bold, fontSize: 15, color: colors.foreground },
  pressed: { opacity: 0.85 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
  },
  rowOn: { borderWidth: 2, borderColor: colors.foreground, paddingHorizontal: 13 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  boxOn: { borderColor: colors.foreground, backgroundColor: colors.foreground },
  rowText: { flex: 1, fontFamily: font.regular, fontSize: 16, color: colors.foreground },
});
