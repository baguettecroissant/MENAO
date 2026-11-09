import { StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { fr } from "@/i18n/fr";
import { theme } from "@/ui/theme";

/** Logo MENAO (toit et sourire), mêmes tracés que sur le site. */
export function LogoMark({
  size = 40,
  tone = "brand",
}: {
  size?: number;
  tone?: "brand" | "white";
}) {
  const stroke = tone === "white" ? "#ffffff" : "url(#menao)";
  // Décoratif : masqué des lecteurs d'écran (aria-hidden, compris par iOS, Android et le web).
  return (
    <View aria-hidden>
      <Svg width={size} height={(size * 28) / 32} viewBox="0 0 32 28" fill="none">
        {tone === "brand" && (
          <Defs>
            <LinearGradient
              id="menao"
              x1="16"
              y1="2"
              x2="16"
              y2="26"
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor="#86a0fb" />
              <Stop offset="1" stopColor="#4869f6" />
            </LinearGradient>
          </Defs>
        )}
        <Path
          d="M9.5 10.5 16 5.5l6.5 5"
          stroke={stroke}
          strokeWidth={3.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M5 16.5c5.8 7.2 16.2 7.2 22 0"
          stroke={stroke}
          strokeWidth={4.6}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

/**
 * Logo complet (dessin puis « menao »), comme l'en-tête du site : haut des écrans de connexion et
 * d'inscription (refonte « Nette », lot 13). Lu « MENAO » par les lecteurs d'écran.
 */
export function Logo({ size = 30, tone = "brand" }: { size?: number; tone?: "brand" | "white" }) {
  return (
    <View role="img" aria-label={fr.brand} style={styles.logo}>
      <LogoMark size={size} tone={tone} />
      <Text
        aria-hidden
        style={[
          styles.wordmark,
          { fontSize: Math.round(size * 0.87) },
          tone === "white" && styles.wordmarkWhite,
        ]}
      >
        {fr.logoWordmark}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(2),
    alignSelf: "flex-start",
  },
  wordmark: { fontFamily: theme.font.display, letterSpacing: -0.8, color: theme.colors.foreground },
  wordmarkWhite: { color: "#ffffff" },
});
