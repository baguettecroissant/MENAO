import type { CSSProperties, ReactNode } from "react";
import { Check, Phone } from "lucide-react";
import { fr } from "@/i18n/fr";

const t = fr.pro.businessCards;

/** 10 cartes de 85 × 55 mm (2 colonnes, 5 rangées) sur une feuille A4. */
const CARDS = Array.from({ length: 10 }, (_, i) => i);

/** Modèles aux couleurs de MENAO (maquette du lot 39), au choix de l'artisan. */
export const CARD_MODELS = ["signature", "sourire", "bleu", "label"] as const;
export type CardModel = (typeof CARD_MODELS)[number];
export type CardFace = "recto" | "verso";

export function isCardModel(value: unknown): value is CardModel {
  return typeof value === "string" && (CARD_MODELS as readonly string[]).includes(value);
}

export type BusinessCardData = {
  name: string;
  person: string | null;
  trade: string | null;
  phone: string | null;
  /** Domaine du site, au verso. */
  host: string;
  /** Logo des documents (URL signée), à la place des initiales (ADR 0038). */
  logoUrl?: string | null;
  /** Badge « Artisan vérifié » : jamais sur les cartes des commerciaux. */
  verified?: boolean;
};

type Qr = { size: number; path: string };

// Couleurs fixes, pensées pour l'impression, quel que soit le thème de l'écran.
const NUIT = "#0b1438";
const MUTED = "#4a5263";
const BLUE = "#4869f6";
const BLUE_LIGHT = "#86a0fb";
const GREEN = "#17784e";
const MINT = "#2bd17e";
const CREAM = "#f6f1e7";
const GRADIENT = "linear-gradient(135deg, #0b1438 0%, #16236e 55%, #3451d1 100%)";
const BLUE_GRADIENT = "linear-gradient(160deg, #6f8cfa 0%, #4869f6 45%, #2c43c2 100%)";

/**
 * Chaque face est dessinée sur 425 × 275 px (la maquette, 5 px par mm) puis ramenée à
 * 85 × 55 mm par zoom : vectoriel net à l'impression, proportions de la maquette conservées.
 */
const UNIT_W = 425;
const UNIT_H = 275;
const SCALE = (85 * 96) / 25.4 / UNIT_W;

/** Initiales de l'entreprise, à défaut de logo : deux lettres au plus. */
export function cardInitials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/[\s'-]+/)
    .filter(Boolean);
  const letters = words.length >= 2 ? words[0]![0]! + words[1]![0]! : (words[0] ?? "").slice(0, 2);
  return letters.toLocaleUpperCase("fr");
}

const display: CSSProperties = { fontFamily: "var(--font-display, 'Inter Tight', sans-serif)" };

/** Toit et sourire du logo (viewBox 32 × 28), d'une couleur. */
function Symbol({
  width,
  color,
  opacity = 1,
  weight = 1,
}: {
  width: number;
  color: string;
  opacity?: number;
  weight?: number;
}) {
  return (
    <svg viewBox="0 0 32 28" width={width} fill="none" aria-hidden="true" style={{ opacity }}>
      <path
        d="M9.5 10.5 16 5.5l6.5 5"
        stroke={color}
        strokeWidth={3.4 * weight}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 16.5c5.8 7.2 16.2 7.2 22 0"
        stroke={color}
        strokeWidth={4.6 * weight}
        strokeLinecap="round"
      />
    </svg>
  );
}

function Wordmark({ size, color }: { size: number; color: string }) {
  return (
    <span style={{ ...display, fontWeight: 700, fontSize: size, letterSpacing: "-0.03em", color }}>
      menao
    </span>
  );
}

function Logo({ size, color }: { size: number; color: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: Math.round(size * 0.3) }}>
      <Symbol width={Math.round(size * 1.15)} color={color} />
      <Wordmark size={size} color={color} />
    </span>
  );
}

function Verified({
  background,
  color,
  tick,
  tickColor,
}: {
  background: string;
  color: string;
  tick: string;
  tickColor: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignSelf: "flex-start",
        alignItems: "center",
        gap: 6,
        padding: "5px 11px 5px 6px",
        borderRadius: 999,
        background,
        color,
        fontSize: 12.5,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          background: tick,
          color: tickColor,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Check aria-hidden="true" size={12} strokeWidth={3.2} />
      </span>
      {t.verified}
    </span>
  );
}

