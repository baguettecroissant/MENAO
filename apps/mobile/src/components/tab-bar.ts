import type { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { theme } from "@/ui/theme";

/** Barre d'onglets commune aux espaces particulier et artisan. */
export const tabBarOptions: ComponentProps<typeof Tabs>["screenOptions"] = {
  headerShown: false,
  tabBarActiveTintColor: theme.colors.primary,
  tabBarInactiveTintColor: theme.colors["muted-foreground"],
  tabBarLabelStyle: { fontFamily: theme.font.medium, fontSize: 11 },
  tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
};
