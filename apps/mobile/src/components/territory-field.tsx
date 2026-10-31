import { searchTerritories, territoryLabel } from "@menao/core";
import { X } from "lucide-react-native";
import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AutocompleteField } from "@/components/autocomplete-field";
import { theme } from "@/ui/theme";

const { colors, font, radius, spacing } = theme;

type Territory = { code: string; nom: string };

/** Choix de départements ou de régions (ADR 0213), comme sur le site. */
export function TerritoryField({
  mode,
  codes,
  onChange,
  labels,
}: {
  mode: "departements" | "regions";
  codes: string[];
  onChange: (codes: string[]) => void;
  labels: { search: string; hint: string; remove: (nom: string) => string };
}) {
  const search = useCallback(async (query: string) => searchTerritories(mode, query), [mode]);
  return (
    <>
      {codes.length > 0 ? (
        <View style={styles.chips}>
          {codes.map((code) => {
            const nom = territoryLabel(mode, code);
            return (
              <View key={code} style={styles.chip}>
                <Text style={styles.chipText}>{nom}</Text>
                <Pressable
                  role="button"
                  aria-label={labels.remove(nom)}
                  onPress={() => onChange(codes.filter((c) => c !== code))}
                  hitSlop={8}
                >
                  <X size={14} color={colors["primary-strong"]} />
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : null}
      <AutocompleteField<Territory>
        key={mode}
        label={labels.search}
        hint={labels.hint}
        search={search}
        itemLabel={(t) => t.nom}
        onSelect={(t) => {
          if (!codes.includes(t.code)) onChange([...codes, t.code]);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    borderRadius: radius.pill,
    backgroundColor: colors["primary-softer"],
  },
  chipText: { fontFamily: font.medium, fontSize: 13, color: colors["primary-strong"] },
});
