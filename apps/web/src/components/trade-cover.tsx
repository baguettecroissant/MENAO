import { fr } from "@/i18n/fr";
import { TRADE_IMAGES, tradeSrcSet } from "@/lib/site/images";

/**
 * Image du métier affichée quand l'artisan n'a pas encore de photo (lot 61) : jamais présentée
 * comme une réalisation, toujours marquée « Image d'illustration ».
 */
export function TradeCover({
  code,
  label,
  className = "",
}: {
  code: string;
  label: string;
  className?: string;
}) {
  const image = TRADE_IMAGES[code];
  if (!image) return null;
  return (
    <div className={`relative overflow-hidden bg-primary-softer ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- images non optimisées par Vercel (spec §4.4) */}
      <img
        src={image}
        srcSet={tradeSrcSet(code)}
        sizes="(min-width: 768px) 320px, 100vw"
        alt=""
        loading="lazy"
        className="size-full object-cover"
      />
      <span className="absolute top-2 right-2 rounded-md bg-black/55 px-2 py-1 text-[0.6875rem] font-semibold text-white">
        {fr.tradeCover.label(label)}
      </span>
    </div>
  );
}
