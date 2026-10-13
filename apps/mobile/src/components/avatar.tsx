import { Image, StyleSheet, Text, View } from "react-native";
import { theme } from "@/ui/theme";

const { colors, font } = theme;

/** Photo de profil ronde, ou l'initiale du nom sur fond bleu clair. */
export function Avatar({
  url,
  name,
  size = 44,
}: {
  url: string | null;
  name: string;
  size?: number;
}) {
  const shape = { width: size, height: size, borderRadius: size / 2 };
  if (url) return <Image source={{ uri: url }} style={shape} alt="" />;
  return (
    <View style={[shape, styles.empty]}>
      <Text style={[styles.initial, { fontSize: Math.round(size * 0.4) }]}>
        {name.charAt(0).toUpperCase()}
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
});
