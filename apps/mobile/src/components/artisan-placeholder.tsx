import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { LogoMark } from "@/components/logo";
import { theme } from "@/ui/theme";

const { colors, font } = theme;

/**
 * Grande photo d'un artisan qui n'en a pas (cartes de résultats, fiche) : fond bleu MENAO, toit du
 * logo en filigrane et initiale dans un médaillon blanc, comme sur le site.
 */
export function ArtisanPlaceholder({
  name,
  style,
  medallion = 88,
}: {
  name: string;
  /** Cadre (largeur, hauteur) fourni par l'écran. */
  style: StyleProp<ViewStyle>;
  medallion?: number;
}) {
  return (
    <View style={[styles.frame, style]} aria-hidden>
      <View style={styles.watermark}>
        <LogoMark tone="white" size={medallion * 1.6} />
      </View>
      <View
        style={[
          styles.medallion,
          { width: medallion, height: medallion, borderRadius: medallion / 2 },
        ]}
      >
        <Text style={[styles.initial, { fontSize: Math.round(medallion * 0.42) }]}>
          {name.charAt(0).toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#b9c7fc",
  },
  watermark: { position: "absolute", right: -18, bottom: -22, opacity: 0.3 },
  medallion: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    borderWidth: 6,
    borderColor: "rgba(255, 255, 255, 0.35)",
  },
  initial: { fontFamily: font.medium, color: colors["primary-strong"] },
});
