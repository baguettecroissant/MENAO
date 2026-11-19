import { Check } from "lucide-react";
import { FieldError, focusRing } from "@/components/ui";

/** Choix unique en pastilles (boutons radio), comme dans la maquette du lot 77. */
export function ChoicePills({
  legend,
  name,
  options,
  defaultValue,
  errors,
  hint,
}: {
  legend: string;
  name: string;
  options: Record<string, string>;
  defaultValue?: string;
  errors?: string[];
  hint?: string;
}) {
  const errorId = errors?.length ? `${name}-erreur` : undefined;
  const hintId = hint ? `${name}-aide` : undefined;
  return (
    <fieldset
      className="flex flex-col gap-2"
      aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
    >
      <legend className="mb-2 text-sm font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {Object.entries(options).map(([value, label]) => (
          <label key={value} className="group relative">
            <input
              type="radio"
              name={name}
              value={value}
              defaultChecked={defaultValue === value}
              className="peer sr-only"
            />
            <span
              className={`inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-border-strong bg-surface px-3.5 text-sm font-semibold transition-colors peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary ${focusRing}`}
            >
              <Check
                aria-hidden="true"
                className="hidden size-3.5 stroke-[2.6] group-has-[:checked]:block"
              />
              {label}
            </span>
          </label>
        ))}
      </div>
      {hint && (
        <p id={hintId} className="text-[0.8125rem] text-muted-foreground">
          {hint}
        </p>
      )}
      {errors?.[0] && <FieldError id={errorId}>{errors[0]}</FieldError>}
    </fieldset>
  );
}
