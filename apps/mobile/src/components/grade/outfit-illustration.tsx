import { OUTFIT, OUTFIT_VIEWBOX } from "@menao/ui-tokens";
import Svg, { Path } from "react-native-svg";
import { fr } from "@/i18n/fr";

/**
 * Ensemble de chantier MENAO (récompense du niveau 5), dessiné en attendant la photo de la tenue
 * (ADR 0096). Même dessin que le site (`@menao/ui-tokens`).
 */
export function OutfitIllustration({ height = 96 }: { height?: number }) {
  return (
    <Svg
      width={(height * OUTFIT_VIEWBOX.width) / OUTFIT_VIEWBOX.height}
      height={height}
      viewBox={`0 0 ${OUTFIT_VIEWBOX.width} ${OUTFIT_VIEWBOX.height}`}
      role="img"
      aria-label={fr.grade.outfitAlt}
    >
      {OUTFIT.map((shape, i) => (
        <Path
          key={i}
          d={shape.d}
          fill={shape.fill ?? "none"}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
