"use client";

import { HELP_VIDEOS, helpVideoUrls, type HelpVideoId } from "@menao/core";
import { ChevronRight, Play, X } from "lucide-react";
import { useRef } from "react";
import { focusRing } from "@/components/ui";
import { env } from "@/env";
import { fr } from "@/i18n/fr";

const t = fr.pro.onboarding.help.video;

/**
 * Vidéo verticale de l'aide (lot 60, ADR 0349) : une carte avec l'aperçu, qui ouvre la vidéo dans
 * une fenêtre. Fichiers servis par le stockage Supabase (règle 13), sous-titres incrustés.
 */
export function HelpVideo({ id }: { id: HelpVideoId }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const player = useRef<HTMLVideoElement>(null);
  const { title, seconds } = HELP_VIDEOS[id];
  const urls = helpVideoUrls(env.NEXT_PUBLIC_SUPABASE_URL, id);

  function close() {
    player.current?.pause();
    dialog.current?.close();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          dialog.current?.showModal();
          void player.current?.play().catch(() => null);
        }}
        className={`flex w-full items-center gap-3.5 rounded-card border border-border bg-surface p-3 text-left hover:bg-background ${focusRing}`}
      >
        <span className="relative flex h-24 w-[3.375rem] shrink-0 items-center justify-center overflow-hidden rounded-[0.625rem] bg-foreground">
          {/* eslint-disable-next-line @next/next/no-img-element -- aperçu servi par Supabase (règle 13 : pas d'optimisation d'images Vercel) */}
          <img
            src={urls.poster}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover opacity-80"
          />
          <span className="relative flex size-7 items-center justify-center rounded-full bg-white text-foreground">
            <Play aria-hidden="true" className="size-3.5 fill-current" />
          </span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-xs font-bold tracking-wide text-primary-strong uppercase">
            {t.label(seconds)}
          </span>
          <span className="font-semibold leading-snug">{title}</span>
          <span className="text-sm text-muted-foreground">{t.hint}</span>
        </span>
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </button>
      <dialog
        ref={dialog}
        aria-label={title}
        onClose={() => player.current?.pause()}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className="m-auto max-h-[92dvh] w-[min(24rem,92vw)] rounded-card bg-foreground p-0 backdrop:bg-foreground/70"
      >
        <div className="relative">
          <video
            ref={player}
            src={urls.video}
            poster={urls.poster}
            controls
            playsInline
            preload="none"
            className="block aspect-[9/16] max-h-[92dvh] w-full"
          />
          <button
            type="button"
            onClick={close}
            aria-label={t.close}
            className={`absolute top-3 right-3 flex size-10 items-center justify-center rounded-full bg-black/55 text-white ${focusRing}`}
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
      </dialog>
    </>
  );
}
