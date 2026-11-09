import { Check, Phone } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { fr } from "@/i18n/fr";

const t = fr.pro.businessCards;

/** 10 cartes de 85 × 55 mm (2 colonnes, 5 rangées) sur une feuille A4. */
const CARDS = Array.from({ length: 10 }, (_, i) => i);

export const CARD_MODELS = ["nuit", "clair", "sobre"] as const;
export type CardModel = (typeof CARD_MODELS)[number];

export function isCardModel(value: unknown): value is CardModel {
  return typeof value === "string" && (CARD_MODELS as readonly string[]).includes(value);
}

export type BusinessCardData = {
  name: string;
  person: string | null;
  trade: string | null;
  phone: string | null;
  /** Domaine du site, sous le QR code. */
  host: string;
  /** Logo des documents (URL signée), à la place des initiales (ADR 0038). */
  logoUrl?: string | null;
  /** Badge « Artisan vérifié » (modèle Clair) : jamais sur les cartes des commerciaux. */
  verified?: boolean;
};

type Qr = { size: number; path: string };

// Couleurs fixes, pensées pour l'impression, quel que soit le thème de l'écran.
const NUIT = "#111728";
const MUTED = "#4a5263";
const BLUE = "#4869f6";
const BLUE_STRONG = "#3451d1";
const BLUE_SOFT = "#e4eafd";
const GREEN = "#17784e";
const GREEN_SOFT = "#e8f4ee";

/** Initiales de l'entreprise, à défaut de logo : deux lettres au plus. */
export function cardInitials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/[\s'-]+/)
    .filter(Boolean);
  const letters = words.length >= 2 ? words[0]![0]! + words[1]![0]! : (words[0] ?? "").slice(0, 2);
  return letters.toLocaleUpperCase("fr");
}

function Badge({ card, background }: { card: BusinessCardData; background: string }) {
  if (card.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire, sans optimisation Vercel (spec §4.4)
      <img src={card.logoUrl} alt="" className="h-[9mm] max-w-[30mm] object-contain object-left" />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex size-[9mm] items-center justify-center rounded-[2mm] font-display text-[11pt] font-bold tracking-tight text-white"
      style={{ background }}
    >
      {cardInitials(card.name)}
    </span>
  );
}

function Identity({ card, sub }: { card: BusinessCardData; sub: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-[0.6mm]">
      <p className="truncate font-display text-[12pt] leading-tight font-bold tracking-tight">
        {card.name}
      </p>
      {card.person && <p className="truncate text-[7.5pt] font-semibold">{card.person}</p>}
      {card.trade && (
        <p className="truncate text-[7pt]" style={{ color: sub }}>
          {card.trade}
        </p>
      )}
    </div>
  );
}

function PhoneLine({ phone, color }: { phone: string | null; color: string }) {
  if (!phone) return null;
  return (
    <p className="flex items-center gap-[1.2mm] text-[7.5pt] font-semibold" style={{ color }}>
      <Phone aria-hidden="true" className="size-[2.6mm]" />
      {phone}
    </p>
  );
}

function QrCode({ qr, alt, size = "22mm" }: { qr: Qr; alt: string; size?: string }) {
  return (
    <svg
      viewBox={`0 0 ${qr.size} ${qr.size}`}
      role="img"
      aria-label={alt}
      style={{ width: size, height: size }}
      shapeRendering="crispEdges"
    >
      <path d={qr.path} fill={NUIT} />
    </svg>
  );
}

function Site({ host, white = false }: { host: string; white?: boolean }) {
  return (
    <span className="flex items-center gap-[1mm] text-[6.5pt] font-bold">
      <LogoMark tone={white ? "white" : "brand"} className="h-[2.6mm] w-[3mm]" />
      {host}
    </span>
  );
}

/**
 * Une carte, face unique (recto et QR code ensemble), au modèle choisi (ADR 0263) : Nuit (panneau
 * bleu nuit du QR code), Clair (fond bleu clair, badge « Artisan vérifié ») ou Sobre (blanc).
 */
