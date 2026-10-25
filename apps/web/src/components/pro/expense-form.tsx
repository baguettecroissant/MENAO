"use client";

import {
  EXPENSE_CATEGORIES,
  EXPENSE_KINDS,
  EXPENSE_LIMITS,
  formatEurosInput,
  formatQuantity,
  parseEuros,
  type ExpenseLinePrefill,
  type ExpensePrefill,
  type ExpenseReadingWarning,
} from "@menao/core";
import { unit as unitLabel } from "@menao/documents";
import { Camera, FileUp, X } from "lucide-react";
import type { Route } from "next";
import { useActionState, useRef, useState } from "react";
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  CheckboxField,
  Field,
  SelectField,
  inputClasses,
} from "@/components/ui";
import { fr } from "@/i18n/fr";
import { readExpense, saveExpense } from "@/lib/artisan/expense-actions";
import { uploadExpenseDocument } from "@/lib/artisan/expense-upload";
import { initialFormState } from "@/lib/auth/form";
import { discardRaw } from "@/lib/upload/client";

const t = fr.pro.expenses;
const f = t.form;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

/** Valeurs du formulaire, en texte (montants « 435,00 »). */
export type ExpenseFormValues = {
  title: string;
  supplierName: string;
  reference: string;
  kind: string;
  category: string;
  issuedOn: string;
  dueOn: string;
  paidOn: string;
  paid: string;
  chantierId: string;
  totalHt: string;
  totalTva: string;
  notes: string;
};

type Reading =
  | { step: "idle" }
  | { step: "reading" }
  | { step: "done"; filled: boolean; warnings: ExpenseReadingWarning[] }
  | { step: "failed" };

/** Champs lus par read-expense → valeurs du formulaire (les champs non lus restent tels quels). */
function applyPrefill(values: ExpenseFormValues, fields: ExpensePrefill): ExpenseFormValues {
  return {
    ...values,
    ...(fields.title && { title: fields.title }),
    ...(fields.supplierName && { supplierName: fields.supplierName }),
    ...(fields.reference && { reference: fields.reference }),
    ...(fields.kind && { kind: fields.kind }),
    ...(fields.category && { category: fields.category }),
    ...(fields.issuedOn && { issuedOn: fields.issuedOn }),
    ...(fields.dueOn && { dueOn: fields.dueOn }),
    ...(fields.totalHtCents !== undefined && { totalHt: formatEurosInput(fields.totalHtCents) }),
    ...(fields.totalTvaCents !== undefined && { totalTva: formatEurosInput(fields.totalTvaCents) }),
  };
}

/**
 * Formulaire d'une dépense (F-62) : la pièce d'abord (photo ou fichier), lue par l'IA pour
 * pré-remplir les champs, que l'artisan vérifie ; puis le chantier et le paiement. La pièce est
 * déposée dès qu'elle est choisie et rangée à l'enregistrement.
 */
