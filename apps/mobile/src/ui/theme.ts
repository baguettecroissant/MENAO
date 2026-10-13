import { colors, nativeRadius, nativeTouchTarget } from "@menao/ui-tokens";

/** Thème de l'application native : mêmes couleurs, rayons et cible tactile que le site. */
export const theme = {
  colors,
  radius: nativeRadius,
  touchTarget: nativeTouchTarget,
  font: {
    regular: "GoogleSans_400Regular",
    medium: "GoogleSans_500Medium",
    bold: "GoogleSans_700Bold",
  },
  spacing: (n: number) => n * 4,
} as const;
