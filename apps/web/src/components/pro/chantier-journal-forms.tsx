"use client";

import { ImagePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useId, useState } from "react";
import { Alert, Button, FieldError, Hint, buttonClasses, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { addChantierMessage } from "@/lib/artisan/chantier-actions";
import { selectChantierPhotos, uploadChantierPhoto } from "@/lib/artisan/chantier-photos";
import { initialFormState } from "@/lib/auth/form";
import { PHOTO_ACCEPT } from "@/lib/project/photos";

const t = fr.pro.followUp;

/** « Ajouter des photos » et « Ajouter un message » (F-22). */
export function JournalComposer({ chantierId }: { chantierId: string }) {
  return (
    <div className="flex flex-col gap-4">
      <PhotoUpload chantierId={chantierId} />
      <MessageForm chantierId={chantierId} />
    </div>
  );
}

/** Plusieurs photos à la fois, envoyées une à une puis ajoutées au journal. */
function PhotoUpload({ chantierId }: { chantierId: string }) {
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
    if (lines.length)
      setNotice({ tone: problems.length ? "error" : "success", text: lines.join(" ") });
    if (added) router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <label
        htmlFor={id}
        className={`${buttonClasses({ variant: "outline", block: false })} cursor-pointer has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-primary/20`}
      >
        <ImagePlus aria-hidden="true" className="size-4" />
        {t.addPhotos}
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
      <Hint>{t.photosHint}</Hint>
      {progress && (
        <p role="status" className="text-sm text-muted-foreground">
          {t.uploading(progress.done, progress.total)}
        </p>
      )}
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
    </div>
  );
}

function MessageForm({ chantierId }: { chantierId: string }) {
  const [state, formAction, pending] = useActionState(
    addChantierMessage.bind(null, chantierId),
    initialFormState,
  );
  const error = state.fieldErrors?.message?.[0];
  return (
    <form action={formAction} className="flex flex-col gap-2" noValidate>
      <label htmlFor="chantier-message" className="text-sm font-medium">
        {t.message}
      </label>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <textarea
        id="chantier-message"
        name="message"
        rows={3}
        maxLength={2000}
        defaultValue={state.values?.message}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "chantier-message-error" : undefined}
        className={`${inputClasses} min-h-24 py-3`}
      />
      {error && <FieldError id="chantier-message-error">{error}</FieldError>}
      <Button type="submit" block={false} disabled={pending} className="self-end">
        {t.messageSubmit}
      </Button>
    </form>
  );
}
