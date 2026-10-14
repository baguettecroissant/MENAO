import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { theme } from "@/ui/theme";

const { colors, font, radius, spacing } = theme;
const VISIBLE = 5;
// Ordre des maquettes : Électricité, Plomberie, Maçonnerie, Peinture, Terrassement, puis le reste.
const FEATURED = ["electricien", "plombier", "macon", "peintre", "terrassier"];

/**
 * Raccourcis métiers avec emoji (maquette « Recherche »), comme sur le site : 5 visibles puis « … »
 * pour afficher la suite. Sélection unique (pré-remplit le métier recherché).
 */
export function TradeShortcuts({
  trades,
  selected,
  onToggle,
}: {
  trades: readonly { code: string; label: string }[];
  selected: string | null;
  onToggle: (code: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const ordered = [
    ...FEATURED.flatMap((code) => trades.filter((trade) => trade.code === code)),
    ...trades.filter((trade) => !FEATURED.includes(trade.code)),
  ];
  // Le métier choisi reste visible même replié.
  const visible = ordered.slice(0, VISIBLE);
  const chosen = ordered.find((trade) => trade.code === selected);
  if (!expanded && chosen && !visible.includes(chosen)) visible.push(chosen);
  const list = expanded ? ordered : visible;

  return (
    <View role="group" aria-label={fr.search.tradeLabel} style={styles.group}>
      {list.map((trade) => {
        const domain = fr.tradeDomains[trade.code];
        const on = selected === trade.code;
        return (
          <Pressable
            key={trade.code}
            role="button"
            aria-pressed={on}
            onPress={() => onToggle(trade.code)}
            style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.pressed]}
          >
            {domain ? <Text style={styles.emoji}>{domain.emoji}</Text> : null}
            <Text style={[styles.label, on && styles.labelOn]}>{domain?.label ?? trade.label}</Text>
          </Pressable>
        );
      })}
      {ordered.length > VISIBLE ? (
        <Pressable
          role="button"
          aria-expanded={expanded}
          aria-label={expanded ? fr.search.lessTrades : fr.search.moreTrades}
          onPress={() => setExpanded((value) => !value)}
          style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
        >
          <Text style={styles.more}>{expanded ? "−" : "…"}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing(2) },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    minHeight: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(3),
  },
  chipOn: { borderColor: colors.primary, backgroundColor: colors["primary-soft"] },
  pressed: { opacity: 0.85 },
  emoji: { fontSize: 13 },
  label: { fontFamily: font.regular, fontSize: 13, color: colors.foreground },
  labelOn: { fontFamily: font.medium, color: colors["primary-strong"] },
  more: { fontFamily: font.medium, fontSize: 13, color: colors["muted-foreground"] },
});