function PhoneLine({ phone, color }: { phone: string | null; color: string }) {
  if (!phone) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        fontSize: 15,
        fontWeight: 700,
        color,
      }}
    >
      <Phone aria-hidden="true" size={14} strokeWidth={2.4} />
      {phone}
    </span>
  );
}

function QrCode({
  qr,
  alt,
  size,
  ink = NUIT,
}: {
  qr: Qr;
  alt: string;
  size: number;
  ink?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${qr.size} ${qr.size}`}
      role="img"
      aria-label={alt}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      style={{ display: "block" }}
    >
      <path d={qr.path} fill={ink} />
    </svg>
  );
}

/** Petit QR code du recto (lien vers la fiche même imprimée sur une seule face). */
function SmallQr({ qr, alt, position }: { qr: Qr; alt: string; position: CSSProperties }) {
  return (
    <div
      style={{
        position: "absolute",
        padding: 5,
        borderRadius: 10,
        background: "#ffffff",
        ...position,
      }}
    >
      <QrCode qr={qr} alt={alt} size={62} />
    </div>
  );
}

/** Logo de l'entreprise, ou ses initiales dans un carré. */
function Mark({
  card,
  size,
  background,
}: {
  card: BusinessCardData;
  size: number;
  background: string;
}) {
  if (card.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire, sans optimisation Vercel (spec §4.4)
      <img
        src={card.logoUrl}
        alt=""
        style={{ height: size, maxWidth: size * 3, objectFit: "contain", objectPosition: "left" }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{
        ...display,
        width: size,
        height: size,
        flex: "none",
        borderRadius: size * 0.28,
        background,
        color: "#fff",
        fontWeight: 800,
        fontSize: size * 0.38,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {cardInitials(card.name)}
    </span>
  );
}

const subline = (card: BusinessCardData) => [card.person, card.trade].filter(Boolean).join(" · ");

function Face({ background, children }: { background: string; children: ReactNode }) {
  return (
    <div
      className="relative h-[55mm] w-[85mm] overflow-hidden [print-color-adjust:exact]"
      style={{ background, WebkitPrintColorAdjust: "exact" }}
    >
      {/* zoom (et non transform) : la mise en page et le découpage des pages à l'impression
          suivent la taille réelle de la carte. */}
      <div className="absolute top-0 left-0" style={{ width: UNIT_W, height: UNIT_H, zoom: SCALE }}>
        {children}
      </div>
    </div>
  );
}

const fill: CSSProperties = { position: "absolute", inset: 0 };

type FaceProps = {
  card: BusinessCardData;
  qr: Qr;
  qrAlt: string;
  scan: string;
  scanHint: string | null;
  uid: string;
};

// ------------------------------------------------------------------ 1. Signature
function SignatureRecto({ card, qrAlt, qr }: FaceProps) {
  return (
    <Face background={GRADIENT}>
      <div style={{ position: "absolute", right: -70, bottom: -78 }}>
        <Symbol width={330} color="#ffffff" opacity={0.09} weight={1.1} />
      </div>
      <div
        style={{
          ...fill,
          padding: "26px 28px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {card.logoUrl ? (
            <Mark card={card} size={30} background="#fff" />
          ) : (
            <Logo size={19} color="#fff" />
          )}
          {card.verified && (
            <Verified
              background="rgb(255 255 255 / 0.14)"
              color="#fff"
              tick={MINT}
              tickColor={NUIT}
            />
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingRight: 80 }}>
          <b style={{ ...display, fontSize: 30, letterSpacing: "-0.03em", lineHeight: 1 }}>
            {card.name}
          </b>
          {subline(card) && (
            <span style={{ fontSize: 14, color: "rgb(255 255 255 / 0.78)" }}>{subline(card)}</span>
          )}
          <span style={{ marginTop: 8 }}>
            <PhoneLine phone={card.phone} color="#fff" />
          </span>
        </div>
      </div>
      <SmallQr qr={qr} alt={qrAlt} position={{ right: 22, bottom: 22 }} />
    </Face>
  );
}

function SignatureVerso({ card, qr, qrAlt, scan, scanHint }: FaceProps) {
  return (
    <Face background="#ffffff">
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 64,
          background: GRADIENT,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 24,
          right: 24,
          bottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Logo size={17} color="#fff" />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{card.host}</span>
      </div>
      <div
        style={{
          position: "absolute",
          inset: "0 0 64px",
          padding: "22px 26px",
          display: "flex",
          alignItems: "center",
          gap: 22,
        }}
      >
        <div
          style={{
            padding: 8,
            borderRadius: 14,
            background: "#fff",
            boxShadow: "0 0 0 1.5px #e3e7f5",
          }}
        >
          <QrCode qr={qr} alt={qrAlt} size={132} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <b
            style={{
              ...display,
              fontSize: 20,
              letterSpacing: "-0.02em",
              color: NUIT,
              lineHeight: 1.15,
            }}
          >
            {scan}
          </b>
          {scanHint && (
            <span style={{ fontSize: 13, color: MUTED, lineHeight: 1.4 }}>{scanHint}</span>
          )}
        </div>
      </div>
    </Face>
  );
}

// ------------------------------------------------------------------ 2. Sourire
function SourireRecto({ card, qrAlt, qr, uid }: FaceProps) {
  const id = `sourire-${uid}`;
  return (
    <Face background="#ffffff">
      <svg
        viewBox={`0 0 ${UNIT_W} ${UNIT_H}`}
        width={UNIT_W}
        height={UNIT_H}
        style={fill}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <stop stopColor={BLUE_LIGHT} />
            <stop offset="1" stopColor="#3451d1" />
          </linearGradient>
        </defs>
        <path
          d="M-30 196 C 90 300, 335 300, 455 196"
          stroke={`url(#${id})`}
          strokeWidth={46}
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          ...fill,
          padding: "24px 108px 24px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <Mark card={card} size={42} background={NUIT} />
          <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <b
              style={{
                ...display,
                fontSize: 22,
                letterSpacing: "-0.03em",
                color: NUIT,
                lineHeight: 1,
              }}
            >
              {card.name}
            </b>
            {subline(card) && <span style={{ fontSize: 12.5, color: MUTED }}>{subline(card)}</span>}
          </span>
        </span>
        <PhoneLine phone={card.phone} color={NUIT} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 24,
          display: "flex",
          justifyContent: "center",
        }}
      >
        {card.verified ? (
          <Verified background="#ffffff" color={NUIT} tick={GREEN} tickColor="#ffffff" />
        ) : (
          <span style={{ padding: "4px 12px", borderRadius: 999, background: "#fff" }}>
            <Logo size={15} color={NUIT} />
          </span>
        )}
      </div>
      <SmallQr
        qr={qr}
        alt={qrAlt}
        position={{ right: 22, top: 22, boxShadow: "0 0 0 1.5px #e3e7f5" }}
      />
    </Face>
  );
}

