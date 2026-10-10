import { CHANTIER_STEPS } from "@menao/core";
import { Check } from "lucide-react";
import { fr } from "@/i18n/fr";

const t = fr.chantier;

/**
 * Stepper du chantier en 5 étapes (spec §5 et §9) : Signature → Paiement → Planification →
 * Travaux → Réception. `current` vient de chantierStepIndex (@menao/core).
 */
export function ChantierStepper({ current }: { current: number }) {
  return (
    <ol aria-label={t.stepsLabel} className="flex items-start">
      {CHANTIER_STEPS.map((step, i) => {
        const state = i < current ? "done" : i === current ? "current" : "upcoming";
        return (
          <li
            key={step}
            aria-current={state === "current" ? "step" : undefined}
            className="relative flex min-w-0 flex-1 flex-col items-center gap-1.5"
          >
            {i > 0 && (
              <span
                aria-hidden="true"
                className={`absolute top-3.5 right-1/2 h-0.5 w-full -translate-y-1/2 ${
                  i <= current ? "bg-primary" : "bg-border-strong"
                }`}
              />
            )}
            <span
              aria-hidden="true"
              className={`relative z-10 flex size-7 items-center justify-center rounded-full border-[1.5px] ${
                state === "done"
                  ? "border-primary bg-primary-soft text-primary-strong"
                  : state === "current"
                    ? "border-primary bg-surface"
                    : "border-dashed border-border-strong bg-surface text-subtle-foreground"
              }`}
            >
              {state === "done" ? (
                <Check className="size-3.5" strokeWidth={2.5} />
              ) : state === "current" ? (
                <span className="size-2.5 rounded-full bg-primary" />
              ) : (
                <span className="text-[0.625rem] leading-none tracking-[0.15em]">···</span>
              )}
            </span>
            <span
              className={`text-[0.625rem] whitespace-nowrap sm:text-[0.6875rem] ${
                state === "current" ? "font-medium text-primary-strong" : "text-muted-foreground"
              }`}
            >
              {t.steps[step]}
              <span className="sr-only"> ({t.stepState[state]})</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
