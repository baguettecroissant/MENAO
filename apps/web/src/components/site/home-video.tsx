import { fr } from "@/i18n/fr";

const t = fr.home.video;

/**
 * Vidéo de présentation de l'accueil, juste sous le bandeau (ADR 0278) : fichier statique du site,
 * chargé seulement à la lecture (`preload="none"`), avec une image d'aperçu. Aucun titre visible.
 */
export function HomeVideo() {
  return (
    <section aria-label={t.label} className="bg-surface px-4 pt-10 sm:px-6 sm:pt-14">
      <div className="reveal mx-auto w-full max-w-5xl overflow-hidden rounded-card border border-border bg-[#0b1438] shadow-raised">
        <video
          className="block aspect-video w-full"
          controls
          playsInline
          preload="none"
          poster="/videos/menao-accueil.webp"
          aria-label={t.label}
        >
          <source src="/videos/menao-accueil.mp4" type="video/mp4" />
          {t.fallback}
        </video>
      </div>
    </section>
  );
}
