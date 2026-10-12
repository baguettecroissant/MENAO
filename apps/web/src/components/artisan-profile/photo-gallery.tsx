"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useRef, useState } from "react";
import { fr } from "@/i18n/fr";

const t = fr.search.profile;

/** Chantiers récents : vignettes et galerie en modale (F-10, maquette « Fiche artisan »). */
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
              className="block w-full overflow-hidden rounded-lg focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- images non optimisées par Vercel */}
              <img
                src={url}
                alt={t.photoAlt(i + 1, name)}
                className="aspect-square w-full object-cover transition-transform duration-300 hover:scale-105"
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
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
        className="m-auto w-[min(56rem,calc(100vw-2rem))] rounded-card bg-surface p-5 shadow-raised backdrop:bg-foreground/50"
      >
        <div className="flex items-start justify-between gap-4">
          <p className="text-[1.0625rem] font-medium">{t.recent}</p>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label={t.close}
            className="inline-flex size-9 items-center justify-center rounded-full hover:bg-background"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label={t.previous}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-primary text-primary-strong hover:bg-primary-softer"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </button>
          {urls[index] && (
            // eslint-disable-next-line @next/next/no-img-element -- images non optimisées par Vercel
            <img
              src={urls[index]}
              alt={t.photoAlt(index + 1, name)}
              className="max-h-[65vh] min-w-0 flex-1 rounded-lg object-contain"
            />
          )}
          <button
            type="button"
            onClick={() => move(1)}
            aria-label={t.next}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-primary text-primary-strong hover:bg-primary-softer"
          >
            <ChevronRight aria-hidden="true" className="size-5" />
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {t.photoCounter(index + 1, urls.length)}
        </p>
      </dialog>
    </>
  );
}
