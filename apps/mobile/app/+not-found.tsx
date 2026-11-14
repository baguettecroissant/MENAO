import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { FicheButton } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { Screen } from "@/ui";
import { theme } from "@/ui/theme";

const { colors, font, spacing } = theme;

/** Maison et loupe, comme la page introuvable du site (refonte « Nette », lot 49, ADR 0318). */
function Illustration() {
  return (
    <Svg
      width={150}
      height={110}
      viewBox="0 0 150 110"
      fill="none"
      stroke={colors.primary}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M18 52 L58 18 L98 52" />
      <Rect x={28} y={48} width={60} height={44} rx={6} fill={colors["primary-soft"]} />
      <Rect x={38} y={58} width={12} height={10} rx={2} />
      <Rect x={66} y={58} width={12} height={10} rx={2} />
      <Path d="M52 92 V76 a6 6 0 0 1 12 0 V92" />
      <Circle cx={112} cy={58} r={17} fill="#fff" />
      <Path d="M124 70 L138 84" />
      <Path d="M107 53 q5 -5 10 0 q2 4 -5 7 v3" />
      <Path d="M112 68 v0.5" />
    </Svg>
  );
}

export default function NotFound() {
  return (
    <Screen centered>
      <View style={styles.wrap}>
        <Illustration />
        <Text style={styles.eyebrow}>{fr.notFound.eyebrow}</Text>
        <Text role="heading" style={styles.title}>
          {fr.notFound.title}
        </Text>
        <Text style={styles.text}>{fr.notFound.text}</Text>
      </View>
      <FicheButton label={fr.notFound.home} tall onPress={() => router.replace("/")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: spacing(3) },
  eyebrow: {
    fontFamily: font.bold,
    fontSize: 12.5,
    letterSpacing: 1,
    color: colors["primary-strong"],
  },
  title: { fontFamily: font.display, fontSize: 26, letterSpacing: -0.52, color: colors.foreground },
  text: {
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.label,
    textAlign: "center",
  },
});
