import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { fr } from "@/i18n/fr";
import { theme } from "@/ui/theme";
import { CheckRow, Muted, SearchField, StepTitle, normalizeSearch } from "./signup-parts";

const t = fr.proSignup.trades;

export type SignupTrade = { code: string; label: string };

/** Étape « métiers » : liste à cocher, avec une recherche. */
export function TradesStep({
  trades,
  selected,
  onChange,
}: {
  trades: SignupTrade[];
  selected: string[];
  onChange: (codes: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const q = normalizeSearch(query);
  const visible = trades.filter((trade) => !q || normalizeSearch(trade.label).includes(q));
  return (
    <>
      <StepTitle title={t.title} lead={t.lead} />
      <SearchField label={t.search} value={query} onChangeText={setQuery} />
      <View style={styles.list}>
        {visible.map((trade) => {
          const on = selected.includes(trade.code);
          return (
            <CheckRow
              key={trade.code}
              label={trade.label}
              checked={on}
              onToggle={() =>
                onChange(on ? selected.filter((c) => c !== trade.code) : [...selected, trade.code])
              }
            />
          );
        })}
        {visible.length === 0 ? <Muted>{t.none(query)}</Muted> : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({ list: { gap: theme.spacing(2) } });