export function ExpenseForm({
  expenseId,
  initial,
  initialLines,
  hasDocument,
  chantiers,
}: {
  expenseId: string | null;
  initial: ExpenseFormValues;
  initialLines: ExpenseLinePrefill[];
  hasDocument: boolean;
  chantiers: { id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    saveExpense.bind(null, expenseId),
    initialFormState,
  );
  const [values, setValues] = useState<ExpenseFormValues>(initial);
  const [lines, setLines] = useState<ExpenseLinePrefill[]>(initialLines);
  const [document, setDocument] = useState<{ path: string; name: string } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [reading, setReading] = useState<Reading>({ step: "idle" });
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const errors = state.fieldErrors ?? {};

  const set = (name: keyof ExpenseFormValues) => (value: string) =>
    setValues((current) => ({ ...current, [name]: value }));

  async function choose(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    if (document) void discardRaw(document.path);
    setDocument(null);
    setReading({ step: "reading" });
    const uploaded = await uploadExpenseDocument(file);
    if ("error" in uploaded) {
      setReading({ step: "idle" });
      setUploadError(
        uploaded.error === "too_large" ? f.document.tooLarge : f.document.uploadFailed,
      );
      return;
    }
    setDocument({ path: uploaded.path, name: file.name });
    const result = await readExpense(uploaded.path);
    if (result.status !== "ok") {
      setReading({ step: "failed" });
      return;
    }
    const filled = Object.keys(result.fields).length > 1 || result.lines.length > 0;
    setValues((current) => applyPrefill(current, result.fields));
    if (filled) setLines(result.lines);
    setReading({ step: "done", filled, warnings: result.warnings });
  }

  function removeDocument() {
    if (document) void discardRaw(document.path);
    setDocument(null);
    setReading({ step: "idle" });
  }

  const ht = parseEuros(values.totalHt);
  const tva = parseEuros(values.totalTva);
  const ttc = ht !== null && tva !== null ? ht + tva : null;

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="documentPath" value={document?.path ?? ""} />
      <input
        type="hidden"
        name="lines"
        value={JSON.stringify(lines.slice(0, EXPENSE_LIMITS.maxLines))}
      />

      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-medium">{f.document.title}</h2>
          <p className="text-sm text-muted-foreground">{f.document.lead}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => cameraInput.current?.click()}
            disabled={reading.step === "reading"}
          >
            <Camera aria-hidden="true" className="size-4" />
            {f.document.camera}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInput.current?.click()}
            disabled={reading.step === "reading"}
          >
            <FileUp aria-hidden="true" className="size-4" />
            {f.document.file}
          </Button>
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => void choose(event.target.files?.[0])}
          />
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => void choose(event.target.files?.[0])}
          />
        </div>
        <p className="text-xs text-muted-foreground">{f.document.hint}</p>
        {document ? (
          <div className="flex items-center justify-between gap-3 rounded-input bg-background px-4 py-3 text-sm">
            <span className="min-w-0 truncate">{f.document.chosen(document.name)}</span>
            <button
              type="button"
              onClick={removeDocument}
              aria-label={f.document.remove}
              className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-surface hover:text-foreground"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        ) : (
          hasDocument && <p className="text-sm text-muted-foreground">{f.document.current}</p>
        )}
        {uploadError && <Alert tone="error">{uploadError}</Alert>}
        {reading.step === "reading" && <Alert tone="info">{f.reading.progress}</Alert>}
        {reading.step === "failed" && <Alert tone="info">{f.reading.failed}</Alert>}
        {reading.step === "done" && (
          <div className="flex flex-col gap-2">
            {reading.filled && <Alert tone="success">{f.reading.done}</Alert>}
            {reading.warnings.map((warning) => (
              <Alert key={warning} tone="info">
                {f.reading.warnings[warning]}
              </Alert>
            ))}
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <Field
          label={f.fields.title}
          name="title"
          value={values.title}
          onChange={(event) => set("title")(event.target.value)}
          maxLength={EXPENSE_LIMITS.titleMaxLength}
          hint={f.fields.titleHint}
          errors={errors.title}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={f.fields.supplier}
            name="supplierName"
            value={values.supplierName}
            onChange={(event) => set("supplierName")(event.target.value)}
            maxLength={EXPENSE_LIMITS.supplierMaxLength}
            errors={errors.supplierName}
          />
          <Field
            label={f.fields.reference}
            name="reference"
            value={values.reference}
            onChange={(event) => set("reference")(event.target.value)}
            maxLength={EXPENSE_LIMITS.referenceMaxLength}
            errors={errors.reference}
          />
          <SelectField
            label={f.fields.kind}
            name="kind"
            value={values.kind}
            onChange={(event) => set("kind")(event.target.value)}
            errors={errors.kind}
          >
            {EXPENSE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {t.kinds[kind]}
              </option>
            ))}
          </SelectField>
          <SelectField
            label={f.fields.category}
            name="category"
            value={values.category}
            onChange={(event) => set("category")(event.target.value)}
            errors={errors.category}
          >
            <option value="">{f.fields.categoryNone}</option>
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {t.categories[category]}
              </option>
            ))}
          </SelectField>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={f.fields.totalHt}
            name="totalHt"
            inputMode="decimal"
            value={values.totalHt}
            onChange={(event) => set("totalHt")(event.target.value)}
            errors={errors.totalHt}
            required
          />
          <Field
            label={f.fields.totalTva}
            name="totalTva"
            inputMode="decimal"
            value={values.totalTva}
            onChange={(event) => set("totalTva")(event.target.value)}
            errors={errors.totalTva}
            required
          />
        </div>
        <p className="flex items-baseline justify-between gap-3 rounded-input bg-background px-4 py-3">
          <span className="text-sm text-muted-foreground">{f.fields.totalTtc}</span>
          <span className="font-medium">{ttc === null ? "—" : euros.format(ttc / 100)}</span>
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={f.fields.issuedOn}
            name="issuedOn"
            type="date"
            value={values.issuedOn}
            onChange={(event) => set("issuedOn")(event.target.value)}
            errors={errors.issuedOn}
            required
          />
          <Field
            label={f.fields.dueOn}
            name="dueOn"
            type="date"
            value={values.dueOn}
            onChange={(event) => set("dueOn")(event.target.value)}
            hint={f.fields.dueOnHint}
            errors={errors.dueOn}
          />
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <SelectField
          label={f.fields.chantier}
          name="chantierId"
          value={values.chantierId}
          onChange={(event) => set("chantierId")(event.target.value)}
          errors={errors.chantierId}
        >
          <option value="">{f.fields.chantierNone}</option>
          {chantiers.map((chantier) => (
            <option key={chantier.id} value={chantier.id}>
              {chantier.label}
            </option>
          ))}
        </SelectField>
        <CheckboxField
          name="paid"
          checked={values.paid === "on"}
          onChange={(event) => set("paid")(event.target.checked ? "on" : "")}
        >
          {f.fields.paid}
        </CheckboxField>
        {values.paid === "on" && (
          <Field
            label={f.fields.paidOn}
            name="paidOn"
            type="date"
            value={values.paidOn}
            onChange={(event) => set("paidOn")(event.target.value)}
            errors={errors.paidOn}
          />
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="notes" className="text-sm font-medium text-foreground">
            {f.fields.notes}
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            value={values.notes}
            onChange={(event) => set("notes")(event.target.value)}
            maxLength={EXPENSE_LIMITS.notesMaxLength}
            className={`${inputClasses} py-3`}
          />
          <p className="text-xs text-muted-foreground">{f.fields.notesHint}</p>
        </div>
      </Card>

      {lines.length > 0 && (
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">{f.lines.title}</h2>
          <ul className="flex flex-col divide-y divide-border">
            {lines.map((line, index) => (
              <li
                key={`${index}-${line.designation}`}
                className="flex items-start justify-between gap-3 py-2"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm">{line.designation}</span>
                  <span className="text-xs text-muted-foreground">
                    {[
                      line.quantityMilli !== null &&
                        t.detail.lineQuantity(
                          formatQuantity(line.quantityMilli),
                          line.unit ? unitLabel(line.unit) : null,
                        ),
                      line.unitPriceHtCents !== null && euros.format(line.unitPriceHtCents / 100),
                      line.reference,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {line.totalHtCents !== null && (
                    <span className="text-sm">{euros.format(line.totalHtCents / 100)}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                    aria-label={f.lines.remove(line.designation)}
                    className="rounded-full p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <Button type="submit" disabled={pending || reading.step === "reading"} block={false}>
          {pending ? f.saving : f.save}
        </Button>
        <ButtonLink
          href={(expenseId ? `/pro/depenses/${expenseId}` : "/pro/depenses") as Route}
          variant="ghost"
        >
          {f.cancel}
        </ButtonLink>
      </div>
    </form>
  );
}
