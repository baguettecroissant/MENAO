import { ArrowLeft, Check } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";

export type ClientStep = { label: string; state: "done" | "current" | "todo" };

/**
 * Étapes d'un parcours du particulier (signature puis acompte ; réserves, PV, solde puis avis),
 * refonte « Nette » (ADR 0256) : pastilles numérotées ou cochées, reliées par un trait.
 */
export function ClientSteps({ label, steps }: { label: string; steps: readonly ClientStep[] }) {
  return (
    <nav
      aria-label={label}
      className="flex items-center gap-1.5 overflow-x-auto rounded-card border border-border bg-surface px-3 py-3 shadow-card [scrollbar-width:none] sm:gap-3 sm:px-5"
    >
      {steps.map((step, index) => (
        <Fragment key={step.label}>
          {index > 0 && (
            <span
              aria-hidden="true"
              className={`h-0.5 min-w-3 flex-1 rounded-pill ${
                step.state === "todo" ? "bg-border" : "bg-success"
              }`}
            />
          )}
          <span
            aria-current={step.state === "current" ? "step" : undefined}
            className={`flex shrink-0 items-center gap-2 text-sm ${
              step.state === "current"
                ? "font-bold text-foreground"
                : step.state === "done"
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex size-7 items-center justify-center rounded-full text-[0.8125rem] font-bold ${
                step.state === "done"
                  ? "bg-success text-white"
                  : step.state === "current"
                    ? "bg-foreground text-white"
                    : "border border-border-strong bg-surface text-muted-foreground"
              }`}
            >
              {step.state === "done" ? <Check className="size-3.5" strokeWidth={3} /> : index + 1}
            </span>
            <span className={step.state === "current" ? "" : "sr-only sm:not-sr-only"}>
              {step.label}
            </span>
          </span>
        </Fragment>
      ))}
    </nav>
  );
}

/**
 * Page d'un parcours du particulier : retour, grand titre, phrase, étapes, puis le contenu à gauche
 * et, s'il y en a un, le résumé ou le paiement à droite (en dessous sur téléphone).
 */
export function ClientFlowPage({
  backHref,
  backLabel,
  title,
  lead,
  steps,
  aside,
  children,
}: {
  backHref: Route;
  backLabel: string;
  title?: ReactNode;
  lead?: ReactNode;
  steps?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 self-start rounded-sm text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {backLabel}
        </Link>
        {(title || lead) && (
          <div className="flex max-w-3xl flex-col gap-2">
            {title && (
              <h1 className="text-[2rem] leading-[1.05] font-medium tracking-tight sm:text-[2.5rem]">
                {title}
              </h1>
            )}
            {lead && <p className="text-[0.9375rem] text-label sm:text-base">{lead}</p>}
          </div>
        )}
        {steps}
        {aside ? (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="flex min-w-0 flex-col gap-4">{children}</div>
            <div className="flex flex-col gap-4 lg:sticky lg:top-24">{aside}</div>
          </div>
        ) : (
          <div className="flex max-w-3xl flex-col gap-5">{children}</div>
        )}
      </div>
    </main>
  );
}
