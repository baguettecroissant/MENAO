import {
  ILLUSTRATIONS,
  ILLUSTRATION_STROKE,
  ILLUSTRATION_VIEWBOX,
  type IllustrationName,
  type IllustrationTone,
} from "@menao/ui-tokens";
import type { ReactNode } from "react";

// Couleurs de chaque ton, par les tokens du thème (suivent le mode sombre).
const TONE_CLASSES: Record<IllustrationTone, string> = {
  soft: "fill-primary-soft",
  card: "fill-surface stroke-primary",
  line: "fill-none stroke-primary",
  accent: "fill-primary",
  inverse: "fill-none stroke-primary-foreground",
};

/** Illustration maison d'un état vide (ADR 0095), décorative. */
export function Illustration({
  name,
  className = "h-24 w-30",
}: {
  name: IllustrationName;
  className?: string;
}) {
  const { width, height } = ILLUSTRATION_VIEWBOX;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className={className}
      strokeWidth={ILLUSTRATION_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ILLUSTRATIONS[name].map((shape, i) => (
        <path key={i} d={shape.d} className={TONE_CLASSES[shape.tone]} />
      ))}
    </svg>
  );
}

/**
 * Cadre en pointillés d'une liste vide : illustration, titre éventuel, texte, puis une action
 * facultative (bouton ou lien).
 */
export function EmptyState({
  illustration,
  title,
  children,
  action,
  className = "py-10",
}: {
  illustration: IllustrationName;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  /** Classes ajoutées au cadre ; par défaut, sa marge intérieure verticale. */
  className?: string;
}) {
  return (
    <section
      className={`flex flex-col items-center gap-3 rounded-card border border-dashed border-border-strong bg-surface px-6 text-center ${className}`}
    >
      <Illustration name={illustration} />
      {title && <p className="text-lg font-medium">{title}</p>}
      {children && <p className="max-w-md text-sm text-muted-foreground">{children}</p>}
      {action}
    </section>
  );
}
