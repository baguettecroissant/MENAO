import { OUTFIT, OUTFIT_VIEWBOX } from "@menao/ui-tokens";
import { fr } from "@/i18n/fr";

/**
 * Ensemble de chantier MENAO (récompense du niveau 5), dessiné en attendant la photo de la tenue
 * (ADR 0096). Même dessin que l'application (`@menao/ui-tokens`).
 */
export function OutfitIllustration({ className = "h-24" }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${OUTFIT_VIEWBOX.width} ${OUTFIT_VIEWBOX.height}`}
      role="img"
      aria-label={fr.pro.grade.outfitAlt}
      className={`w-auto ${className}`}
    >
      {OUTFIT.map((shape, i) => (
        <path
          key={i}
          d={shape.d}
          fill={shape.fill ?? "none"}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
