"use client";

import { ImagePlus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useId, useState } from "react";
import { Alert, Button, FieldError, Hint, buttonClasses, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { addChantierMessage } from "@/lib/artisan/chantier-actions";
import { selectChantierPhotos, uploadChantierPhoto } from "@/lib/artisan/chantier-photos";
import { initialFormState } from "@/lib/auth/form";
import { PHOTO_ACCEPT } from "@/lib/project/photos";
import { useActionSuccess } from "@/lib/use-action-success";

const t = fr.pro.followUp;
const dashed =
  "flex min-h-12 w-full items-center justify-center gap-2 rounded-pill border border-dashed border-border-strong text-sm font-medium text-primary-strong transition-colors hover:bg-background focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:text-subtle-foreground disabled:hover:bg-transparent";

/**
 * « Ajouter une photo » (F-22, plusieurs à la fois) : photos réduites dans le navigateur, envoyées
 * une à une à process-upload, puis le journal est rafraîchi.
 */
export function PhotoUpload({
  chantierId,
  label = t.addPhoto,
  variant = "button",
}: {
  chantierId: string;
  label?: string;
  /** Bouton à contour (journal) ou lien (tiroir de fin de chantier). */
  variant?: "button" | "link";
}) {
  const id = useId();
  const router = useRouter();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function send(files: File[]) {
    const { accepted, tooLarge, tooMany } = selectChantierPhotos(files);
    const problems = tooLarge.map(t.photoErrors.tooLarge);
    if (tooMany) problems.push(t.photoErrors.tooMany);
    setNotice(null);
    let added = 0;
    let failed = 0;
    for (const [i, file] of accepted.entries()) {
      setProgress({ done: i + 1, total: accepted.length });
      const status = await uploadChantierPhoto(chantierId, file);
      if (status === "ok") {
        added += 1;
      } else if (status === "limit" || status === "rate_limited") {
        problems.push(t.photoErrors[status]);
        break;
      } else {
        failed += 1;
      }
    }
    setProgress(null);
    if (failed) problems.push(t.photoErrors.failed(failed));
    const lines = [...(added ? [t.photosAdded(added)] : []), ...problems];
    if (lines.length) {
      setNotice({ tone: problems.length ? "error" : "success", text: lines.join(" ") });
    }
    if (added) router.refresh();
  }

  return (
    <div className={`flex flex-col gap-2 ${variant === "link" ? "items-center" : ""}`}>
      <label
        htmlFor={id}
        className={`${
          variant === "link"
            ? "inline-flex min-h-touch items-center gap-2 rounded-md px-2 text-sm font-medium text-primary-strong hover:underline"
            : buttonClasses({ variant: "outline" })
        } cursor-pointer has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-primary/20`}
      >
        {label}
        <ImagePlus aria-hidden="true" className="size-4" />
        <input
          id={id}
          type="file"
          accept={PHOTO_ACCEPT}
          multiple
          disabled={progress !== null}
          className="sr-only"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length) void send(files);
          }}
        />
      </label>
      {variant === "button" && <Hint>{t.photosHint}</Hint>}
      {progress && (
        <p role="status" className="text-sm text-muted-foreground">
          {t.uploading(progress.done, progress.total)}
        </p>
      )}
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
    </div>
  );
}

/** « Ajouter un message + » (maquette) : le bouton ouvre le champ du message. */
export function MessageComposer({ chantierId }: { chantierId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    addChantierMessage.bind(null, chantierId),
    initialFormState,
  );
  const close = useCallback(() => setOpen(false), []);
  useActionSuccess(state, close);
  const error = state.fieldErrors?.message?.[0];

  if (!open) {
    return (
      <div className="flex flex-col gap-2">
        {state.success && <Alert tone="success">{state.success}</Alert>}
        <button type="button" onClick={() => setOpen(true)} className={dashed}>
          {t.addMessage}
          <Plus aria-hidden="true" className="size-4" />
        </button>
      </div>
    );
  }
  return (
    <form action={formAction} className="flex flex-col gap-2" noValidate>
      <label htmlFor="chantier-message" className="text-sm font-medium">
        {t.messageLabel}
      </label>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <textarea
        id="chantier-message"
        name="message"
        rows={3}
        maxLength={2000}
        autoFocus
        defaultValue={state.values?.message}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "chantier-message-error" : undefined}
        className={`${inputClasses} min-h-24 py-3`}
      />
      {error && <FieldError id="chantier-message-error">{error}</FieldError>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" block={false} onClick={close}>
          {t.messageCancel}
        </Button>
        <Button type="submit" block={false} disabled={pending}>
          {t.messageSubmit}
        </Button>
      </div>
    </form>
  );
}

/** Boutons du journal tant que les travaux n'ont pas commencé (maquette : grisés). */
export function LockedJournalActions() {
  return (
    <div className="flex flex-col gap-2">
      <button type="button" disabled className={dashed}>
        {t.addMessage}
        <Plus aria-hidden="true" className="size-4" />
      </button>
      <button type="button" disabled className={dashed}>
        {t.addPhoto}
        <ImagePlus aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
