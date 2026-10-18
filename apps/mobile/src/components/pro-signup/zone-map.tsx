import { zoneMapView } from "@menao/core";
import { planIgnTileUrl } from "@menao/validation";
import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { theme } from "@/ui/theme";

const t = fr.proSignup.zone;
const { colors, font, radius, spacing } = theme;
const HEIGHT = 180;
const BORDER = 1;

/**
 * Aperçu de la zone d'intervention sur le Plan IGN (ADR 0126), comme sur le site : la carte
 * s'éloigne quand le rayon grandit, le cercle reste à l'échelle.
 */
export function ZoneMap({
  lon,
  lat,
  radiusKm,
  label,
}: {
  lon: number;
  lat: number;
  radiusKm: number;
  label: string;
}) {
  const [width, setWidth] = useState(0);
  // Tuiles et cercle placés à l'intérieur de la bordure.
  const view = zoneMapView({
    lon,
    lat,
    radiusKm,
    width: Math.max(0, width - 2 * BORDER),
    height: HEIGHT - 2 * BORDER,
  });

  return (
    <View
      style={styles.map}
      aria-hidden
      onLayout={(event) => setWidth(Math.round(event.nativeEvent.layout.width))}
    >
      {view.tiles.map((tile) => (
        <Image
          key={`${tile.z}/${tile.x}/${tile.y}`}
          source={{ uri: planIgnTileUrl(tile) }}
          style={[
            styles.tile,
            { left: tile.left, top: tile.top, width: tile.width, height: tile.height },
          ]}
        />
      ))}
      {view.circle > 0 ? (
        <View
          style={[
            styles.circle,
            { width: view.circle, height: view.circle, borderRadius: view.circle / 2 },
          ]}
        />
      ) : null}
      <View style={styles.pin} />
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.credit}>{t.mapCredit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    height: HEIGHT,
    borderRadius: radius.card,
    backgroundColor: colors["primary-softer"],
    borderWidth: BORDER,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tile: { position: "absolute" },
  circle: {
    position: "absolute",
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: "rgba(72,105,246,0.15)",
  },
  pin: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: colors.surface,
    backgroundColor: colors.primary,
  },
  label: {
    position: "absolute",
    top: HEIGHT / 2 + 11,
    maxWidth: "80%",
    paddingHorizontal: spacing(2.5),
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: "hidden",
    backgroundColor: colors.surface,
    fontFamily: font.bold,
    fontSize: 12,
    color: colors.foreground,
  },
  credit: {
    position: "absolute",
    right: 6,
    bottom: 4,
    paddingHorizontal: 4,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.8)",
    fontFamily: font.regular,
    fontSize: 10,
    color: colors["muted-foreground"],
  },
});
