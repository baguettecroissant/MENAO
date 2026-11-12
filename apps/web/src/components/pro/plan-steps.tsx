import { Check } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { fr } from "@/i18n/fr";

const t = fr.pro.tenders.plan.steps;

export type PlanStep = "releve" | "revetements" | "dpgf";
const ORDER = ["plans", "releve", "revetements", "dpgf", "chiffrage"] as const;

/**
 * Étapes d'un appel d'offres créé depuis les plans (maquette du lot 35) : Plans · Relevé ·
 * Revêtements · DPGF · Chiffrage. Les étapes déjà ouvertes se rouvrent d'un clic.
 */
export function PlanSteps({
  tenderId,
  current,
  reachable,
  checked,
}: {
  tenderId: string;
  current: PlanStep;
  /** Étapes qui peuvent s'ouvrir (relevé fait, DPGF créé). */
  reachable: readonly PlanStep[];
  /** Quantités vérifiées : l'étape « Chiffrage » est en cours. */
  checked: boolean;
}) {
  const index = checked && current === "dpgf" ? 4 : ORDER.indexOf(current);
  return (
    <nav
      aria-label={t.label}
      className="flex items-center gap-2 overflow-x-auto rounded-card border border-border bg-surface px-4 py-3 shadow-card"
    >
      {ORDER.map((step, i) => {
        const done = i < index;
        const active = i === index;
        const target = step === "chiffrage" ? "dpgf" : step;
        const link =
          step !== "plans" && !active && reachable.includes(target as PlanStep)
            ? (`/pro/demandes/appels-offres/${tenderId}?etape=${target}` as Route)
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
                    ? "bg-foreground text-surface"
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
