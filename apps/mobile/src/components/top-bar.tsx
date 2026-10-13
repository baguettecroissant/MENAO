import { ChevronLeft } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { goBack } from "@/lib/navigation";
import { theme } from "@/ui/theme";

/** Barre du haut des écrans ouverts par-dessus les onglets : retour et titre facultatif. */
export function TopBar({ title, onBack = goBack }: { title?: string; onBack?: () => void }) {
  return (
    <View style={styles.bar}>
      <Pressable
        role="button"
        aria-label={fr.nav.back}
        onPress={onBack}
        hitSlop={8}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <ChevronLeft size={24} color={theme.colors.foreground} />
      </Pressable>
      {title ? (
        <Text role="heading" style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(2),
    marginBottom: -theme.spacing(1),
  },
  back: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    marginLeft: -theme.spacing(3),
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { backgroundColor: theme.colors["primary-soft"] },
  title: { flex: 1, fontFamily: theme.font.medium, fontSize: 18, color: theme.colors.foreground },
});
