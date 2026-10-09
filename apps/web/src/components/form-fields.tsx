"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps, type ReactNode } from "react";
import { FieldError, Hint, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";

type BaseProps = {
  label: string;
  name: string;
  labelNote?: string;
  hint?: ReactNode;
  errors?: readonly string[] | undefined;
};

/** Téléphone précédé de l'indicatif français (maquettes) ; les numéros étrangers restent acceptés avec « + ». */
export function PhoneField({
  label,
  name,
  labelNote,
  hint,
  errors,
  id,
  ...input
}: BaseProps & Omit<ComponentProps<"input">, "name" | "type">) {
  const inputId = id ?? name;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = errors?.length ? `${inputId}-error` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
        {labelNote && <span className="font-normal text-subtle-foreground"> {labelNote}</span>}
      </label>
      <div className="flex">
        <span
          aria-hidden="true"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-l-input border border-r-0 border-border bg-input px-3 text-sm"
        >
          <span className="text-base">🇫🇷</span>
          +33
        </span>
        <input
          id={inputId}
          name={name}
          type="tel"
          autoComplete="tel-national"
          inputMode="tel"
          aria-invalid={errors?.length ? true : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
          className={`${inputClasses} rounded-l-none`}
          {...input}
        />
      </div>
      {errors?.length ? <FieldError id={errorId}>{errors[0]}</FieldError> : null}
      {hint && <Hint id={hintId}>{hint}</Hint>}
    </div>
  );
}

/** Mot de passe avec bouton « afficher » (maquettes : icône œil). */
export function PasswordField({
  label,
  name,
  hint,
  errors,
  id,
  ...input
}: BaseProps & Omit<ComponentProps<"input">, "name" | "type">) {
  const [visible, setVisible] = useState(false);
  const inputId = id ?? name;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = errors?.length ? `${inputId}-error` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type={visible ? "text" : "password"}
          aria-invalid={errors?.length ? true : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
          className={`${inputClasses} pr-12`}
          {...input}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? fr.form.hidePassword : fr.form.showPassword}
          aria-pressed={visible}
          className="absolute top-1/2 right-2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
        >
          {visible ? (
            <EyeOff aria-hidden="true" className="size-4" />
          ) : (
            <Eye aria-hidden="true" className="size-4" />
          )}
        </button>
      </div>
      {errors?.length ? <FieldError id={errorId}>{errors[0]}</FieldError> : null}
      {hint && <Hint id={hintId}>{hint}</Hint>}
    </div>
  );
}