function SourireVerso({ qr, qrAlt, scan }: FaceProps) {
  return (
    <Face background={BLUE_GRADIENT}>
      <div
        style={{
          ...fill,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 30,
          padding: "0 28px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <Symbol width={118} color="#ffffff" />
          <Wordmark size={34} color="#fff" />
        </div>
        <div style={{ width: 1, height: 150, background: "rgb(255 255 255 / 0.25)" }} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{ padding: 7, borderRadius: 14, background: "#fff" }}>
            <QrCode qr={qr} alt={qrAlt} size={112} />
          </div>
          <span
            style={{
              maxWidth: 150,
              fontSize: 12,
              fontWeight: 600,
              color: "rgb(255 255 255 / 0.85)",
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            {scan}
          </span>
        </div>
      </div>
    </Face>
  );
}

// ------------------------------------------------------------------ 3. Bleu vif
function BleuRecto({ card, qrAlt, qr }: FaceProps) {
  return (
    <Face background={BLUE}>
      <div style={{ position: "absolute", left: -46, top: 30 }}>
        <Symbol width={230} color="#ffffff" opacity={0.16} weight={1.2} />
      </div>
      <div
        style={{
          ...fill,
          padding: "24px 28px 24px 168px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 8,
          color: "#fff",
        }}
      >
        {card.trade && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "rgb(255 255 255 / 0.75)",
              textTransform: "uppercase",
            }}
          >
            {card.trade}
          </span>
        )}
        <b style={{ ...display, fontSize: 30, letterSpacing: "-0.03em", lineHeight: 1.05 }}>
          {card.name}
        </b>
        {card.person && (
          <span style={{ fontSize: 14, color: "rgb(255 255 255 / 0.85)" }}>{card.person}</span>
        )}
        <span style={{ marginTop: 6 }}>
          <PhoneLine phone={card.phone} color="#fff" />
        </span>
      </div>
      <div style={{ position: "absolute", left: 26, bottom: 22 }}>
        {card.logoUrl ? (
          <Mark card={card} size={28} background="#fff" />
        ) : (
          <Wordmark size={20} color="#fff" />
        )}
      </div>
      <SmallQr qr={qr} alt={qrAlt} position={{ right: 22, bottom: 22 }} />
    </Face>
  );
}

