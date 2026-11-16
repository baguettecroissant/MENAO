"use client";

import { MAX_UPLOAD_BYTES } from "@menao/core";
import { Camera, ImagePlus } from "lucide-react";
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
export function PortfolioUpload({
  userId,
  remaining,
  empty = false,
}: {
  userId: string;
  remaining: number;
  /** Aucune photo encore : trois cases qui donnent des idées (maquette du lot 61). */
  empty?: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [dragging, setDragging] = useState(false);

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
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const files = Array.from(event.dataTransfer.files).filter((file) =>
          ["image/jpeg", "image/png"].includes(file.type),
        );
        if (files.length && progress === null) void send(files);
      }}
      className={`flex flex-col gap-3 rounded-card ${dragging ? "outline-2 outline-offset-4 outline-primary" : ""}`}
    >
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      {empty && (
        <ul className="grid grid-cols-3 gap-2.5">
          {t.portfolioIdeas.map((idea) => (
            <li key={idea}>
              <label
                htmlFor="portfolio-files"
                className="flex aspect-4/3 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-input border-2 border-dashed border-border-strong px-2 text-center text-xs font-semibold text-muted-foreground hover:border-primary"
              >
                <Camera aria-hidden="true" className="size-5" />
                {idea}
              </label>
            </li>
          ))}
        </ul>
      )}
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
