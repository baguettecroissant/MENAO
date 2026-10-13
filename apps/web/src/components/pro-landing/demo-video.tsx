import { fr } from "@/i18n/fr";

const t = fr.pro.landing.video;

/**
 * Vidéo de démonstration de l'Espace Pro (F-03) : fichier statique du site, chargé seulement à la
 * lecture (`preload="none"`), avec une image d'aperçu et des sous-titres français (ADR 0058).
 */
export function DemoVideo() {
  return (
    <div className="reveal mx-auto w-full max-w-5xl overflow-hidden rounded-card border border-border bg-[#0b1438] shadow-raised">
      <video
        className="block aspect-video w-full"
        controls
        playsInline
        preload="none"
        poster="/videos/menao-demo.webp"
        aria-label={t.label}
      >
        <source src="/videos/menao-demo.mp4" type="video/mp4" />
        <track kind="captions" src="/videos/menao-demo.vtt" srcLang="fr" label={t.captions} />
        {t.fallback}
      </video>
    </div>
  );
}
