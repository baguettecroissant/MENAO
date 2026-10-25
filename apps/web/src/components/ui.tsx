import { ChevronDown, CircleAlert, CircleCheck, Info, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * Composants de base MENAO, d'après les maquettes Figma : boutons en pilule, champs gris très
 * clair à coins arrondis, cartes blanches sur fond crème, puces bleu clair.
 * Styles uniquement à partir des tokens de @menao/ui-tokens.
 */

export const focusRing =
  "outline-none focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:border-primary";

export function Card({
  children,
  className = "",
  ...props
}: ComponentProps<"div"> & { children: ReactNode }) {
  return (
    <div
      className={`rounded-card border border-border bg-surface p-5 shadow-card sm:p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

const buttonVariants = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary-hover disabled:bg-border-strong disabled:text-muted-foreground",
  outline:
    "border border-primary bg-surface text-primary-strong hover:bg-primary-softer disabled:border-border-strong disabled:text-subtle-foreground",
  secondary:
    "border border-border-strong bg-surface text-foreground hover:bg-background disabled:text-subtle-foreground",
  ghost: "text-muted-foreground hover:bg-background hover:text-foreground",
  danger: "bg-danger text-primary-foreground hover:opacity-90 disabled:opacity-60",
  "danger-text": "text-danger hover:bg-danger-soft",
} as const;

const buttonSizes = {
  sm: "min-h-9 px-4 text-sm",
  md: "min-h-touch px-5 text-[0.9375rem]",
  lg: "min-h-12 px-7 text-base",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;

export function buttonClasses({
  variant = "primary",
  size = "md",
  block = true,
}: { variant?: ButtonVariant; size?: keyof typeof buttonSizes; block?: boolean } = {}) {
  return `inline-flex items-center justify-center gap-2 rounded-button font-medium transition-colors disabled:cursor-not-allowed [&>svg.lucide-arrow-right]:transition-transform hover:[&>svg.lucide-arrow-right]:translate-x-1 ${
    block ? "w-full" : ""
  } ${buttonSizes[size]} ${buttonVariants[variant]} ${focusRing}`;
}

export function Button({
  className = "",
  variant = "primary",
  size = "md",
  block = true,
  ...props
}: ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: keyof typeof buttonSizes;
  block?: boolean;
}) {
  return (
    <button className={`${buttonClasses({ variant, size, block })} ${className}`} {...props} />
  );
}

/** Lien présenté comme un bouton. */
export function ButtonLink({
  className = "",
  variant = "primary",
  size = "md",
  block = false,
  ...props
}: ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: keyof typeof buttonSizes;
  block?: boolean;
}) {
  return <Link className={`${buttonClasses({ variant, size, block })} ${className}`} {...props} />;
}

export function TextLink({ className = "", ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={`font-medium text-primary-strong underline-offset-2 hover:underline ${focusRing} rounded-sm ${className}`}
      {...props}
    />
  );
}

/** Aide sous un champ, précédée de l'icône « i » (maquettes). */
export function Hint({
  id,
  children,
  tone = "muted",
}: {
  id?: string;
  children: ReactNode;
  tone?: "muted" | "primary" | "success";
}) {
  const color =
    tone === "primary"
      ? "text-primary-strong"
      : tone === "success"
        ? "text-success"
        : "text-muted-foreground";
  return (
    <p id={id} className={`flex items-start gap-1.5 text-xs leading-relaxed ${color}`}>
      <Info aria-hidden="true" className="mt-px size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-1.5 text-xs text-danger">
      <CircleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export const inputClasses = `w-full min-h-12 rounded-input border border-border bg-input px-4 text-[0.9375rem] text-foreground placeholder:text-subtle-foreground transition-colors aria-invalid:border-danger disabled:opacity-60 [&[readonly]]:bg-background ${focusRing}`;

type FieldProps = ComponentProps<"input"> & {
  label: string;
  name: string;
  hint?: ReactNode;
  /** Texte discret à côté du libellé, ex. « (optionnel) ». */
  labelNote?: string;
  errors?: readonly string[] | undefined;
};

export function Field({
  label,
  name,
  hint,
  labelNote,
  errors,
  id,
  className = "",
  ...input
}: FieldProps) {
  const inputId = id ?? name;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = errors?.length ? `${inputId}-error` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
        {labelNote && <span className="font-normal text-subtle-foreground"> {labelNote}</span>}
      </label>
      <input
        id={inputId}
        name={name}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        className={`${inputClasses} ${className}`}
        {...input}
      />
      {errors?.length ? <FieldError id={errorId}>{errors[0]}</FieldError> : null}
      {hint && <Hint id={hintId}>{hint}</Hint>}
    </div>
  );
}

export function Alert({
  tone,
  children,
}: {
  tone: "error" | "success" | "info";
  children: ReactNode;
}) {
  const styles = {
    error: "bg-danger-soft text-danger",
    success: "bg-success-soft text-success",
    info: "bg-primary-soft text-primary-strong",
  }[tone];
  const Icon = tone === "error" ? CircleAlert : tone === "success" ? CircleCheck : Info;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-input px-4 py-3 text-sm ${styles}`}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** Page simple centrée (authentification, confirmations). */
export function PageShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-10 sm:py-14">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{title}</h1>
        {intro && <p className="text-muted-foreground">{intro}</p>}
      </div>
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
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          id={inputId}
          name={name}
          className="mt-0.5 size-[1.125rem] shrink-0 rounded accent-primary"
          aria-invalid={errors?.length ? true : undefined}
          aria-describedby={errorId}
          {...input}
        />
        <span>{children}</span>
      </label>
      {errorId && <FieldError id={errorId}>{errors?.[0]}</FieldError>}
    </div>
  );
}

type SelectFieldProps = ComponentProps<"select"> & {
  label: string;
  name: string;
  hint?: ReactNode;
  errors?: readonly string[] | undefined;
};

export function SelectField({
  label,
  name,
  hint,
  errors,
  children,
  id,
  ...select
}: SelectFieldProps) {
  const selectId = id ?? name;
  const errorId = errors?.length ? `${selectId}-error` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <Select
        id={selectId}
        name={name}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={errorId}
        {...select}
      >
        {children}
      </Select>
      {errorId && <FieldError id={errorId}>{errors?.[0]}</FieldError>}
      {hint && <Hint>{hint}</Hint>}
    </div>
  );
}

