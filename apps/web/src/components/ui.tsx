import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/** Composants de base, stylés uniquement avec les tokens de @menao/ui-tokens. */

export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-card border border-border bg-surface p-6 shadow-sm sm:p-8">
      {children}
    </div>
  );
}

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function Button({ className = "", ...props }: ComponentProps<"button">) {
  return (
    <button
      className={`inline-flex min-h-touch w-full items-center justify-center rounded-button bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60 ${focusRing} ${className}`}
      {...props}
    />
  );
}

export function TextLink(props: ComponentProps<typeof Link>) {
  return (
    <Link
      className={`font-medium text-primary underline-offset-2 hover:underline ${focusRing}`}
      {...props}
    />
  );
}

type FieldProps = ComponentProps<"input"> & {
  label: string;
  name: string;
  hint?: string;
  errors?: readonly string[] | undefined;
};

export function Field({ label, name, hint, errors, ...input }: FieldProps) {
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = errors?.length ? `${name}-error` : undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        className={`min-h-touch rounded-button border border-border bg-surface px-3 aria-invalid:border-danger ${focusRing}`}
        {...input}
      />
      {hint && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {errors?.length ? (
        <p id={errorId} className="text-sm text-danger">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}

export function Alert({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  const styles = tone === "error" ? "bg-danger-soft text-danger" : "bg-success-soft text-success";
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-button px-4 py-3 ${styles}`}
    >
      {children}
    </p>
  );
}

export function PageShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-bold">{title}</h1>
      <Card>{children}</Card>
    </main>
  );
}

type CheckboxFieldProps = Omit<ComponentProps<"input">, "type" | "children"> & {
  name: string;
  children: ReactNode;
  errors?: readonly string[] | undefined;
};

export function CheckboxField({ name, children, errors, id, ...input }: CheckboxFieldProps) {
  const inputId = id ?? name;
  const errorId = errors?.length ? `${inputId}-error` : undefined;
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          id={inputId}
          name={name}
          className="mt-1 size-5 shrink-0 accent-primary"
          aria-invalid={errors?.length ? true : undefined}
          aria-describedby={errorId}
          {...input}
        />
        <span>{children}</span>
      </label>
      {errorId && (
        <p id={errorId} className="text-sm text-danger">
          {errors?.[0]}
        </p>
      )}
    </div>
  );
}

type SelectFieldProps = ComponentProps<"select"> & {
  label: string;
  name: string;
  errors?: readonly string[] | undefined;
};

export function SelectField({ label, name, errors, children, ...select }: SelectFieldProps) {
  const errorId = errors?.length ? `${name}-error` : undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="font-medium">
        {label}
      </label>
      <select
        id={name}
        name={name}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={errorId}
        className={`min-h-touch rounded-button border border-border bg-surface px-3 aria-invalid:border-danger ${focusRing}`}
        {...select}
      >
        {children}
      </select>
      {errorId && (
        <p id={errorId} className="text-sm text-danger">
          {errors?.[0]}
        </p>
      )}
    </div>
  );
}

type RadioGroupProps = {
  legend: string;
  name: string;
  options: readonly { value: string; label: string }[];
  value?: string | undefined;
  defaultValue?: string | undefined;
  onChange?: (value: string) => void;
  errors?: readonly string[] | undefined;
};

export function RadioGroup({
  legend,
  name,
  options,
  value,
  defaultValue,
  onChange,
  errors,
}: RadioGroupProps) {
  const errorId = errors?.length ? `${name}-error` : undefined;
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={errorId}>
      <legend className="mb-1 font-medium">{legend}</legend>
      {options.map((option) => (
        <label key={option.value} className="flex min-h-touch items-center gap-3">
          <input
            type="radio"
            name={name}
            value={option.value}
            className="size-5 accent-primary"
            {...(value !== undefined
              ? { checked: value === option.value, onChange: () => onChange?.(option.value) }
              : { defaultChecked: defaultValue === option.value })}
          />
          <span>{option.label}</span>
        </label>
      ))}
      {errorId && (
        <p id={errorId} className="text-sm text-danger">
          {errors?.[0]}
        </p>
      )}
    </fieldset>
  );
}
