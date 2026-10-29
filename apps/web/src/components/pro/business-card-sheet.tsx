import { Phone } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { fr } from "@/i18n/fr";

const t = fr.pro.businessCards;

/** 10 cartes de 85 × 55 mm (2 colonnes, 5 rangées) sur une feuille A4. */
const CARDS = Array.from({ length: 10 }, (_, i) => i);

/**
 * Planche de cartes de visite (ADR 0161) : nom, métier, téléphone et QR code de la fiche publique.
 * Couleurs fixes, pensées pour l'impression, quel que soit le thème de l'écran.
 */
export function BusinessCardSheet({
  card,
  qr,
  qrAlt = t.qrAlt,
  scan = t.scan,
}: {
  card: {
    name: string;
    person: string | null;
    trade: string | null;
    phone: string | null;
    /** Domaine du site, sous le QR code. */
    host: string;
  };
  qr: { size: number; path: string };
  /** Texte du QR code et légende dessous (cartes des commerciaux, ADR 0205). */
  qrAlt?: string;
  scan?: string;
}) {
  return (
    <div className="overflow-x-auto print:overflow-visible">
      <ul
        className="mx-auto grid w-[170mm] grid-cols-[85mm_85mm] bg-white text-[#111728] shadow-card print:shadow-none"
        aria-label={t.title}
      >
        {CARDS.map((i) => (
          <li
            key={i}
            className="flex h-[55mm] w-[85mm] items-center gap-[4mm] border border-dashed border-[#c9cfdb] p-[5mm] print:break-inside-avoid"
          >
            <div className="flex h-full min-w-0 flex-1 flex-col justify-between">
              <Logo className="origin-left scale-75" />
              <div className="flex min-w-0 flex-col gap-[1mm]">
                <p className="truncate text-[11pt] leading-tight font-semibold">{card.name}</p>
                {card.person && <p className="truncate text-[8.5pt]">{card.person}</p>}
                {card.trade && <p className="truncate text-[8.5pt] text-[#4a5468]">{card.trade}</p>}
                {card.phone && (
                  <p className="flex items-center gap-[1.5mm] text-[8.5pt] font-medium">
                    <Phone aria-hidden="true" className="size-[3mm]" />
                    {card.phone}
                  </p>
                )}
              </div>
            </div>
            <figure className="flex w-[27mm] shrink-0 flex-col items-center gap-[1mm]">
              <svg
                viewBox={`0 0 ${qr.size} ${qr.size}`}
                role="img"
                aria-label={qrAlt}
                className="size-[27mm]"
                shapeRendering="crispEdges"
              >
                <path d={qr.path} fill="#111728" />
              </svg>
              <figcaption className="text-center text-[6.5pt] leading-tight text-[#4a5468]">
                {scan}
                <span className="block font-medium text-[#111728]">{card.host}</span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </div>
  );
}
