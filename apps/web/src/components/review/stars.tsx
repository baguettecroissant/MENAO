import { reviewStars } from "@menao/core";
import { Star } from "lucide-react";
import { fr } from "@/i18n/fr";

/** Étoiles d'un avis (score sur 100 ramené à 5), le pourcentage pour les lecteurs d'écran. */
export function Stars({ score }: { score: number }) {
  const stars = reviewStars(score);
  return (
    <span
      role="img"
      aria-label={fr.search.profile.stars(score, stars)}
      className="inline-flex items-center gap-0.5"
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={`size-3.5 ${i < stars ? "fill-primary text-primary" : "text-border-strong"}`}
        />
      ))}
    </span>
  );
}
