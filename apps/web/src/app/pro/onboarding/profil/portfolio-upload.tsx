"use client";

import { MAX_UPLOAD_BYTES } from "@menao/core";
import { ImagePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Alert, buttonClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { processUpload } from "@/lib/artisan/actions";
import { resizeImage, uploadRaw } from "@/lib/upload/client";

const t = fr.pro.onboarding.profile;
const u = fr.pro.onboarding.upload;
/** Même taille que les photos de l'application et des chantiers. */
const PHOTO_MAX_SIDE = 2000;

/**
 * Photos de réalisations : plusieurs à la fois, envoyées l'une après l'autre (comme dans
 * l'application), dans la limite des places restantes. Chaque photo passe par process-upload.
 */
export function PortfolioUpload({ userId, remaining }: { userId: string; remaining: number }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function send(chosen: File[]) {
    setMessage(null);
    const files = chosen.slice(0, remaining);
    let sent = 0;
    let failure: string | null = null;
    for (const [index, file] of files.entries()) {
      setProgress(t.portfolioSending(index + 1, files.length));
      if (file.size > MAX_UPLOAD_BYTES) {
        failure = u.fileTooLarge;
        break;
      }
      let blob: Blob;
      try {
        blob = await resizeImage(file, PHOTO_MAX_SIDE, { quality: 0.9 });
      } catch {
        failure = u.status.invalid_type;
        break;
      }
      const path = await uploadRaw(userId, blob);
      if (!path) {
        failure = u.uploadFailed;
        break;
      }
      const form = new FormData();
      form.set("path", path);
      form.set("purpose", "portfolio");
      const result = await processUpload({}, form);
      if (result.error) {
        failure = result.error;
        break;
      }
      sent += 1;
    }
    setProgress(null);
    if (failure) setMessage({ tone: "error", text: failure });
    else if (chosen.length > files.length) {
      setMessage({ tone: "success", text: t.portfolioTooMany(files.length) });
    } else if (sent) setMessage({ tone: "success", text: t.portfolioDone(sent) });
    if (sent) router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <input
        ref={input}
        id="portfolio-files"
        type="file"
        accept="image/jpeg,image/png"
        multiple
        className="sr-only"
        aria-describedby="portfolio-files-hint"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) void send(files);
        }}
      />
      <label
        htmlFor="portfolio-files"
        aria-disabled={progress !== null}
        className={`${buttonClasses({ variant: "outline", block: false })} cursor-pointer self-start aria-disabled:pointer-events-none aria-disabled:opacity-60`}
      >
        <ImagePlus aria-hidden="true" className="size-5" />
        {t.portfolioAdd}
      </label>
      <p id="portfolio-files-hint" className="text-sm text-muted-foreground" aria-live="polite">
        {progress ?? u.fileHintPhoto}
      </p>
    </div>
  );
}
