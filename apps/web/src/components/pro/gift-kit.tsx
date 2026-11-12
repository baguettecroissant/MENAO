"use client";

import { REWARD_SIZES } from "@menao/core";
import { Check, MapPin, Truck } from "lucide-react";
import { useState, type ReactNode } from "react";
import { FieldError } from "@/components/ui";

/** Bleu nuit des dessins de la tenue, du t-shirt et de la casquette MENAO. */
const NAVY = "#1d2a5b";
const NAVY_LIGHT = "#2c3c7a";

/** T-shirt MENAO dessiné (illustration, pas le vrai produit). */
export function TshirtArt({ className = "size-24" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <path
        d="M30 14 L42 10 Q50 18 58 10 L70 14 L88 32 L76 42 L70 36 L70 90 L30 90 L30 36 L24 42 L12 32 Z"
        fill={NAVY}
      />
      <text
        x="50"
        y="58"
        textAnchor="middle"
        className="font-display"
        fontSize="11"
        fontWeight="800"
        fill="#fff"
      >
        menao
      </text>
    </svg>
  );
}

/** Casquette MENAO dessinée (illustration, pas le vrai produit). */
export function CapArt({ className = "size-24" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <path d="M18 62 Q18 26 52 26 Q82 26 84 60 Z" fill={NAVY} />
      <path d="M14 62 L92 62 Q96 70 86 72 L20 72 Q10 70 14 62 Z" fill={NAVY_LIGHT} />
      <circle cx="52" cy="26" r="3.5" fill={NAVY_LIGHT} />
      <text
        x="51"
        y="52"
        textAnchor="middle"
        className="font-display"
        fontSize="11"
        fontWeight="800"
        fill="#fff"
      >
        menao
      </text>
    </svg>
  );
}

/** Tailles en pastilles (S à XXL) ; la taille choisie a une bordure foncée. */
export function SizePills({
  name,
  legend,
  value,
  error,
}: {
  name: string;
  legend: string;
  value?: string;
  error?: string;
}) {
  return (
    <fieldset
      className="flex flex-col gap-2"
      aria-describedby={error ? `${name}-error` : undefined}
    >
      <legend className="pb-1 text-sm font-semibold">{legend}</legend>
      <div className="grid grid-cols-5 gap-2">
        {REWARD_SIZES.map((size) => (
          <label key={size} className="relative">
            <input
              type="radio"
              name={name}
              value={size}
              defaultChecked={value === size}
              className="peer sr-only"
            />
            <span className="flex min-h-11 cursor-pointer items-center justify-center rounded-input border border-border bg-surface text-[0.9375rem] font-semibold text-label transition-colors peer-checked:border-2 peer-checked:border-foreground peer-checked:text-foreground peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20 hover:bg-background">
              {size}
            </span>
          </label>
        ))}
      </div>
      {error && <FieldError id={`${name}-error`}>{error}</FieldError>}
    </fieldset>
  );
}

/** Grande tuile de choix illustrée, avec une coche ronde en haut à droite. */
export function ChoiceTile({
  name,
  value,
  label,
  art,
  checked,
  onChange,
}: {
  name: string;
  value: string;
  label: string;
  art: ReactNode;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="relative flex-1">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span className="flex h-full cursor-pointer flex-col items-center gap-2 rounded-card border border-border bg-surface p-4 text-center transition-colors peer-checked:border-2 peer-checked:border-foreground peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20 hover:bg-background sm:p-5">
        {art}
        <span className="text-[0.9375rem] font-semibold">{label}</span>
      </span>
      <span
        aria-hidden="true"
        className={`absolute top-3 right-3 flex size-[1.375rem] items-center justify-center rounded-full ${
          checked ? "bg-foreground text-white" : "border-[1.5px] border-border-strong bg-surface"
        }`}
      >
        {checked && <Check className="size-3.5" strokeWidth={3} />}
      </span>
    </label>
  );
}

/**
 * Adresse de livraison en résumé (celle de l'entreprise) ; « Modifier l'adresse » déplie les
 * champs, toujours envoyés avec le formulaire. Ouverte d'emblée s'il y a une erreur.
 */
export function AddressSummary({
  title,
  lines,
  hint,
  editLabel,
  open: startOpen = false,
  children,
}: {
  title: string;
  lines: (string | null)[];
  hint: string;
  editLabel: string;
  open?: boolean;
  children: ReactNode;
}) {
  const shown = lines.filter(Boolean);
  const [open, setOpen] = useState(startOpen || shown.length === 0);
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold">{title}</span>
      {!open && (
        <div className="flex items-start gap-3 rounded-input border border-border bg-surface px-4 py-3">
          <MapPin
            aria-hidden="true"
            className="mt-0.5 size-[1.125rem] shrink-0 text-muted-foreground"
          />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
            {shown.map((line, i) => (
              <span key={line} className={i === 0 ? "font-semibold" : "text-label"}>
                {line}
              </span>
            ))}
            <span className="text-[0.8125rem] text-muted-foreground">{hint}</span>
          </span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 text-sm font-semibold text-primary-strong hover:underline"
          >
            {editLabel}
          </button>
        </div>
      )}
      <div hidden={!open} className="flex flex-col gap-4">
        {children}
      </div>
    </div>
  );
}

export type GiftStep = { label: string; hint: string; state: "done" | "current" | "todo" };

/** Frise du suivi d'un envoi : choisi, en préparation, envoyé. */
export function GiftSteps({ label, steps }: { label: string; steps: GiftStep[] }) {
  return (
    <ol aria-label={label} className="flex flex-col gap-3">
      {steps.map((step, i) => (
        <li key={step.label} className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className={`flex size-[1.625rem] shrink-0 items-center justify-center rounded-full ${
              step.state === "todo"
                ? "border-2 border-border-strong bg-surface"
                : i === 0
                  ? "bg-success text-white"
                  : "bg-foreground text-white"
            }`}
          >
            {step.state !== "todo" &&
              (i === 0 || step.state === "done" ? (
                <Check className="size-3.5" strokeWidth={3} />
              ) : (
                <Truck className="size-3.5" />
              ))}
          </span>
          <span className="flex flex-col gap-0.5 pt-0.5">
            <span
              aria-current={step.state === "current" ? "step" : undefined}
              className={`text-sm font-semibold ${step.state === "todo" ? "text-muted-foreground" : ""}`}
            >
              {step.label}
            </span>
            <span className="text-[0.8125rem] text-muted-foreground">{step.hint}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
