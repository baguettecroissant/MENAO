import { Check } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { fr } from "@/i18n/fr";

const t = fr.pro.tenders.plan.steps;

export type PlanStep = "releve" | "ouvrages" | "revetements" | "dpgf";
const ORDER = ["plans", "releve", "ouvrages", "revetements", "dpgf"] as const;

/**
 * Étapes d'un appel d'offres créé depuis les plans (parcours guidé, maquette du lot 56) : Plans ·
 * Mes pièces · Ce qu'il y a à faire · Revêtements · Mon prix. Les étapes déjà ouvertes se rouvrent
 * d'un clic. Un plan de terrain n'a aucune pièce : ni « Mes pièces » ni « Revêtements » (lot 52).
 */
export function PlanSteps({
  tenderId,
  current,
  reachable,
  withRooms = true,
}: {
  tenderId: string;
  current: PlanStep;
  /** Étapes qui peuvent s'ouvrir (relevé fait, DPGF créé). */
  reachable: readonly PlanStep[];
  /** Faux pour un relevé sans pièces (plan de terrain) : ni « Mes pièces » ni « Revêtements ». */
  withRooms?: boolean;
}) {
  const steps: readonly (typeof ORDER)[number][] = withRooms
    ? ORDER
    : ORDER.filter((s) => s !== "revetements" && s !== "releve");
  const index = steps.indexOf(current);
  return (
    <nav
      aria-label={t.label}
      className="flex items-center gap-2 overflow-x-auto rounded-card border border-border bg-surface px-4 py-3 shadow-card"
    >
      {steps.map((step, i) => {
        const done = i < index;
        const active = i === index;
        const link =
          step !== "plans" && !active && reachable.includes(step as PlanStep)
            ? (`/pro/demandes/appels-offres/${tenderId}?etape=${step}` as Route)
            : null;
        const content = (
          <span
            className={`inline-flex items-center gap-2 text-sm whitespace-nowrap ${
              active
                ? "font-bold text-foreground"
                : done
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                done
                  ? "bg-success text-white"
                  : active
                    ? "bg-primary text-white"
                    : "bg-border/70 text-muted-foreground"
              }`}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            {t[step]}
          </span>
        );
        return (
          <Fragment key={step}>
            {i > 0 && <span aria-hidden="true" className="h-px min-w-4 flex-1 bg-border" />}
            {link ? (
              <Link href={link} className="rounded-md hover:underline">
                {content}
              </Link>
            ) : (
              <span aria-current={active ? "step" : undefined}>{content}</span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
