import { isLogoImagePath } from "@menao/core";
import { Image, StyleSheet, Text, View, type ImageStyle, type StyleProp } from "react-native";
import { theme } from "@/ui/theme";

const { colors, font } = theme;

/**
 * Image d'un compte dans un cadre (rond le plus souvent). Un logo (ADR 0357) n'est jamais rogné :
 * il est montré en entier sur fond blanc, à 70 % du cadre pour tenir dans un rond.
 */
export function AvatarImage({ uri, style }: { uri: string; style: StyleProp<ImageStyle> }) {
  if (!isLogoImagePath(uri)) return <Image source={{ uri }} style={style} alt="" />;
  return (
    <View style={[style as object, styles.logoFrame]}>
      <Image source={{ uri }} style={styles.logoImage} resizeMode="contain" alt="" />
    </View>
  );
}

/**
 * Photo de profil ronde, ou l'initiale du nom sur fond bleu clair. `initials` : les initiales des
 * deux premiers mots (« TG »), comme les listes « Nette » (Messages).
 */
export function Avatar({
  url,
  name,
  size = 44,
  initials = false,
}: {
  url: string | null;
  name: string;
  size?: number;
  initials?: boolean;
}) {
  const shape = { width: size, height: size, borderRadius: size / 2 };
  if (url) return <AvatarImage uri={url} style={shape} />;
  const letters = initials
    ? name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word.charAt(0))
        .join("")
    : name.charAt(0);
  return (
    <View style={[shape, styles.empty]}>
      <Text
        style={[
          initials ? styles.initials : styles.initial,
          { fontSize: Math.round(size * (initials ? 0.34 : 0.4)) },
        ]}
      >
        {letters.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logoFrame: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  logoImage: { width: "70%", height: "70%" },
  empty: {
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  initial: { fontFamily: font.medium, color: colors["primary-strong"] },
  initials: { fontFamily: font.bold, color: colors["primary-strong"] },
});
