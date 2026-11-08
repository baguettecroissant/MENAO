import { Children, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@/ui/theme";

const { colors, font, radius, spacing } = theme;

/**
 * Briques de la rubrique « Argent » refondue (« Nette », lot 2), d'après les maquettes
 * « ArgentApp » : carte des chiffres clés en tête de chaque onglet et rangée d'actions.
 */

export type MoneyFigure = { label: string; value: string; hint?: string | null };

/**
 * Carte des chiffres clés : le premier en grand sur toute la largeur, les suivants deux par deux
 * (un chiffre seul sur sa rangée prend toute la largeur).
 */
export function MoneyFigures({ figures }: { figures: readonly MoneyFigure[] }) {
  const [first, ...rest] = figures;
  if (!first) return null;
  const rows: MoneyFigure[][] = [];
  for (let i = 0; i < rest.length; i += 2) rows.push(rest.slice(i, i + 2));
  return (
    <View style={styles.card}>
      <Cell figure={first} big />
      {rows.map((row) => (
        <View key={row[0]?.label} style={styles.row}>
          {row.map((figure, i) => (
            <View key={figure.label} style={[styles.half, i > 0 && styles.left]}>
              <Cell figure={figure} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function Cell({ figure, big = false }: { figure: MoneyFigure; big?: boolean }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.label}>{figure.label}</Text>
      <Text
        style={[styles.value, big ? styles.valueBig : styles.valueSmall]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {figure.value}
      </Text>
      {figure.hint ? <Text style={styles.hint}>{figure.hint}</Text> : null}
    </View>
  );
}

/** Rangée d'actions sous les chiffres (« Photo du ticket », « Saisir », « … »). */
export function MoneyActions({ children }: { children: ReactNode }) {
  if (Children.count(children) === 0) return null;
  return <View style={styles.actions}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  row: { flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.border },
  half: { flex: 1, minWidth: 0 },
  left: { borderLeftWidth: 1, borderLeftColor: colors.border },
  cell: { gap: spacing(1.5), paddingHorizontal: spacing(5), paddingVertical: spacing(4.5) },
  label: { fontFamily: font.semibold, fontSize: 14, color: colors.label },
  value: {
    fontFamily: font.display,
    fontVariant: ["tabular-nums"],
    color: colors.foreground,
  },
  valueBig: { fontSize: 34, lineHeight: 38, letterSpacing: -1 },
  valueSmall: { fontSize: 22, lineHeight: 26, letterSpacing: -0.6 },
  hint: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  actions: { flexDirection: "row", alignItems: "center", gap: spacing(2.5) },
});
