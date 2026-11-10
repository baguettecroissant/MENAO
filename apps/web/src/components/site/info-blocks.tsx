import { Check, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Briques des pages d'information du site (ADR 0276) : ligne à pictogramme, ligne cochée et cartes
 * à grand numéro. « inverse » : sur un fond bleu nuit.
 */
export function IconRow({
  icon: Icon,
  title,
  text,
  tone = "default",
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  tone?: "default" | "inverse";
}) {
  const inverse = tone === "inverse";
  return (
    <li className="flex items-start gap-4">
      <span
        className={`flex size-11 shrink-0 items-center justify-center rounded-[0.875rem] text-white ${inverse ? "bg-white/10" : "bg-foreground"}`}
      >
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-lg leading-snug font-bold tracking-tight">{title}</h3>
        <p
          className={`text-[0.9375rem] leading-relaxed text-pretty ${inverse ? "text-white/75" : "text-label"}`}
        >
          {text}
        </p>
      </div>
    </li>
  );
}

export function CheckLine({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 leading-relaxed">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
        <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
      </span>
      {children}
    </li>
  );
}

/** Étapes en grands numéros : colonnes séparées d'un trait (« inverse ») ou cartes blanches. */
export function NumberedSteps({
  items,
  tone = "default",
}: {
  items: readonly { title: string; text: string }[];
  tone?: "default" | "inverse";
}) {
  const inverse = tone === "inverse";
  const columns = items.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3";
  return (
    <ol className={`grid grid-cols-1 ${inverse ? "gap-8" : "gap-4"} ${columns}`}>
      {items.map((step, i) => (
        <li
          key={step.title}
          className={`reveal flex flex-col gap-3 ${inverse ? "" : "rounded-[1.375rem] border border-border bg-surface p-7"}`}
        >
          <span
            aria-hidden="true"
            className="font-display text-[3.25rem] leading-none font-bold tracking-tight text-[#7d95f8]"
          >
            {String(i + 1).padStart(2, "0")}
          </span>
          {inverse && <span aria-hidden="true" className="h-0.5 bg-white/20" />}
          <h3 className="font-display text-xl leading-snug font-bold tracking-tight">
            {step.title}
          </h3>
          <p
            className={`text-[0.9375rem] leading-relaxed text-pretty ${inverse ? "text-white/75" : "text-label"}`}
          >
            {step.text}
          </p>
        </li>
      ))}
    </ol>
  );
}
