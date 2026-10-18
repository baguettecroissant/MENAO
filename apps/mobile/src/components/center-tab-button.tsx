import type { LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { theme } from "@/ui/theme";
import { haptic } from "@/lib/haptics";

const { colors, radius } = theme;
const SIZE = 56;

/**
 * Bouton rond au centre de la barre d'onglets, comme les maquettes : (+) des actions de l'artisan,
 * loupe de la recherche du client. Il dépasse au-dessus de la barre.
 */
export function CenterTabButton({
  icon: Icon,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.slot}>
      <Pressable
        role="button"
        aria-label={label}
        onPress={() => {
          haptic.tap();
          onPress();
        }}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Icon size={26} color={colors["primary-foreground"]} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { flex: 1, alignItems: "center" },
  button: {
    width: SIZE,
    height: SIZE,
    marginTop: -SIZE / 3,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 6px 16px rgba(72, 105, 246, 0.35)",
  },
  pressed: { opacity: 0.85 },
});
