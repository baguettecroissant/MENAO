import { franceMapPoint, type FranceMapData } from "@menao/core";
import departements from "@menao/core/data/france-departements.json";
import regions from "@menao/core/data/france-regions.json";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { fr } from "@/i18n/fr";
import { haptic } from "@/lib/haptics";
import { theme } from "@/ui/theme";

const t = fr.franceMap;
const { colors, font, radius, spacing } = theme;

/**
 * Carte de France de la zone d'intervention (ADR 0350, 0358), comme sur le site : départements ou
 * régions choisis en couleur, à toucher pour les ajouter ou les retirer ; toute la métropole pour
 * « Toute la France ». Mêmes contours IGN (Licence Ouverte) que le site. L'outre-mer n'est pas
 * dessiné : il se choisit par la recherche.
 */
export function FranceMap({
  mode,
  codes = [],
  onToggle,
  point,
}: {
  mode: "departements" | "regions" | "france";
  codes?: readonly string[];
  onToggle?: (code: string) => void;
  /** Adresse de départ de l'artisan. */
  point?: { lon: number; lat: number } | null;
}) {
  const data = (mode === "departements" ? departements : regions) as FranceMapData;
  const dot = point ? franceMapPoint(data.projection, point.lon, point.lat, data) : null;
  const interactive = onToggle !== undefined && mode !== "france";

  return (
    <View style={styles.card}>
      <Svg
        viewBox={`0 0 ${data.largeur} ${data.hauteur}`}
        style={{ width: "100%", aspectRatio: data.largeur / data.hauteur }}
        accessibilityLabel={t.label[mode]}
      >
        {Object.entries(data.zones).map(([code, zone]) => {
          const on = mode === "france" || codes.includes(code);
          return (
            <Path
              key={code}
              d={zone.d}
              fill={on ? colors.primary : colors.border}
              stroke={colors.surface}
              strokeWidth={1.2}
              {...(interactive
                ? {
                    // Sans rôle « bouton » : sur le web, react-native-svg en ferait un <button>
                    // à la place du tracé, et la carte resterait vide.
                    accessibilityLabel: on ? `${zone.nom}, ${t.selected}` : zone.nom,
                    onPress: () => {
                      haptic.select();
                      onToggle(code);
                    },
                  }
                : {})}
            />
          );
        })}
        {dot ? (
          <Circle
            cx={dot.x}
            cy={dot.y}
            r={7}
            fill={colors.surface}
            stroke={colors.foreground}
            strokeWidth={3}
          />
        ) : null}
      </Svg>
      <Text style={styles.caption}>{interactive ? t.hint[mode] : t.caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing(1.5),
    padding: spacing(3),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  caption: {
    fontFamily: font.regular,
    fontSize: 12,
    textAlign: "center",
    color: colors["muted-foreground"],
  },
});