function BleuVerso({ card, qr, qrAlt, scan }: FaceProps) {
  return (
    <Face background={NUIT}>
      <div
        style={{ ...fill, padding: "24px 28px", display: "flex", alignItems: "center", gap: 24 }}
      >
        <div style={{ padding: 8, borderRadius: 14, background: "#fff" }}>
          <QrCode qr={qr} alt={qrAlt} size={128} />
        </div>
        <div
          style={{ display: "flex", flexDirection: "column", gap: 10, color: "#fff", minWidth: 0 }}
        >
          {card.verified && (
            <Verified background={BLUE} color="#fff" tick="#ffffff" tickColor={BLUE} />
          )}
          <b style={{ ...display, fontSize: 19, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            {scan}
          </b>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Symbol width={26} color={BLUE_LIGHT} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>{card.host}</span>
          </span>
        </div>
      </div>
    </Face>
  );
}

// ------------------------------------------------------------------ 4. Label
/** Sceau rond « Artisan vérifié · MENAO » avec le symbole au centre. */
function Seal({ size, uid }: { size: number; uid: string }) {
  const r = size / 2;
  const id = `sceau-${uid}`;
  const inner = r - 14;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
      <defs>
        <path
          id={id}
          d={`M ${r},${r} m -${inner},0 a ${inner},${inner} 0 1,1 ${2 * inner},0 a ${inner},${inner} 0 1,1 -${2 * inner},0`}
        />
      </defs>
      <circle cx={r} cy={r} r={r - 2} fill={NUIT} />
      <circle
        cx={r}
        cy={r}
        r={r - 6}
        fill="none"
        stroke="#ffffff"
        strokeWidth={1.2}
        opacity={0.5}
      />
      <text
        fontSize={size * 0.085}
        fontWeight={800}
        letterSpacing={2.2}
        fill="#ffffff"
        fontFamily="Inter, sans-serif"
      >
        <textPath href={`#${id}`}>{t.seal}</textPath>
      </text>
      <g transform={`translate(${r - size * 0.2} ${r - size * 0.17}) scale(${(size * 0.4) / 32})`}>
        <path
          d="M9.5 10.5 16 5.5l6.5 5"
          stroke="#ffffff"
          strokeWidth={3.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M5 16.5c5.8 7.2 16.2 7.2 22 0"
          stroke="#ffffff"
          strokeWidth={4.6}
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

function LabelRecto({ card, qrAlt, qr, uid }: FaceProps) {
  const grid = `grille-${uid}`;
  return (
    <Face background={CREAM}>
      <svg width={UNIT_W} height={UNIT_H} style={{ ...fill, opacity: 0.55 }} aria-hidden="true">
        <defs>
          <pattern id={grid} width="17" height="17" patternUnits="userSpaceOnUse">
            <path d="M17 0H0V17" fill="none" stroke="#d9cfbb" strokeWidth={0.8} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${grid})`} />
      </svg>
      <div style={{ position: "absolute", right: 22, top: 22, transform: "rotate(-12deg)" }}>
        {card.verified ? <Seal size={112} uid={uid} /> : <Symbol width={70} color={NUIT} />}
      </div>
      <div
        style={{
          ...fill,
          padding: "26px 28px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10, maxWidth: 250 }}>
          {card.logoUrl && <Mark card={card} size={28} background={NUIT} />}
          {card.trade && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: BLUE,
                textTransform: "uppercase",
              }}
            >
              {card.trade}
            </span>
          )}
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingRight: 80 }}>
          <b
            style={{
              ...display,
              fontSize: 30,
              letterSpacing: "-0.03em",
              color: NUIT,
              lineHeight: 1,
            }}
          >
            {card.name}
          </b>
          {card.person && <span style={{ fontSize: 14, color: "#5b5547" }}>{card.person}</span>}
          <span style={{ marginTop: 6 }}>
            <PhoneLine phone={card.phone} color={NUIT} />
          </span>
        </div>
      </div>
      <SmallQr qr={qr} alt={qrAlt} position={{ right: 22, bottom: 22 }} />
    </Face>
  );
}

function LabelVerso({ card, qr, qrAlt, scan }: FaceProps) {
  return (
    <Face background={NUIT}>
      <div
        style={{
          ...fill,
          padding: "24px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 18,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12, color: "#fff" }}>
          <Logo size={26} color="#fff" />
          <b
            style={{
              ...display,
              fontSize: 18,
              letterSpacing: "-0.02em",
              lineHeight: 1.25,
              maxWidth: 170,
            }}
          >
            {scan}
          </b>
          <span style={{ fontSize: 12.5, color: "rgb(255 255 255 / 0.7)" }}>{card.host}</span>
        </div>
        <div style={{ padding: 9, borderRadius: 14, background: CREAM }}>
          <QrCode qr={qr} alt={qrAlt} size={126} />
        </div>
      </div>
    </Face>
  );
}

const FACES: Record<CardModel, Record<CardFace, (props: FaceProps) => ReactNode>> = {
  signature: { recto: SignatureRecto, verso: SignatureVerso },
  sourire: { recto: SourireRecto, verso: SourireVerso },
  bleu: { recto: BleuRecto, verso: BleuVerso },
  label: { recto: LabelRecto, verso: LabelVerso },
};

/**
 * Une face de carte (85 × 55 mm) au modèle choisi (ADR 0299) : Signature, Sourire, Bleu vif ou
 * Label. Le recto porte l'entreprise, le verso le QR code de la fiche.
 */
export function BusinessCard({
  model,
  card,
  qr,
  face = "recto",
  qrAlt = t.qrAlt,
  scan = t.scan,
  scanHint = t.scanHint,
  uid = "carte",
}: {
  model: CardModel;
  card: BusinessCardData;
  qr: Qr;
  face?: CardFace;
  qrAlt?: string;
  scan?: string;
  /** Phrase sous le QR code (modèle Signature) ; null pour la retirer (cartes des commerciaux). */
  scanHint?: string | null;
  /** Identifiant unique des dégradés et motifs SVG de cette carte dans la page. */
  uid?: string;
}) {
  const Render = FACES[model][face];
  return (
    <Render
      card={card}
      qr={qr}
      qrAlt={qrAlt}
      scan={scan}
      scanHint={scanHint}
      uid={`${uid}-${face}`}
    />
  );
}

/**
 * Planche A4 de 10 cartes, recto puis verso sur deux pages : à imprimer en recto-verso (bord long),
 * à 100 %. Les cartes sont identiques : le verso tombe au dos de son recto.
 */
export function BusinessCardSheet({
  card,
  qr,
  model = "signature",
  qrAlt = t.qrAlt,
  scan = t.scan,
  scanHint = t.scanHint,
}: {
  card: BusinessCardData;
  qr: Qr;
  model?: CardModel;
  qrAlt?: string;
  scan?: string;
  scanHint?: string | null;
}) {
  return (
    <div className="flex flex-col gap-6 print:block">
      {(["recto", "verso"] as const).map((face) => (
        <ul
          key={face}
          className="mx-auto grid w-[170mm] grid-cols-[85mm_85mm] bg-white shadow-card [print-color-adjust:exact] print:break-after-page print:shadow-none"
          style={{ WebkitPrintColorAdjust: "exact" }}
          aria-label={`${t.title} : ${t.faces[face]}`}
        >
          {CARDS.map((i) => (
            <li
              key={i}
              className="h-[55mm] w-[85mm] overflow-hidden outline outline-1 -outline-offset-1 outline-dashed outline-[#c9cfdb] print:break-inside-avoid"
            >
              <BusinessCard
                model={model}
                face={face}
                card={card}
                qr={qr}
                qrAlt={qrAlt}
                scan={scan}
                scanHint={scanHint}
                uid={`planche-${i}`}
              />
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}
