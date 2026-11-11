"use client";

import { Play } from "lucide-react";
import { useRef, useState } from "react";
import { fr } from "@/i18n/fr";

const t = fr.home.video;

/**
 * Vidéo de présentation de l'accueil, dans « Comment ça marche » après les étapes (ADR 0278) :
 * fichier statique du site, chargé seulement à la lecture (`preload="none"`), image d'aperçu
 * tirée de la vidéo et grand bouton de lecture. Aucun titre visible.
 */
export function HomeVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  return (
    <div className="reveal relative mx-auto w-full max-w-4xl overflow-hidden rounded-card border border-border bg-[#0b1438] shadow-raised">
      <video
        ref={video}
        className="block aspect-video w-full"
        controls={started}
        playsInline
        preload="none"
        poster="/videos/menao-accueil.webp"
        aria-label={t.label}
        onPlay={() => setStarted(true)}
      >
        <source src="/videos/menao-accueil.mp4" type="video/mp4" />
        {t.fallback}
      </video>
      {!started && (
        <button
          type="button"
          onClick={() => {
            setStarted(true);
            void video.current?.play();
          }}
          className="group absolute inset-0 flex items-center justify-center bg-[#0b1438]/10 transition-colors hover:bg-[#0b1438]/20 focus-visible:outline-none"
        >
          <span className="flex size-18 items-center justify-center rounded-full bg-white text-primary shadow-raised transition-transform group-hover:scale-105 group-focus-visible:ring-4 group-focus-visible:ring-white/60 sm:size-20">
            <Play aria-hidden="true" className="ml-1 size-8 fill-current" />
          </span>
          <span className="sr-only">{t.play}</span>
        </button>
      )}
    </div>
  );
}