/** Liste déroulante native, avec le chevron des maquettes. */
export function Select({ className = "", children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={`${inputClasses} appearance-none pr-11 ${className}`} {...props}>
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

type RadioGroupProps = {
  legend: string;
  name: string;
  options: readonly { value: string; label: string; description?: string }[];
  value?: string | undefined;
  defaultValue?: string | undefined;
  onChange?: (value: string) => void;
  errors?: readonly string[] | undefined;
  /** Contenu affiché sous l'option sélectionnée (ex. sélecteur de date). */
  renderSelected?: (value: string) => ReactNode;
  hideLegend?: boolean;
};

/** Choix unique présenté en options bordées (maquettes « Date de début souhaitée »). */
export function RadioGroup({
  legend,
  name,
  options,
  value,
  defaultValue,
  onChange,
  errors,
  renderSelected,
  hideLegend = false,
}: RadioGroupProps) {
  const errorId = errors?.length ? `${name}-error` : undefined;
  return (
    <fieldset className="flex flex-col gap-2.5" aria-describedby={errorId}>
      <legend className={hideLegend ? "sr-only" : "mb-1 text-sm font-medium"}>{legend}</legend>
      {options.map((option) => {
        const checked = value !== undefined ? value === option.value : undefined;
        const extra = checked && renderSelected ? renderSelected(option.value) : null;
        return (
          <div
            key={option.value}
            className={`rounded-input border bg-surface transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary-softer ${
              extra ? "border-primary" : "border-border"
            }`}
          >
            <label className="flex min-h-12 cursor-pointer items-center gap-3 px-4 text-[0.9375rem]">
              <input
                type="radio"
                name={name}
                value={option.value}
                className="size-[1.125rem] shrink-0 accent-primary"
                {...(value !== undefined
                  ? { checked: value === option.value, onChange: () => onChange?.(option.value) }
                  : { defaultChecked: defaultValue === option.value })}
              />
              <span className="flex flex-col">
                <span>{option.label}</span>
                {option.description && (
                  <span className="text-xs text-muted-foreground">{option.description}</span>
                )}
              </span>
            </label>
            {extra && <div className="px-4 pb-4">{extra}</div>}
          </div>
        );
      })}
      {errorId && <FieldError id={errorId}>{errors?.[0]}</FieldError>}
    </fieldset>
  );
}

/** Puce d'information bleu clair (critères, spécialités). */
export function Tag({
  children,
  tone = "primary",
  className = "",
}: {
  children: ReactNode;
  tone?: "primary" | "neutral";
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-chip px-2.5 py-1 text-xs font-medium ${
        tone === "primary"
          ? "bg-primary-soft text-primary-strong"
          : "bg-background text-muted-foreground"
      } ${className}`}
    >
      {children}
    </span>
  );
}

/** Badge d'état : « Disponibilité immédiate », « Avis vérifié »… */
export function StatusBadge({
  children,
  tone = "success",
}: {
  children: ReactNode;
  tone?: "success" | "primary" | "neutral" | "danger" | "warning" | "example";
}) {
  const styles = {
    success: "bg-success-soft text-success",
    primary: "bg-primary-soft text-primary-strong",
    neutral: "bg-background text-muted-foreground",
    danger: "bg-danger-soft text-danger",
    warning: "bg-warning-soft text-warning",
    // Données d'exemple (ADR 0184).
    example: "bg-example-soft text-example-strong",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-chip px-2 py-1 text-xs font-medium ${styles}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

/** Badge « Assuré et vérifié » (ADR 0119) : fiche publique et cartes des résultats. */
export function VerifiedBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-chip bg-primary-soft px-2 py-1 text-xs font-medium text-primary-strong">
      <ShieldCheck aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={2.2} />
      {children}
    </span>
  );
}

/** Titre de section avec icône bleue (cartes des maquettes). */
export function CardTitle({
  icon,
  title,
  description,
  action,
  as: Heading = "h2",
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  as?: "h2" | "h3";
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <Heading className="flex items-center gap-2 text-[1.0625rem] font-medium text-foreground">
          {icon && <span className="text-primary [&>svg]:size-[1.125rem]">{icon}</span>}
          {title}
        </Heading>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