export function BusinessCard({
  model,
  card,
  qr,
  qrAlt = t.qrAlt,
  scan = t.scan,
}: {
  model: CardModel;
  card: BusinessCardData;
  qr: Qr;
  qrAlt?: string;
  scan?: string;
}) {
  const caption = (color: string) => (
    <span className="max-w-[28mm] text-center text-[5.5pt] leading-tight" style={{ color }}>
      {scan}
    </span>
  );

  if (model === "nuit") {
    return (
      <div className="flex h-[55mm] w-[85mm] bg-white text-[#111728]">
        <div className="flex min-w-0 flex-1 flex-col justify-between p-[5mm]">
          <Badge card={card} background={NUIT} />
          <div className="flex min-w-0 flex-col gap-[2mm]">
            <Identity card={card} sub={MUTED} />
            <PhoneLine phone={card.phone} color={NUIT} />
          </div>
        </div>
        <div
          className="flex w-[33mm] shrink-0 flex-col items-center justify-center gap-[1.6mm] px-[2mm] text-white"
          style={{ background: NUIT }}
        >
          <span className="rounded-[1.6mm] bg-white p-[1.4mm]">
            <QrCode qr={qr} alt={qrAlt} size="21mm" />
          </span>
          {caption("rgb(255 255 255 / 0.75)")}
          <Site host={card.host} white />
        </div>
      </div>
    );
  }

  if (model === "clair") {
    return (
      <div
        className="flex h-[55mm] w-[85mm] items-center gap-[4mm] p-[5mm] text-[#111728]"
        style={{ background: BLUE_SOFT }}
      >
        <div className="flex h-full min-w-0 flex-1 flex-col justify-between">
          {card.verified ? (
            <span
              className="flex items-center gap-[0.8mm] self-start rounded-full px-[1.8mm] py-[0.7mm] text-[6pt] font-bold"
              style={{ background: GREEN_SOFT, color: GREEN }}
            >
              <Check aria-hidden="true" className="size-[2.4mm]" strokeWidth={3} />
              {t.verified}
            </span>
          ) : (
            <Badge card={card} background={BLUE} />
          )}
          <div className="flex min-w-0 flex-col gap-[2mm]">
            <Identity card={card} sub="#2b3242" />
            <PhoneLine phone={card.phone} color={BLUE_STRONG} />
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-[1.2mm]">
          <span className="rounded-[1.6mm] bg-white p-[1.4mm]">
            <QrCode qr={qr} alt={qrAlt} size="21mm" />
          </span>
          {caption("#2b3242")}
          <span style={{ color: BLUE_STRONG }}>
            <Site host={card.host} />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[55mm] w-[85mm] items-center gap-[4mm] bg-white p-[5mm] text-[#111728]">
      <div className="flex min-w-0 flex-1 flex-col gap-[2.4mm]">
        <Identity card={card} sub={MUTED} />
        <span aria-hidden="true" className="h-[0.5mm] w-[7mm]" style={{ background: NUIT }} />
        <PhoneLine phone={card.phone} color={NUIT} />
      </div>
      <div className="flex shrink-0 flex-col items-center gap-[1.2mm]">
        <QrCode qr={qr} alt={qrAlt} />
        {caption(MUTED)}
        <Site host={card.host} />
      </div>
    </div>
  );
}

/**
 * Planche de cartes de visite (ADR 0161, modèles : ADR 0263) : nom, métier, téléphone et QR code
 * de la fiche publique. Les couleurs sont imprimées telles quelles (print-color-adjust).
 */
export function BusinessCardSheet({
  card,
  qr,
  model = "nuit",
  qrAlt = t.qrAlt,
  scan = t.scan,
}: {
  card: BusinessCardData;
  qr: Qr;
  model?: CardModel;
  /** Texte du QR code et légende dessous (cartes des commerciaux, ADR 0205). */
  qrAlt?: string;
  scan?: string;
}) {
  return (
    <div className="overflow-x-auto print:overflow-visible">
      <ul
        className="mx-auto grid w-[170mm] grid-cols-[85mm_85mm] bg-white shadow-card [print-color-adjust:exact] print:shadow-none"
        style={{ WebkitPrintColorAdjust: "exact" }}
        aria-label={t.title}
      >
        {CARDS.map((i) => (
          <li
            key={i}
            className="h-[55mm] w-[85mm] overflow-hidden outline outline-1 -outline-offset-1 outline-dashed outline-[#c9cfdb] print:break-inside-avoid"
          >
            <BusinessCard model={model} card={card} qr={qr} qrAlt={qrAlt} scan={scan} />
          </li>
        ))}
      </ul>
    </div>
  );
}
