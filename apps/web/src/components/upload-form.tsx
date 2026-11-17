"use client";

import {
  DOCUMENT_PREFILL_FIELDS,
  MAX_UPLOAD_BYTES,
  READABLE_IMAGE_MAX_BYTES,
  prefillUpdates,
  type DocumentPrefill,
  type DocumentReadingWarning,
  type ReadableDocumentType,
} from "@menao/core";
import { documentMetadataSchema, type UploadPurpose } from "@menao/validation";
import { Camera, FileCheck, FileUp, ImageUp } from "lucide-react";
import { useActionState, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { z } from "zod";
import { AvatarFramer } from "@/components/avatar-framer";
import { AiWorking } from "@/components/ai-working";
import { Alert, Button } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { processUpload, readDocument } from "@/lib/artisan/actions";
import type { FormState } from "@/lib/auth/form";
import { discardRaw, resizeImage, uploadRaw } from "@/lib/upload/client";

const t = fr.pro.onboarding.upload;
const r = fr.pro.onboarding.documents.reading;
/** Photo d'un document trop lourde pour être lue : réduite avant l'envoi (ADR 0176). */
const DOCUMENT_PHOTO_MAX_SIDE = 2400;

type Reading =
  | { step: "reading" }
  | { step: "done"; filled: boolean; warnings: DocumentReadingWarning[] }
  | { step: "failed" };

const fileKey = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;

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
  /**
   * Document du dossier (ADR 0176) : déposé dès qu'il est choisi, lu par l'IA, et ses champs
   * pré-remplis ; l'artisan les vérifie avant l'envoi.
   */
  readAs?: ReadableDocumentType;
  /**
   * Image (logo, photo) : zone où glisser le fichier, avec son aperçu, à la place du champ fichier.
   * Le texte de la zone, par exemple « Glissez votre logo ici ».
   */
  dropLabel?: string;
  /**
   * Action qui enregistre le fichier déposé ; par défaut celle du dossier de l'artisan. « Mon
   * compte » d'un particulier passe la sienne (ADR 0360).
   */
  process?: (prev: FormState, formData: FormData) => Promise<FormState>;
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
  readAs,
  dropLabel,
  process = processUpload,
}: UploadFormProps) {
  const form = useRef<HTMLFormElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  // Glisser-déposer (maquette du lot 61) : fichier survolant la zone, ou type refusé.
  const [dragging, setDragging] = useState(false);
  const [dropError, setDropError] = useState(false);
  // Aperçu local de l'image choisie (zone de dépôt d'une image).
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  /** Image choisie ou glissée : son aperçu, puis son cadrage s'il s'agit d'une photo de profil. */
  function pickImage(file: File) {
    setDropError(false);
    setChosen(file.name);
    setPreview(square ? null : URL.createObjectURL(file));
    if (square) setFraming(file);
  }

  /** Fichier glissé : posé dans le champ « Choisir un fichier », puis lu comme un fichier choisi. */
  function drop(files: FileList) {
    const file = files[0];
    setDragging(false);
    if (!file || !fileInput.current) return;
    const accepted = accept.split(",").map((type) => type.trim());
    if (!accepted.includes(file.type)) return setDropError(true);
    setDropError(false);
    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileInput.current.files = transfer.files;
    if (cameraInput.current) cameraInput.current.value = "";
    if (dropLabel) return pickImage(file);
    void read(file);
  }
  // Document déposé pour sa lecture, réutilisé à l'envoi s'il n'a pas été remplacé.
  const upload = useRef<{ key: string; path: Promise<string | null> } | null>(null);
  const lastRead = useRef<DocumentPrefill>({});
  const [reading, setReading] = useState<Reading | null>(null);
  const [readErrors, setReadErrors] = useState<Record<string, string[] | undefined>>({});
  // Ce que MENAO a lu dans le document, montré champ par champ (maquette du lot 61).
  const [readValues, setReadValues] = useState<DocumentPrefill>({});
  // Photo de profil (ADR 0202) : cadrée avant l'envoi ; l'image cadrée remplace le fichier choisi.
  const [framing, setFraming] = useState<File | null>(null);
  const framed = useRef<{ key: string; blob: Blob; url: string } | null>(null);
  const [framedUrl, setFramedUrl] = useState<string | null>(null);

  // Page quittée sans envoyer le document lu : son fichier brut est retiré.
  useEffect(
    () => () => {
      void upload.current?.path.then((path) => (path ? discardRaw(path) : undefined));
    },
    [],
  );

  async function prepare(file: File): Promise<string | null | "invalid_type"> {
    let blob: Blob = file;
    if (square && framed.current?.key === fileKey(file)) {
      blob = framed.current.blob;
    } else if (resizeTo) {
      try {
        blob = await resizeImage(file, resizeTo, {
          type: keepTransparency && file.type !== "image/jpeg" ? "image/png" : "image/jpeg",
          square,
        });
      } catch {
        return "invalid_type";
      }
    } else if (readAs && file.type !== "application/pdf" && file.size > READABLE_IMAGE_MAX_BYTES) {
      // Photo très lourde : réduite pour être lue (elle reste nette pour l'équipe MENAO).
      blob = await resizeImage(file, DOCUMENT_PHOTO_MAX_SIDE, { quality: 0.9 }).catch(() => file);
    }
    return uploadRaw(userId, blob);
  }

  /** Champs du document remplis avec ce qui a été lu, sans écraser la saisie de l'artisan. */
  function fill(type: ReadableDocumentType, fields: DocumentPrefill) {
    const input = (name: string) =>
      form.current?.elements.namedItem(name) as HTMLInputElement | null;
    const current = Object.fromEntries(
      DOCUMENT_PREFILL_FIELDS[type].map((field) => [field, input(field)?.value ?? ""]),
    );
    const updates = prefillUpdates(current, fields, lastRead.current);
    for (const [name, value] of Object.entries(updates)) {
      const element = input(name);
      if (element) element.value = value;
    }
    lastRead.current = fields;
    // Dates lues contrôlées tout de suite, comme à l'envoi : document expiré, Kbis trop ancien…
    const parsed = documentMetadataSchema().safeParse({ type, ...current, ...updates });
    const dateErrors = parsed.success ? {} : z.flattenError(parsed.error).fieldErrors;
    setReadErrors(
      Object.fromEntries(
        (["dateEmission", "dateFin"] as const)
          .filter((field) => field in updates)
          .map((field) => [field, (dateErrors as Record<string, string[] | undefined>)[field]]),
      ),
    );
  }

  async function read(file: File) {
    setChosen(file.name);
    if (!readAs) return;
    const key = fileKey(file);
    const previous = upload.current;
    const prepared = prepare(file).then((path) => (path === "invalid_type" ? null : path));
    upload.current = { key, path: prepared };
    if (previous) {
      void previous.path.then((path) => {
        if (path) void discardRaw(path);
      });
    }
    setReading({ step: "reading" });
    const path = await prepared;
    if (upload.current?.key !== key) return;
    if (!path) return setReading(null);
    const result = await readDocument(path, readAs);
    if (upload.current?.key !== key) return;
    if (result.status !== "ok") return setReading({ step: "failed" });
    fill(readAs, result.fields);
    setReadValues(result.fields);
    setReading({
      step: "done",
      filled: Object.keys(result.fields).length > 0,
      warnings: result.warnings,
    });
  }

  const [state, action, pending] = useActionState(async (prev: FormState, formData: FormData) => {
    // Photo prise ou fichier choisi : le champ rempli, s'il y en a un.
    const file = formData
      .getAll("file")
      .find((value): value is File => value instanceof File && value.size > 0);
    if (!file) return { fieldErrors: { file: [t.fileRequired] } };
    if (file.size > MAX_UPLOAD_BYTES) return { fieldErrors: { file: [t.fileTooLarge] } };
    setReadErrors({});

    // Document déjà déposé pour sa lecture : le même fichier, pas un second envoi.
    const uploaded = upload.current?.key === fileKey(file) ? upload.current.path : null;
    const path = uploaded ? await uploaded : await prepare(file);
    if (path === "invalid_type") return { error: t.status.invalid_type };
    if (!path) return { error: t.uploadFailed };

    formData.delete("file");
    formData.set("path", path);
    formData.set("purpose", purpose);
    const result = await process(prev, formData);
    // Le formulaire est vidé après l'envoi (React) : le fichier sera choisi de nouveau. Le fichier
    // brut est retiré par process-upload, ou ici si les champs ont été refusés avant son appel.
    if (result.fieldErrors) void discardRaw(path);
    upload.current = null;
    lastRead.current = {};
    if (!result.fieldErrors && !result.error) {
      framed.current = null;
      setFramedUrl(null);
    }
    // Le champ fichier est vidé après l'envoi : l'aperçu de la zone de dépôt aussi.
    if (dropLabel) {
      setChosen(null);
      setPreview(null);
    }
    setReading(null);
    setReadValues({});
    return result;
  }, {});

  const errors = { ...(state.fieldErrors ?? {}), ...readErrors };
  const fileErrorId = errors.file ? `${formId}-file-error` : undefined;
  const fields = typeof children === "function" ? children(errors) : children;
  const expected = readAs ? fr.pro.onboarding.documents.types[readAs] : "";

  return (
    <form ref={form} action={action} className="flex flex-col gap-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {/* Document lu automatiquement : le fichier d'abord, puis les champs pré-remplis. */}
      {readAs ? null : fields}
      {camera ? (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            drop(event.dataTransfer.files);
          }}
          className={`flex flex-col gap-3 rounded-card border-2 border-dashed p-4 transition-colors sm:p-5 ${
            dragging ? "border-primary bg-primary-softer" : "border-border-strong bg-background"
          }`}
        >
          <p className="hidden flex-col items-center gap-1 text-center sm:flex">
            <span className="flex size-11 items-center justify-center rounded-input bg-primary-soft text-primary-strong">
              <FileUp aria-hidden="true" className="size-5" />
            </span>
            <span className="font-semibold">{fr.pro.onboarding.documents.dropHere}</span>
            <span className="text-sm text-muted-foreground">
              {fr.pro.onboarding.documents.dropOr}
            </span>
          </p>
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
              onPick={(file) => {
                if (fileInput.current) fileInput.current.value = "";
                void read(file);
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
              onPick={(file) => {
                if (cameraInput.current) cameraInput.current.value = "";
                void read(file);
              }}
            />
          </div>
          {dropError && (
            <p className="text-sm text-danger" role="alert">
              {t.status.invalid_type}
            </p>
          )}
          {chosen && (
            <p
              className="flex items-center gap-2.5 rounded-input border border-border bg-surface px-3 py-2.5 text-sm font-medium"
              aria-live="polite"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-input bg-success-soft text-success">
                <FileCheck aria-hidden="true" className="size-4" />
              </span>
              <span className="min-w-0 truncate">{fr.pro.onboarding.documents.chosen(chosen)}</span>
            </p>
          )}
        </div>
      ) : dropLabel ? (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            drop(event.dataTransfer.files);
          }}
          className={`flex flex-col items-center gap-3 rounded-card border-2 border-dashed p-4 text-center transition-colors sm:p-5 ${
            dragging ? "border-primary bg-primary-softer" : "border-border-strong bg-background"
          }`}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- aperçu local de l'image choisie
            <img
              src={preview}
              alt={t.previewAlt}
              className="h-auto max-h-28 w-auto max-w-full rounded-input border border-border bg-surface object-contain p-2"
            />
          ) : (
            <span className="hidden size-11 items-center justify-center rounded-input bg-primary-soft text-primary-strong sm:flex">
              <ImageUp aria-hidden="true" className="size-5" />
            </span>
          )}
          <p className="hidden flex-col gap-1 sm:flex">
            <span className="font-semibold">{dropLabel}</span>
            <span className="text-sm text-muted-foreground">
              {fr.pro.onboarding.documents.dropOr}
            </span>
          </p>
          <div className="w-full sm:w-auto sm:min-w-56">
            <CameraButton
              id={`${formId}-file`}
              inputRef={fileInput}
              label={chosen ? t.chooseOther : fr.pro.onboarding.documents.chooseFile}
              ariaLabel={fileLabel}
              icon={<FileUp aria-hidden="true" className="size-5" />}
              accept={accept}
              describedBy={[`${formId}-file-hint`, fileErrorId].filter(Boolean).join(" ")}
              invalid={Boolean(errors.file)}
              onPick={pickImage}
            />
          </div>
          {dropError && (
            <p className="text-sm text-danger" role="alert">
              {t.status.invalid_type}
            </p>
          )}
          {chosen && (
            <p className="max-w-full truncate text-sm font-medium" aria-live="polite">
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
            ref={fileInput}
            id={`${formId}-file`}
            name="file"
            type="file"
            accept={accept}
            aria-invalid={errors.file ? true : undefined}
            aria-describedby={[`${formId}-file-hint`, fileErrorId].filter(Boolean).join(" ")}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && readAs) void read(file);
              if (file && square) setFraming(file);
            }}
            className="rounded-button border border-border bg-surface p-2 file:mr-3 file:rounded-button file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:font-medium file:text-primary"
          />
        </div>
      )}
      {square && framedUrl && (
        <div className="flex items-center gap-3" aria-live="polite">
          {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local de l'image cadrée */}
          <img
            src={framedUrl}
            alt={fr.avatarFramer.preview}
            className="size-16 rounded-full border border-border"
          />
          <div className="flex flex-col gap-1 text-sm">
            <p className="text-success">{fr.avatarFramer.ready}</p>
            <button
              type="button"
              className="self-start font-medium text-primary-strong underline-offset-2 hover:underline"
              onClick={() => {
                const file = fileInput.current?.files?.[0];
                if (file) setFraming(file);
              }}
            >
              {fr.avatarFramer.reframe}
            </button>
          </div>
        </div>
      )}
      {framing && (
        <AvatarFramer
          file={framing}
          onCancel={() => {
            setFraming(null);
            if (!framed.current && fileInput.current) fileInput.current.value = "";
          }}
          onConfirm={(blob, url) => {
            if (framed.current) URL.revokeObjectURL(framed.current.url);
            framed.current = { key: fileKey(framing), blob, url };
            setFramedUrl(url);
            setFraming(null);
          }}
        />
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
      {reading && (
        <div aria-live="polite">
          {reading.step === "reading" ? (
            <AiWorking label={r.reading} />
          ) : reading.step === "failed" ? (
            <Alert tone="info">{r.failed}</Alert>
          ) : (
            <div className="flex flex-col gap-2">
              {reading.warnings.map((warning) => (
                <Alert key={warning} tone="error">
                  {warning === "autre_document" ? r.otherDocument(expected) : r.warnings[warning]}
                </Alert>
              ))}
              {reading.filled ? (
                <div className="flex flex-col gap-2 rounded-input border border-success/25 bg-success-soft px-3.5 py-3 text-sm">
                  <p className="font-medium text-success">{r.done}</p>
                  <ul className="flex flex-col gap-1">
                    {Object.entries(readValues).map(([field, value]) =>
                      value ? (
                        <li key={field} className="flex flex-wrap items-baseline gap-x-2">
                          <span className="text-label">
                            {readAs === "urssaf" && field === "numero"
                              ? fr.pro.onboarding.documents.securityCode
                              : (r.fields[field] ?? field)}
                          </span>
                          <b>
                            {/^\d{4}-\d{2}-\d{2}$/.test(String(value))
                              ? String(value).split("-").reverse().join("/")
                              : String(value)}
                          </b>
                          <span className="rounded-pill bg-surface px-2 py-0.5 text-xs font-semibold text-success">
                            {r.read}
                          </span>
                        </li>
                      ) : null,
                    )}
                  </ul>
                </div>
              ) : reading.warnings.length === 0 ? (
                <Alert tone="info">{r.empty}</Alert>
              ) : null}
            </div>
          )}
        </div>
      )}
      {readAs ? fields : null}
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
  ariaLabel = label,
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
  /** Nom du champ pour les lecteurs d'écran, s'il diffère du texte du bouton. */
  ariaLabel?: string;
  icon: ReactNode;
  accept: string;
  capture?: boolean;
  primary?: boolean;
  invalid?: boolean;
  describedBy?: string;
  onPick: (file: File) => void;
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
        aria-label={ariaLabel}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
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
