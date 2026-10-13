import { useEffect, useEffectEvent, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { TextField } from "@/ui";
import { theme } from "@/ui/theme";

/**
 * Champ avec propositions (communes, adresses) : la recherche part 250 ms après la frappe, et la
 * précédente est annulée. Choisir une proposition la transmet et vide le champ.
 */
export function AutocompleteField<T>({
  label,
  placeholder,
  hint,
  search,
  itemLabel,
  onSelect,
}: {
  label: string;
  placeholder?: string;
  hint?: string;
  search: (query: string, signal: AbortSignal) => Promise<T[]>;
  itemLabel: (item: T) => string;
  onSelect: (item: T) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ query: string; items: T[] } | null>(null);
  const q = query.trim();
  // Propositions de la saisie en cours seulement (2 caractères au moins).
  const items = q.length >= 2 && results?.query === q ? results.items : null;
  // Dernière fonction de recherche du parent, sans relancer l'effet à chaque rendu.
  const runSearch = useEffectEvent((text: string, signal: AbortSignal) => search(text, signal));

  useEffect(() => {
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const found = await runSearch(q, controller.signal);
      if (!controller.signal.aborted) setResults({ query: q, items: found });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  return (
    <View style={styles.wrap}>
      <TextField
        label={label}
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder}
        hint={hint}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {items !== null && (
        <View style={styles.list}>
          {items.length === 0 ? (
            <Text style={styles.empty}>{fr.review.noMatch}</Text>
          ) : (
            items.map((item, i) => (
              <Pressable
                key={`${itemLabel(item)}-${i}`}
                role="button"
                onPress={() => {
                  onSelect(item);
                  setQuery("");
                  setResults(null);
                }}
                style={({ pressed }) => [
                  styles.item,
                  i > 0 && styles.itemBorder,
                  pressed && styles.itemPressed,
                ]}
              >
                <Text style={styles.itemText}>{itemLabel(item)}</Text>
              </Pressable>
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing(2) },
  list: {
    borderRadius: theme.radius.input,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    overflow: "hidden",
  },
  item: {
    minHeight: theme.touchTarget,
    justifyContent: "center",
    paddingHorizontal: theme.spacing(4),
  },
  itemBorder: { borderTopWidth: 1, borderTopColor: theme.colors.border },
  itemPressed: { backgroundColor: theme.colors["primary-softer"] },
  itemText: { fontFamily: theme.font.regular, fontSize: 15, color: theme.colors.foreground },
  empty: {
    padding: theme.spacing(4),
    fontFamily: theme.font.regular,
    fontSize: 14,
    color: theme.colors["muted-foreground"],
  },
});
