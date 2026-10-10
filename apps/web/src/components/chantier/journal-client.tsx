"use client";

import { Camera } from "lucide-react";
import { useCallback, useState } from "react";
import { Drawer } from "@/components/drawer";
import { fr } from "@/i18n/fr";

const t = fr.chantier.journal;
const linkRing = "focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none";

/**
 * Mosaïque des photos du journal (maquette) : la plus récente en grand, deux vignettes, puis
 * « Voir les N photos » qui ouvre toutes les photos. Chaque photo s'ouvre en grand.
 */
export function PhotoMosaic({ urls }: { urls: string[] }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const shown = urls.slice(0, 3);
  return (
    <>
      <div className="relative grid grid-cols-2 gap-1.5 overflow-hidden rounded-card">
        {shown.map((url, i) => (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noreferrer"
            className={`block ${linkRing} ${i === 0 || shown.length === 2 ? "col-span-2" : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire */}
            <img
              src={url}
              alt={t.photoAlt(i + 1, urls.length)}
              className={`w-full object-cover ${i === 0 ? "aspect-[16/10]" : "aspect-[4/3]"}`}
            />
          </a>
        ))}
        {urls.length > shown.length && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`absolute right-2 bottom-2 inline-flex min-h-8 items-center gap-1.5 rounded-pill bg-surface/95 px-3 text-xs font-medium text-primary-strong shadow-card hover:bg-surface ${linkRing}`}
          >
            <Camera aria-hidden="true" className="size-3.5" />
            {t.seePhotos(urls.length)}
          </button>
        )}
      </div>
      {urls.length > shown.length && (
        <Drawer open={open} onClose={close} title={t.photosTitle} backLabel={t.close}>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {urls.map((url, i) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className={`block rounded-lg ${linkRing}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire */}
                  <img
                    src={url}
                    alt={t.photoAlt(i + 1, urls.length)}
                    loading="lazy"
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                </a>
              </li>
            ))}
          </ul>
        </Drawer>
      )}
    </>
  );
}

/** Messages du journal : les deux plus récents, puis « Afficher tous les messages ». */
export function JournalMessages({
  author,
  messages,
}: {
  author: string;
  messages: { id: string; message: string; ago: string }[];
}) {
  const [all, setAll] = useState(false);
  const shown = all ? messages : messages.slice(0, 2);
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-4">
        {shown.map((m) => (
          <li key={m.id} className="flex flex-col gap-0.5">
            <p className="text-sm font-medium">{author}</p>
            <p className="text-xs text-muted-foreground">{t.messageLeft(m.ago)}</p>
            <p className="mt-1 text-sm leading-relaxed whitespace-pre-line">{m.message}</p>
          </li>
        ))}
      </ul>
      {messages.length > 2 && (
        <button
          type="button"
          onClick={() => setAll((value) => !value)}
          aria-expanded={all}
          className={`self-start rounded-sm text-xs font-medium text-primary-strong hover:underline ${linkRing}`}
        >
          {all ? t.showFewerMessages : t.showAllMessages}
        </button>
      )}
    </div>
  );
}
