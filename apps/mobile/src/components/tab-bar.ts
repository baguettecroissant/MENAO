import type { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/ui/theme";

/**
 * Hauteur de la barre d'onglets, hors marge du bas du téléphone : un peu plus que la hauteur
 * standard (49), pour que les libellés en Google Sans ne soient pas rognés.
 */
const TAB_BAR_HEIGHT = 54;
/**
 * Marge sous les libellés : celle de la barre d'accueil de l'iPhone (34), réduite pour ne pas
 * laisser de bande blanche ; les libellés restent au-dessus de la barre d'accueil. Au moins 8
 * sans barre d'accueil (Android, anciens iPhone).
 */
const bottomPadding = (inset: number) => (inset > 0 ? Math.max(inset - 14, 8) : 8);

/** Barre d'onglets commune aux espaces client et artisan. */
export function useTabBarOptions(): ComponentProps<typeof Tabs>["screenOptions"] {
  const insets = useSafeAreaInsets();
  const bottom = bottomPadding(insets.bottom);
  return {
    headerShown: false,
    tabBarActiveTintColor: theme.colors.primary,
    tabBarInactiveTintColor: theme.colors["muted-foreground"],
    tabBarLabelStyle: { fontFamily: theme.font.medium, fontSize: 11, lineHeight: 15 },
    tabBarStyle: {
      height: TAB_BAR_HEIGHT + bottom,
      paddingBottom: bottom,
      backgroundColor: theme.colors.surface,
      borderTopColor: theme.colors.border,
    },
  };
}
