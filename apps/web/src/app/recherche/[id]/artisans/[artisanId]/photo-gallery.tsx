"use client";

import { useRef, useState } from "react";
import { fr } from "@/i18n/fr";

const t = fr.search.profile;

/** Chantiers récents : vignettes et galerie en modale (F-10). */
export function PhotoGallery({ urls, name }: { urls: string[]; name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);

  function open(i: number) {
    setIndex(i);
    dialog.current?.showModal();
  }
  const move = (delta: number) => setIndex((i) => (i + delta + urls.length) % urls.length);

  return (
    <>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {urls.map((url, i) => (
          <li key={url}>
            <button
              type="button"
              onClick={() => open(i)}
              className="block w-full overflow-hidden rounded-button focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- images non optimisées par Vercel */}
              <img
                src={url}
                alt={t.photoAlt(i + 1, name)}
                className="aspect-square w-full object-cover"
              />
            </button>
          </li>
        ))}
      </ul>
      <dialog
        ref={dialog}
        aria-label={t.photoAlt(index + 1, name)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") move(1);
          if (e.key === "ArrowLeft") move(-1);
        }}
        className="m-auto max-h-[90vh] max-w-4xl rounded-card bg-surface p-4 backdrop:bg-black/70"
      >
        {urls[index] && (
          // eslint-disable-next-line @next/next/no-img-element -- images non optimisées par Vercel
          <img
            src={urls[index]}
            alt={t.photoAlt(index + 1, name)}
            className="max-h-[75vh] w-full object-contain"
          />
        )}
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => move(-1)}
            className="min-h-touch px-3 font-medium text-primary"
          >
            ← {t.previous}
          </button>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="min-h-touch px-3 font-medium"
          >
            {t.close}
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            className="min-h-touch px-3 font-medium text-primary"
          >
            {t.next} →
          </button>
        </div>
      </dialog>
    </>
  );
}
