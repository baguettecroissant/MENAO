"use client";

import { useActionState } from "react";
import { Alert, Button, FieldError, Select, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { addReference, renameReference } from "@/lib/admin/reference-actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.admin.references;

/** Ajout d'une entrée en fin de liste (F-57, ADR 0052) ; un travail se rattache à un métier. */
export function AddReferenceForm({
  kind,
  trades,
}: {
  kind: "metier" | "travail" | "piece";
  trades?: { code: string; label: string }[];
}) {
  const [state, action, pending] = useActionState(addReference, initialFormState);
  const labelError = state.fieldErrors?.label?.[0];
  const tradeError = state.fieldErrors?.trade?.[0];
  const id = `nouveau-${kind}`;
  return (
    <form action={action} noValidate className="flex flex-col gap-2 border-t border-border pt-4">
      <input type="hidden" name="kind" value={kind} />
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        {trades && (
          <div className="flex flex-col gap-1 sm:w-56">
            <label htmlFor={`${id}-metier`} className="text-sm font-medium">
              {t.tradeLabel}
            </label>
            <Select
              id={`${id}-metier`}
              name="trade"
              defaultValue={state.values?.trade ?? ""}
              aria-invalid={tradeError ? true : undefined}
              aria-describedby={tradeError ? `${id}-metier-erreur` : undefined}
            >
              <option value="">—</option>
              {trades.map((trade) => (
                <option key={trade.code} value={trade.code}>
                  {trade.label}
                </option>
              ))}
            </Select>
            {tradeError && <FieldError id={`${id}-metier-erreur`}>{tradeError}</FieldError>}
          </div>
        )}
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor={id} className="text-sm font-medium">
            {t.newLabel[kind]}
          </label>
          <input
            id={id}
            name="label"
            maxLength={100}
            defaultValue={state.values?.label}
            aria-invalid={labelError ? true : undefined}
            aria-describedby={`${id}-aide${labelError ? ` ${id}-erreur` : ""}`}
            className={inputClasses}
          />
          {labelError && <FieldError id={`${id}-erreur`}>{labelError}</FieldError>}
        </div>
        <Button
          type="submit"
          variant="secondary"
          block={false}
          disabled={pending}
          className="sm:mt-6"
        >
          {t.add}
        </Button>
      </div>
      <p id={`${id}-aide`} className="text-xs text-muted-foreground">
        {t.codeHint}
      </p>
    </form>
  );
}

/** Nouveau libellé d'une entrée (le code ne change pas). */
export function RenameReferenceForm({
  kind,
  code,
  label,
}: {
  kind: "metier" | "travail" | "piece";
  code: string;
  label: string;
}) {
  const [state, action, pending] = useActionState(renameReference, initialFormState);
  const error = state.fieldErrors?.label?.[0] ?? state.error;
  const id = `libelle-${kind}-${code}`;
  return (
    <form action={action} noValidate className="flex flex-col gap-2 pt-2">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="code" value={code} />
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <label htmlFor={id} className="sr-only">
          {t.renameLabel}
        </label>
        <input
          id={id}
          name="label"
          maxLength={100}
          defaultValue={state.values?.label ?? label}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-erreur` : undefined}
          className={`${inputClasses} min-h-10 sm:max-w-sm`}
        />
        <Button type="submit" variant="secondary" size="sm" block={false} disabled={pending}>
          {t.save}
        </Button>
      </div>
      {error && <FieldError id={`${id}-erreur`}>{error}</FieldError>}
    </form>
  );
}
