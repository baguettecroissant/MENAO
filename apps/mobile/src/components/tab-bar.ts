import type { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/ui/theme";

/**
 * Hauteur de la barre d'onglets, hors marge du bas du téléphone : un peu plus que la hauteur
 * standard (49), pour que les libellés en Google Sans ne soient pas rognés.
 */
const TAB_BAR_HEIGHT = 58;

/** Barre d'onglets commune aux espaces client et artisan. */
export function useTabBarOptions(): ComponentProps<typeof Tabs>["screenOptions"] {
  const insets = useSafeAreaInsets();
  return {
    headerShown: false,
    tabBarActiveTintColor: theme.colors.primary,
    tabBarInactiveTintColor: theme.colors["muted-foreground"],
    tabBarLabelStyle: { fontFamily: theme.font.medium, fontSize: 11, lineHeight: 15 },
    tabBarStyle: {
      height: TAB_BAR_HEIGHT + insets.bottom,
      backgroundColor: theme.colors.surface,
      borderTopColor: theme.colors.border,
    },
  };
}
