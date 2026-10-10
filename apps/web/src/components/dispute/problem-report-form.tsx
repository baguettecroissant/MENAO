"use client";

import { DISPUTE_CATEGORIES, DISPUTE_DESCRIPTION_LIMITS } from "@menao/core";
import { useActionState } from "react";
import { Alert, Button, FieldError, Hint, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { reportProblem } from "@/lib/disputes/actions";
import { useFieldErrors } from "@/lib/use-field-errors";

const t = fr.dispute;

/** « Signaler un problème lié au chantier » (F-42) : nature du problème et description. */
export function ProblemReportForm({ chantierId }: { chantierId: string }) {
  const [state, formAction, pending] = useActionState(
    reportProblem.bind(null, chantierId),
    initialFormState,
  );
  // Erreur effacée dès que le champ est corrigé.
  const { errorOf, markEdited } = useFieldErrors(state);
  const categoryError = errorOf("category");
  const descriptionError = errorOf("description");
  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={categoryError ? "category-error" : undefined}
      >
        <legend className="pb-2 text-sm font-medium">{t.categoryLegend}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {DISPUTE_CATEGORIES.map((category) => (
            <label key={category} className="relative">
              <input
                type="radio"
                name="category"
                value={category}
                defaultChecked={state.values?.category === category}
                onChange={() => markEdited("category")}
                className="peer sr-only"
              />
              <span className="flex min-h-12 cursor-pointer items-center justify-center rounded-input border border-border bg-surface px-3 text-center text-sm transition-colors peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:text-primary-strong peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20 hover:bg-background">
                {t.categories[category]}
              </span>
            </label>
          ))}
        </div>
        {categoryError && <FieldError id="category-error">{categoryError}</FieldError>}
      </fieldset>
      <div className="flex flex-col gap-2">
        <label htmlFor="problem-description" className="text-sm font-medium">
          {t.descriptionLabel}
        </label>
        <textarea
          id="problem-description"
          name="description"
          rows={6}
          maxLength={DISPUTE_DESCRIPTION_LIMITS.max}
          defaultValue={state.values?.description}
          onChange={() => markEdited("description")}
          aria-invalid={descriptionError ? true : undefined}
          aria-describedby={`problem-hint${descriptionError ? " problem-error" : ""}`}
          className={`${inputClasses} min-h-36 py-3`}
        />
        <Hint id="problem-hint">{t.descriptionHint}</Hint>
        {descriptionError && <FieldError id="problem-error">{descriptionError}</FieldError>}
      </div>
      <Button type="submit" size="lg" variant="danger" disabled={pending}>
        {t.submit}
      </Button>
    </form>
  );
}
