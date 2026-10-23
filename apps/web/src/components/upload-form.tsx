"use client";

import { MAX_UPLOAD_BYTES } from "@menao/core";
import type { UploadPurpose } from "@menao/validation";
import { Camera, FileUp } from "lucide-react";
import { useActionState, useRef, useState, type ReactNode, type RefObject } from "react";
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
  /** Logos : réencodés en PNG pour garder la transparence (un JPEG reste un JPEG). */
  keepTransparency?: boolean;
  /** Photo de profil : mise au carré, sans jamais couper un logo (resizeImage). */
  square?: boolean;
  /** Champs complémentaires (métadonnées d'un document). */
  children?: ReactNode | ((errors: Record<string, string[] | undefined>) => ReactNode);
  fileLabel?: string;
  /** Préfixe des identifiants (plusieurs formulaires sur une même page). */
  formId?: string;
  /**
   * Documents (ADR 0111) : « Prendre en photo » (appareil photo du téléphone) et « Choisir un
   * fichier », en gros boutons, au lieu du champ fichier.
   */
  camera?: boolean;
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
  keepTransparency = false,
  square = false,
  children,
  fileLabel = t.file,
  formId = purpose,
  camera = false,
}: UploadFormProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [state, action, pending] = useActionState(async (prev: FormState, formData: FormData) => {
    // Photo prise ou fichier choisi : le champ rempli, s'il y en a un.
    const file = formData
      .getAll("file")
      .find((value): value is File => value instanceof File && value.size > 0);
    if (!file) return { fieldErrors: { file: [t.fileRequired] } };
    if (file.size > MAX_UPLOAD_BYTES) return { fieldErrors: { file: [t.fileTooLarge] } };

    let blob: Blob = file;
    if (resizeTo) {
      try {
        blob = await resizeImage(file, resizeTo, {
          type: keepTransparency && file.type !== "image/jpeg" ? "image/png" : "image/jpeg",
          square,
        });
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
      {camera ? (
        <div className="flex flex-col gap-2">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <CameraButton
              id={`${formId}-camera`}
              inputRef={cameraInput}
              label={fr.pro.onboarding.documents.photo}
              icon={<Camera aria-hidden="true" className="size-5" />}
              accept="image/*"
              capture
              primary
              describedBy={`${formId}-file-hint`}
              onPick={(name) => {
                if (fileInput.current) fileInput.current.value = "";
                setChosen(name);
              }}
            />
            <CameraButton
              id={`${formId}-file`}
              inputRef={fileInput}
              label={fr.pro.onboarding.documents.chooseFile}
              icon={<FileUp aria-hidden="true" className="size-5" />}
              accept={accept}
              describedBy={[`${formId}-file-hint`, fileErrorId].filter(Boolean).join(" ")}
              invalid={Boolean(errors.file)}
              onPick={(name) => {
                if (cameraInput.current) cameraInput.current.value = "";
                setChosen(name);
              }}
            />
          </div>
          {chosen && (
            <p className="text-sm font-medium text-success" aria-live="polite">
              {fr.pro.onboarding.documents.chosen(chosen)}
            </p>
          )}
        </div>
      ) : (
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
        </div>
      )}
      <div className="flex flex-col gap-1">
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

/**
 * Gros bouton d'envoi de fichier : le vrai champ, invisible, couvre tout le bouton (un toucher
 * l'ouvre directement). `capture` ouvre l'appareil photo sur téléphone.
 */
function CameraButton({
  id,
  inputRef,
  label,
  icon,
  accept,
  capture = false,
  primary = false,
  invalid = false,
  describedBy,
  onPick,
}: {
  id: string;
  inputRef: RefObject<HTMLInputElement | null>;
  label: string;
  icon: ReactNode;
  accept: string;
  capture?: boolean;
  primary?: boolean;
  invalid?: boolean;
  describedBy?: string;
  onPick: (name: string) => void;
}) {
  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        name="file"
        type="file"
        accept={accept}
        capture={capture ? "environment" : undefined}
        aria-label={label}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        onChange={(e) => {
          const name = e.target.files?.[0]?.name;
          if (name) onPick(name);
        }}
        className="peer absolute inset-0 z-10 size-full cursor-pointer opacity-0"
      />
      <span
        className={`flex min-h-[3.25rem] items-center justify-center gap-2 rounded-button px-5 font-semibold transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20 ${
          primary
            ? "bg-primary text-primary-foreground peer-hover:bg-primary-hover"
            : "border-[1.5px] border-border-strong bg-surface text-foreground peer-hover:border-primary"
        }`}
      >
        {icon}
        {label}
      </span>
    </div>
  );
}
