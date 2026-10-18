import { Plus, type LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { LogoMark } from "@/components/logo";
import { haptic } from "@/lib/haptics";
import { theme } from "@/ui/theme";

const { colors, radius } = theme;
const SIZE = 56;

/**
 * Bouton rond au centre de la barre d'onglets, comme les maquettes : loupe de la recherche du
 * client ; pour l'artisan, le logo MENAO avec une pastille « + » qui garde le sens « créer »
 * (actions rapides, ADR 0130). Il dépasse au-dessus de la barre.
 */
export function CenterTabButton({
  icon: Icon,
  brand = false,
  label,
  onPress,
}: {
  icon?: LucideIcon;
  /** Logo MENAO et pastille « + » à la place de l'icône. */
  brand?: boolean;
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
        {brand ? (
          <>
            <LogoMark size={30} tone="white" />
            <View style={styles.badge}>
              <Plus size={12} strokeWidth={3} color={colors.primary} />
            </View>
          </>
        ) : Icon ? (
          <Icon size={26} color={colors["primary-foreground"]} />
        ) : null}
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
  // Pastille « + » en haut à droite du rond, bordée du bleu MENAO.
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
