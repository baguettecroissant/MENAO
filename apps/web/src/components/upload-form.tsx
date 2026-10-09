"use client";

import { MAX_UPLOAD_BYTES } from "@menao/core";
import type { UploadPurpose } from "@menao/validation";
import { useActionState, type ReactNode } from "react";
import { Alert, Button } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { processUpload } from "@/lib/artisan/actions";
import type { FormState } from "@/lib/auth/form";
import { resizeImage, uploadRaw } from "@/lib/upload/client";

const t = fr.pro.onboarding.upload;

type UploadFormProps = {
  purpose: UploadPurpose;
  userId: string;
  submitLabel: string;
  accept: string;
  hint: string;
  /** Photos : redimensionnées dans le navigateur avant l'envoi. */
  resizeTo?: number;
  /** Champs complémentaires (métadonnées d'un document). */
  children?: ReactNode | ((errors: Record<string, string[] | undefined>) => ReactNode);
  fileLabel?: string;
  /** Préfixe des identifiants (plusieurs formulaires sur une même page). */
  formId?: string;
};

/**
 * Formulaire de dépôt : le fichier part directement du navigateur vers Supabase Storage
 * (pas de transit par Vercel : limite de 4,5 Mo), puis la Server Action fait vérifier et
 * enregistrer le fichier par l'Edge Function process-upload.
 */
export function UploadForm({
  purpose,
  userId,
  submitLabel,
  accept,
  hint,
  resizeTo,
  children,
  fileLabel = t.file,
  formId = purpose,
}: UploadFormProps) {
  const [state, action, pending] = useActionState(async (prev: FormState, formData: FormData) => {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0)
      return { fieldErrors: { file: [t.fileRequired] } };
    if (file.size > MAX_UPLOAD_BYTES) return { fieldErrors: { file: [t.fileTooLarge] } };

    let blob: Blob = file;
    if (resizeTo) {
      try {
        blob = await resizeImage(file, resizeTo);
      } catch {
        return { error: t.status.invalid_type };
      }
    }
    const path = await uploadRaw(userId, blob);
    if (!path) return { error: t.uploadFailed };

    formData.delete("file");
    formData.set("path", path);
    formData.set("purpose", purpose);
    return processUpload(prev, formData);
  }, {});

  const errors = state.fieldErrors ?? {};
  const fileErrorId = errors.file ? `${formId}-file-error` : undefined;

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {typeof children === "function" ? children(errors) : children}
      <div className="flex flex-col gap-1">
        <label htmlFor={`${formId}-file`} className="font-medium">
          {fileLabel}
        </label>
        <input
          id={`${formId}-file`}
          name="file"
          type="file"
          accept={accept}
          aria-invalid={errors.file ? true : undefined}
          aria-describedby={[`${formId}-file-hint`, fileErrorId].filter(Boolean).join(" ")}
          className="rounded-button border border-border bg-surface p-2 file:mr-3 file:rounded-button file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:font-medium file:text-primary"
        />
        <p id={`${formId}-file-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
        {fileErrorId && (
          <p id={fileErrorId} className="text-sm text-danger">
            {errors.file?.[0]}
          </p>
        )}
      </div>
      <Button type="submit" disabled={pending} className="sm:w-auto sm:self-start sm:px-6">
        {pending ? t.sending : submitLabel}
      </Button>
    </form>
  );
}
