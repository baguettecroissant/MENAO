import { Image, StyleSheet, Text, View } from "react-native";
import { theme } from "@/ui/theme";

const { colors, font } = theme;

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
  if (url) return <Image source={{ uri: url }} style={shape} alt="" />;
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
  empty: {
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  initial: { fontFamily: font.medium, color: colors["primary-strong"] },
  initials: { fontFamily: font.bold, color: colors["primary-strong"] },
});
