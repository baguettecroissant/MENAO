"use client";

import { Search } from "lucide-react";
import { useId, type ReactNode } from "react";
import { focusRing, inputClasses } from "@/components/ui";

/** Briques communes aux étapes de l'inscription artisan (ADR 0110). */

/** Comparaison sans accents ni majuscules (« electricien » trouve « Électricien »). */
export function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function StepTitle({ title, lead }: { title: string; lead?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-[1.625rem] leading-tight font-semibold tracking-tight">{title}</h1>
      {lead && <p className="text-[0.9375rem] leading-relaxed text-muted-foreground">{lead}</p>}
    </div>
  );
}

/** Bouton principal toujours visible en bas de l'écran, au pouce sur téléphone. */
export function StepFooter({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-auto flex flex-col items-center gap-1 border-t border-border bg-surface px-4 pt-3 pb-4 sm:mx-0 sm:rounded-card sm:border sm:shadow-raised">
      {children}
    </div>
  );
}

export function SearchInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id={id}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? label}
          autoComplete="off"
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={`${inputClasses} min-h-[3.25rem] bg-surface pl-12 text-base`}
        />
      </div>
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Question à réponses en gros boutons (boutons radio, au clavier comme au doigt). */
export function ChoiceGroup<T extends string | number | boolean>({
  legend,
  hint,
  value,
  options,
  onChange,
  columns = 2,
}: {
  legend: string;
  hint?: string;
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  columns?: 2 | 3;
}) {
  const name = useId();
  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="mb-3 text-[1.0625rem] font-semibold">{legend}</legend>
      <div className={`grid gap-2.5 ${columns === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {options.map((option) => (
          <label key={String(option.value)} className="relative">
            <input
              type="radio"
              name={name}
              value={String(option.value)}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span
              className={`flex min-h-[3.25rem] cursor-pointer items-center justify-center rounded-input border-[1.5px] border-border-strong bg-surface px-3 text-center text-[0.9375rem] font-semibold transition-colors peer-checked:border-primary peer-checked:bg-primary-softer peer-checked:text-primary-strong peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20 hover:border-primary`}
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </fieldset>
  );
}

/** Lien d'action discret (bouton). */
export function LinkButton({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-touch self-start rounded-sm text-[0.9375rem] font-semibold text-primary-strong underline underline-offset-4 hover:text-primary-hover ${focusRing} ${className}`}
    >
      {children}
    </button>
  );
}
