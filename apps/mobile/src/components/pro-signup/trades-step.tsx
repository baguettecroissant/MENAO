import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { TradePill } from "@/components/pro/dossier-kit";
import { fr } from "@/i18n/fr";
import { theme } from "@/ui/theme";
import { Muted, SearchField, StepTitle, normalizeSearch } from "./signup-parts";

const t = fr.proSignup.trades;

export type SignupTrade = { code: string; label: string };

/** Étape « métiers » : métiers en pastilles (choisis en bleu nuit), avec une recherche. */
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
            <TradePill
              key={trade.code}
              label={trade.label}
              selected={on}
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

const styles = StyleSheet.create({
  list: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing(2) },
});
