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
import { Camera, CircleCheck, FileText, Plus, ReceiptText, Upload, X } from "lucide-react";
import type { Route } from "next";
import { useActionState, useEffect, useRef, useState, type ComponentProps } from "react";
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  Field,
  FieldError,
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
 * déposée dès qu'elle est choisie et rangée à l'enregistrement. Refonte « Nette » (lot 45,
 * ADR 0314) : la pièce et les lignes lues à gauche, la dépense en cartes à droite.
 */
export function ExpenseForm({
  expenseId,
  initial,
  initialLines,
  hasDocument,
  documentUrl = null,
  documentMime = null,
  chantiers,
}: {
  expenseId: string | null;
  initial: ExpenseFormValues;
  initialLines: ExpenseLinePrefill[];
  hasDocument: boolean;
  /** Pièce déjà enregistrée (modification) : URL signée et type, pour l'aperçu. */
  documentUrl?: string | null;
  documentMime?: string | null;
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
  // Aperçu de la pièce choisie (image : adresse locale du navigateur ; PDF : nom du fichier).
  const [preview, setPreview] = useState<{ url: string | null; name: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [notesOpen, setNotesOpen] = useState(initial.notes.trim() !== "");
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
    setPreview({
      url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      name: file.name,
    });
    setReading({ step: "reading" });
    const uploaded = await uploadExpenseDocument(file);
    if ("error" in uploaded) {
      setReading({ step: "idle" });
      setPreview(null);
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
    setPreview(null);
    setReading({ step: "idle" });
  }

  // Adresse locale de l'aperçu libérée quand elle change ou à la sortie de la page.
  useEffect(() => {
    const url = preview?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [preview?.url]);

  const ht = parseEuros(values.totalHt);
  const tva = parseEuros(values.totalTva);
  const ttc = ht !== null && tva !== null ? ht + tva : null;

  const busy = reading.step === "reading";
  const pickFile = () => fileInput.current?.click();
  // Pièce affichée : celle qui vient d'être choisie, sinon celle déjà enregistrée.
  const shown = preview
    ? { url: preview.url, name: preview.name, image: preview.url !== null }
    : hasDocument && documentUrl
      ? { url: documentUrl, name: null, image: documentMime?.startsWith("image/") ?? false }
      : null;

  return (
    <form
      action={formAction}
      noValidate
      className="grid items-start gap-6 pb-10 lg:grid-cols-[minmax(0,1fr)_27.5rem]"
    >
      <input type="hidden" name="documentPath" value={document?.path ?? ""} />
      <input
        type="hidden"
        name="lines"
        value={JSON.stringify(lines.slice(0, EXPENSE_LIMITS.maxLines))}
      />
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

      <div className="flex min-w-0 flex-col gap-4">
        <Card className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[1.0625rem] font-bold tracking-tight">{f.document.title}</h2>
            {shown && (
              <span className="flex items-center gap-3">
                {document && (
                  <button
                    type="button"
                    onClick={removeDocument}
                    aria-label={f.document.remove}
                    className="rounded-full p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={pickFile}
                  disabled={busy}
                  className="text-sm font-semibold text-primary-strong hover:underline disabled:opacity-60"
                >
                  {f.document.change}
                </button>
              </span>
            )}
          </div>
          {uploadError && <Alert tone="error">{uploadError}</Alert>}
          {busy && <Alert tone="info">{f.reading.progress}</Alert>}
          {reading.step === "failed" && <Alert tone="info">{f.reading.failed}</Alert>}
          {reading.step === "done" && reading.filled && (
            <p
              role="status"
              className="flex items-center gap-3 rounded-input bg-success-soft px-3.5 py-3 text-sm text-foreground"
            >
              <CircleCheck aria-hidden="true" className="size-[1.125rem] shrink-0 text-success" />
              <span>
                <b>{f.reading.doneTitle}</b> {f.reading.doneText}
              </span>
            </p>
          )}
          {reading.step === "done" &&
            reading.warnings.map((warning) => (
              <Alert key={warning} tone="info">
                {f.reading.warnings[warning]}
              </Alert>
            ))}
          {shown ? (
            <div className="relative flex h-[23.75rem] items-center justify-center overflow-hidden rounded-[0.875rem] bg-[linear-gradient(160deg,#f4f1ea,#e6e1d4)]">
              {shown.image && shown.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- adresse locale ou URL signée temporaire, sans optimisation Vercel (spec §4.4)
                <img
                  src={shown.url}
                  alt={f.document.previewAlt}
                  className="max-h-full max-w-full object-contain p-4"
                />
              ) : (
                <span className="flex h-[19.375rem] w-[13.125rem] flex-col gap-2 rounded-md bg-white p-[1.125rem] shadow-[0_6px_20px_rgb(0_0_0/0.08)]">
                  {[70, 45, 90, 80, 60, 85, 40, 75, 55].map((w, i) => (
                    <span
                      key={i}
                      aria-hidden="true"
                      className="h-2 rounded bg-border"
                      style={{ width: `${w}%` }}
                    />
                  ))}
                </span>
              )}
              <span className="absolute bottom-3.5 left-3.5 inline-flex max-w-[calc(100%-1.75rem)] items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[0.8125rem] font-semibold">
                <FileText aria-hidden="true" className="size-3.5 shrink-0" />
                {shown.name ? (
                  <span className="truncate">{shown.name}</span>
                ) : (
                  <a
                    href={shown.url ?? "#"}
                    target="_blank"
                    rel="noopener"
                    className="hover:underline"
                  >
                    {f.document.open}
                  </a>
                )}
              </span>
            </div>
          ) : (
            <>
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  void choose(event.dataTransfer.files?.[0]);
                }}
                className={`flex min-h-72 flex-col lg:min-h-[27.5rem] items-center justify-center gap-3.5 rounded-card border-2 border-dashed p-6 text-center transition-colors ${
                  dragging
                    ? "border-primary bg-primary-softer"
                    : "border-border-strong bg-background"
                }`}
              >
                <span className="flex size-16 items-center justify-center rounded-[1.125rem] bg-primary-soft text-primary-strong">
                  <ReceiptText aria-hidden="true" className="size-[1.875rem]" />
                </span>
                <p className="font-display text-xl font-bold tracking-tight">
                  {f.document.dropTitle}
                </p>
                <p className="max-w-[23.75rem] text-[0.90625rem] leading-[1.45] text-label">
                  {f.document.dropText}
                </p>
                <div className="flex flex-wrap justify-center gap-2.5">
                  <Button
                    type="button"
                    variant="secondary"
                    block={false}
                    onClick={() => cameraInput.current?.click()}
                    disabled={busy}
                  >
                    <Camera aria-hidden="true" className="size-4" />
                    {f.document.camera}
                  </Button>
                  <Button type="button" block={false} onClick={pickFile} disabled={busy}>
                    <Upload aria-hidden="true" className="size-4" />
                    {f.document.file}
                  </Button>
                </div>
                <p className="text-[0.8125rem] text-muted-foreground">{f.document.dropHint}</p>
              </div>
              <p className="self-center text-[0.8125rem] text-muted-foreground">
                <span className="lg:hidden">{f.document.noDocumentBelow}</span>
                <span className="hidden lg:inline">{f.document.noDocument}</span>
              </p>
            </>
          )}
        </Card>

        {lines.length > 0 && (
          <Card className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[1.0625rem] font-bold tracking-tight">{f.lines.title}</h2>
              <span className="text-[0.8125rem] text-muted-foreground">
                {f.lines.count(lines.length)}
              </span>
            </div>
            <ul className="flex flex-col">
              {lines.map((line, index) => (
                <li
                  key={`${index}-${line.designation}`}
                  className="flex items-center gap-3 border-t border-border py-3 text-sm"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <b className="font-semibold">{line.designation}</b>
                    <span className="text-[0.78125rem] text-muted-foreground">
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
                  {line.totalHtCents !== null && (
                    <b className="font-semibold whitespace-nowrap tabular-nums">
                      {euros.format(line.totalHtCents / 100)}
                    </b>
                  )}
                  <button
                    type="button"
                    onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                    aria-label={f.lines.remove(line.designation)}
                    className="rounded-full p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-[0.8125rem] text-muted-foreground">{f.lines.note}</p>
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3">
          <h2 className="text-[1.0625rem] font-bold tracking-tight">{f.cards.expense}</h2>
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
          <div className="grid gap-3 sm:grid-cols-2">
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
          <SelectField
            label={f.fields.chantier}
            name="chantierId"
            value={values.chantierId}
            onChange={(event) => set("chantierId")(event.target.value)}
            hint={f.fields.chantierHint}
            errors={errors.chantierId}
          >
            <option value="">{f.fields.chantierNone}</option>
            {chantiers.map((chantier) => (
              <option key={chantier.id} value={chantier.id}>
                {chantier.label}
              </option>
            ))}
          </SelectField>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-[1.0625rem] font-bold tracking-tight">{f.cards.amounts}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <MoneyField
              label={f.fields.totalHt}
              name="totalHt"
              value={values.totalHt}
              onChange={(event) => set("totalHt")(event.target.value)}
              errors={errors.totalHt}
            />
            <MoneyField
              label={f.fields.totalTva}
              name="totalTva"
              value={values.totalTva}
              onChange={(event) => set("totalTva")(event.target.value)}
              errors={errors.totalTva}
            />
          </div>
          <p className="flex items-baseline justify-between gap-3 rounded-xl bg-background px-3.5 py-3">
            <span className="text-sm text-muted-foreground">{f.fields.totalTtcComputed}</span>
            <span className="font-display text-2xl font-bold tracking-tight tabular-nums">
              {ttc === null ? "—" : euros.format(ttc / 100)}
            </span>
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
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

        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="flex flex-col gap-0.5">
              <span className="text-[0.9375rem] font-semibold">{f.fields.paid}</span>
              <span className="text-[0.8125rem] text-muted-foreground">{f.fields.paidHint}</span>
            </span>
            <label className="relative inline-flex shrink-0 cursor-pointer items-center">
              <input
                type="checkbox"
                role="switch"
                name="paid"
                checked={values.paid === "on"}
                onChange={(event) => set("paid")(event.target.checked ? "on" : "")}
                aria-label={f.fields.paid}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className="h-[1.625rem] w-11 rounded-full bg-border-strong transition-colors peer-checked:bg-success peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20"
              />
              <span
                aria-hidden="true"
                className="absolute top-[3px] left-[3px] size-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-[18px] motion-reduce:transition-none"
              />
            </label>
          </div>
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
          <div className="border-t border-border pt-3">
            {notesOpen ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="notes" className="text-sm font-semibold text-foreground">
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
            ) : (
              <button
                type="button"
                onClick={() => setNotesOpen(true)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-strong hover:underline"
              >
                <Plus aria-hidden="true" className="size-3.5" />
                {f.fields.addNote}
              </button>
            )}
          </div>
        </Card>

        {state.error && <Alert tone="error">{state.error}</Alert>}
        <div className="flex flex-col gap-2.5">
          <Button
            type="submit"
            disabled={pending || busy}
            className="!min-h-[3.125rem] !rounded-pill"
          >
            {pending ? f.saving : expenseId ? f.saveEdit : f.save}
          </Button>
          <ButtonLink
            href={(expenseId ? `/pro/depenses/${expenseId}` : "/pro/depenses") as Route}
            variant="ghost"
          >
            {f.cancel}
          </ButtonLink>
        </div>
      </div>
    </form>
  );
}

/** Montant en euros, avec le symbole dans le champ (maquette lot 45). */
function MoneyField({
  label,
  name,
  errors,
  ...input
}: Omit<ComponentProps<"input">, "name"> & {
  label: string;
  name: string;
  errors?: readonly string[] | undefined;
}) {
  const errorId = errors?.length ? `${name}-error` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-semibold text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          inputMode="decimal"
          required
          aria-invalid={errors?.length ? true : undefined}
          aria-describedby={errorId}
          className={`${inputClasses} pr-9`}
          {...input}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground"
        >
          €
        </span>
      </div>
      {errors?.length ? <FieldError id={errorId}>{errors[0]}</FieldError> : null}
    </div>
  );
}
