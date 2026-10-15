"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fr } from "@/i18n/fr";

const t = fr.prelaunch.teaser;

/**
 * Teaser de la page d'attente (ADR 0102) : lecture automatique native, en boucle et en sourdine,
 * bouton pour activer le son (la vidéo reprend alors au début). Avec « réduire les animations », la
 * vidéo reste à l'arrêt sur son image d'aperçu et se lance avec les commandes du navigateur.
 */
export function TeaserVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      video.currentTime = 0;
      video.controls = true;
      return;
    }
    // Lecture seulement quand la vidéo est à l'écran : reprise si le navigateur l'a suspendue,
    // pause hors de vue (batterie, données mobiles).
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          video.play().catch(() => {
            video.controls = true;
          });
        } else video.pause();
      },
      { threshold: 0.25 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  function toggleSound() {
    const video = ref.current;
    if (!video) return;
    const next = !muted;
    video.muted = next;
    if (!next) {
      video.currentTime = 0;
      void video.play().catch(() => undefined);
    }
    setMuted(next);
  }

  return (
    <div className="relative overflow-hidden rounded-card bg-[#070c33] shadow-raised">
      <video
        ref={ref}
        className="block aspect-video w-full"
        autoPlay
        muted
        loop
        playsInline
        poster="/videos/menao-teaser.webp"
        aria-label={t.label}
      >
        <source src="/videos/menao-teaser.mp4" type="video/mp4" />
        {t.fallback}
      </video>
      <button
        type="button"
        onClick={toggleSound}
        aria-pressed={!muted}
        className="absolute right-3 bottom-3 inline-flex items-center gap-2 rounded-pill bg-black/55 px-3 py-2 text-sm font-medium text-white backdrop-blur hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {muted ? (
          <VolumeX aria-hidden="true" className="size-4" />
        ) : (
          <Volume2 aria-hidden="true" className="size-4" />
        )}
        {muted ? t.soundOn : t.soundOff}
      </button>
    </div>
  );
}
