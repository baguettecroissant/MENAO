"use client";

import { ONBOARDING_STEPS, type OnboardingStep } from "@menao/core";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { fr } from "@/i18n/fr";

const t = fr.pro.onboarding;

export function Stepper({ progress }: { progress: Record<OnboardingStep, boolean> }) {
  const pathname = usePathname();
  return (
    <nav aria-label={t.stepper}>
      <ol className="flex flex-wrap gap-2">
        {ONBOARDING_STEPS.map((step, index) => {
          const href = `/pro/onboarding/${step.key}`;
          const current = pathname === href;
          const done = progress[step.key];
          const status = done ? t.done : current ? t.current : step.available ? "" : t.comingSoon;
          const label = (
            <>
              <span aria-hidden="true">{done ? "✓" : index + 1}</span> {t.steps[step.key]}
              {status && <span className="sr-only"> ({status})</span>}
            </>
          );
          const base = "inline-flex min-h-touch items-center gap-1 rounded-chip px-3 text-sm";
          return (
            <li key={step.key}>
              {step.available ? (
                <Link
                  href={href as Route}
                  aria-current={current ? "step" : undefined}
                  className={`${base} border ${
                    current
                      ? "border-primary bg-primary text-primary-foreground"
                      : done
                        ? "border-success bg-success-soft text-success"
                        : "border-border bg-surface"
                  }`}
                >
                  {label}
                </Link>
              ) : (
                <span
                  className={`${base} border border-dashed border-border text-muted-foreground`}
                >
                  {label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
