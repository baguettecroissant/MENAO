import { colors, nativeRadius, nativeTouchTarget, netteColors } from "@menao/ui-tokens";

/**
 * Thème de l'application native : mêmes couleurs, rayons et cible tactile que le site. Refonte
 * « Nette » (ADR 0245) : Inter pour les textes, Inter Tight pour les titres et les grands chiffres
 * (`display`), gris secondaires plus foncés, comme les espaces connectés du site.
 */
export const theme = {
  colors: { ...colors, ...netteColors },
  radius: nativeRadius,
  touchTarget: nativeTouchTarget,
  font: {
    regular: "Inter_400Regular",
    medium: "Inter_500Medium",
    semibold: "Inter_600SemiBold",
    bold: "Inter_700Bold",
    display: "InterTight_700Bold",
  },
  spacing: (n: number) => n * 4,
} as const;
