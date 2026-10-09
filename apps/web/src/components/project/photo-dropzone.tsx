"use client";

import { useId, useRef, useState } from "react";
import { fr } from "@/i18n/fr";
import { PHOTO_ACCEPT } from "@/lib/project/photos";

const t = fr.search.photos;

/** Bouton « pièce jointe » et glisser-déposer (F-05, F-07). Les contrôles sont faits par le parent. */
export function PhotoDropzone({
  onFiles,
  disabled = false,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!disabled) onFiles(Array.from(e.dataTransfer.files));
      }}
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-button border border-dashed px-3 py-2 ${
        over ? "border-primary bg-primary-soft" : "border-border"
      }`}
    >
      <label
        htmlFor={id}
        className="inline-flex min-h-touch cursor-pointer items-center gap-2 font-medium text-primary has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            d="m21 12-8.5 8.5a5 5 0 0 1-7-7L14 5a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 8"
            strokeLinecap="round"
          />
        </svg>
        {t.add}
        <input
          ref={input}
          id={id}
          type="file"
          accept={PHOTO_ACCEPT}
          multiple
          disabled={disabled}
          className="sr-only"
          onChange={(e) => {
            onFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </label>
      <span className="text-sm text-muted-foreground">
        {t.drop} — {t.hint}
      </span>
    </div>
  );
}
