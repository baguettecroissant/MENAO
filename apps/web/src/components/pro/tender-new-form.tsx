"use client";

import { FileSpreadsheet } from "lucide-react";
import { startTransition, useActionState, useState } from "react";
import { Alert, Button, Field, FieldError } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { createTender } from "@/lib/artisan/tender-actions";
import { initialFormState } from "@/lib/auth/form";
import { createClient } from "@/lib/supabase/client";

const t = fr.pro.tenders;
const TYPES = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
} as const;
const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Nouvel appel d'offres (ADR 0287, 0288) : le fichier (Excel ou PDF) part directement du navigateur dans le
 * dossier privé de l'entreprise (tender-files), puis la Server Action crée l'appel d'offres et
 * fait lire le DPGF.
 */
export function TenderNewForm({ artisanId }: { artisanId: string }) {
  const [state, formAction, pending] = useActionState(createTender, initialFormState);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const busy = pending || uploading;
  const v = state.values;

  async function submit(formData: FormData) {
    setFileError(null);
    const file = formData.get("file");
    const extension = file instanceof File ? file.name.toLowerCase().split(".").pop() : null;
    // Excel, ou PDF lu par l'IA (ADR 0288).
    const kind = extension === "xlsx" || extension === "pdf" ? extension : null;
    if (!(file instanceof File) || file.size === 0 || !kind) {
      setFileError(t.errors.file ?? null);
      return;
    }
    if (file.size > MAX_BYTES) {
      setFileError(t.errors.tooLarge ?? null);
      return;
    }
    setUploading(true);
    const path = `${artisanId}/${crypto.randomUUID()}.${kind}`;
    const { error } = await createClient()
      .storage.from("tender-files")
      .upload(path, file, { contentType: TYPES[kind], upsert: false });
    setUploading(false);
    if (error) {
      setFileError(t.errors.upload ?? null);
      return;
    }
    formData.delete("file");
    formData.set("path", path);
    formData.set("fileName", file.name.slice(0, 200));
    // Après l'envoi du fichier (await) : on repasse dans une transition pour l'action.
    startTransition(() => formAction(formData));
  }

  return (
    <form action={submit} className="flex flex-col gap-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field
        label={t.fields.name}
        name="name"
        required
        maxLength={160}
        placeholder={t.fields.namePlaceholder}
        defaultValue={v?.name}
        errors={state.fieldErrors?.name}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t.fields.client}
          labelNote={t.fields.clientNote}
          name="client"
          maxLength={160}
          defaultValue={v?.client}
        />
        <Field
          label={t.fields.due}
          labelNote={t.fields.dueNote}
          name="due"
          type="date"
          defaultValue={v?.due}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tender-file" className="text-sm font-semibold">
          {t.fields.file}
        </label>
        <label
          htmlFor="tender-file"
          className="flex cursor-pointer items-center gap-3 rounded-input border border-dashed border-border-strong bg-background px-4 py-4 text-sm text-label hover:border-primary/50"
        >
          <FileSpreadsheet aria-hidden="true" className="size-5 shrink-0 text-primary-strong" />
          <input
            id="tender-file"
            name="file"
            type="file"
            required
            accept=".xlsx,.pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf"
            aria-describedby="tender-file-hint"
            className="min-w-0 flex-1 text-sm file:mr-3 file:rounded-button file:border-0 file:bg-primary-soft file:px-3 file:py-1.5 file:font-semibold file:text-primary-strong"
          />
        </label>
        {(fileError ?? state.fieldErrors?.file?.[0]) && (
          <FieldError>{fileError ?? state.fieldErrors?.file?.[0]}</FieldError>
        )}
        <p id="tender-file-hint" className="text-sm text-muted-foreground">
          {t.fields.fileHint}
        </p>
      </div>
      <Button type="submit" disabled={busy} block={false} className="self-end">
        {busy ? t.reading : t.submit}
      </Button>
    </form>
  );
}
