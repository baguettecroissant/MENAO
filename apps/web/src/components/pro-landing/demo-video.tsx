import { fr } from "@/i18n/fr";

const t = fr.pro.landing.video;

/**
 * Film de vente de l'Espace Pro (F-123, ADR 0275, après les ADR 0058 et 0099) : fichier statique du
 * site, chargé seulement à la lecture (`preload="none"`), avec une image d'aperçu et des sous-titres
 * français.
 */
export function DemoVideo() {
  return (
    <div className="reveal mx-auto w-full max-w-5xl overflow-hidden rounded-card border border-border bg-[#0b1438] shadow-raised">
      <video
        className="block aspect-video w-full"
        controls
        playsInline
        preload="none"
        poster="/videos/menao-film-pro.webp"
        aria-label={t.label}
      >
        <source src="/videos/menao-film-pro.mp4" type="video/mp4" />
        <track kind="captions" src="/videos/menao-film-pro.vtt" srcLang="fr" label={t.captions} />
        {t.fallback}
      </video>
    </div>
  );
}
