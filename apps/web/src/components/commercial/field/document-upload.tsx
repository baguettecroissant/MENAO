"use client";

import { MAX_UPLOAD_BYTES } from "@menao/core";
import { LoaderCircle, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { buttonClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { storeCommercialDocument, type DocumentKind } from "@/lib/commercial/onboarding-actions";
import { createClient } from "@/lib/supabase/client";
import { resizeImage, uploadRaw } from "@/lib/upload/client";

const t = fr.commercialField.start.upload;
/** Photo d'une pièce : réduite, assez nette pour être lue. */
const PHOTO_MAX_SIDE = 2400;

/**
 * Dépôt d'une pièce du conseiller (F-194, ADR 0394) : contrat signé, attestation Urssaf ou RIB.
 * Photo réduite dans le navigateur, PDF tel quel, puis rangé par process-upload. Démo : arrêté.
 */
export function DocumentUpload({
  kind,
  label,
  primary = false,
}: {
  kind: DocumentKind;
  label: string;
  primary?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function send(file: File) {
    setError(null);
    const { data } = await createClient().auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return setError(t.errors.unavailable ?? null);
    let blob: Blob = file;
    if (file.type.startsWith("image/")) {
      blob = await resizeImage(file, PHOTO_MAX_SIDE).catch(() => file);
    }
    if (blob.size > MAX_UPLOAD_BYTES) return setError(t.errors.too_large ?? null);
    const path = await uploadRaw(userId, blob);
    if (!path) return setError(t.errors.unavailable ?? null);
    const result = await storeCommercialDocument(kind, path);
    if (result.status === "error") return setError(result.message);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <input
        ref={input}
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) startTransition(() => send(file));
        }}
      />
      <button
        type="button"
        data-demo-block="save"
        disabled={busy}
        onClick={() => input.current?.click()}
        title={t.hint}
        className={`${buttonClasses({ variant: primary ? "primary" : "secondary", size: "sm", block: false })} whitespace-nowrap`}
      >
        {busy ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <Upload aria-hidden="true" className="size-4" />
        )}
        {busy ? t.uploading : label}
      </button>
      {error && (
        <p role="alert" className="max-w-56 text-right text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
