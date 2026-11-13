import { Check, Phone } from "lucide-react-native";
import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
  type TextStyle,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Pattern,
  Rect,
  Stop,
  Text as SvgText,
  TextPath,
} from "react-native-svg";
import { Segmented } from "@/components/segmented";
import { fr } from "@/i18n/fr";
import type { BusinessCardInfo } from "@/lib/business-card";
import { qrPath } from "@/lib/qr";
import { theme } from "@/ui/theme";

const c = fr.proHub.share.card;
const { colors, font, radius, spacing } = theme;

/** Modèles du lot 39, dans l'ordre du site (`business-card-sheet.tsx`) : Signature par défaut. */
export type CardModel = "signature" | "sourire" | "bleu" | "label";
type Face = "recto" | "verso";

/** Verso d'abord : c'est lui que le client scanne. */
const FACES: readonly Face[] = ["verso", "recto"];
const MODELS: readonly CardModel[] = ["signature", "sourire", "bleu", "label"];

/**
 * Chaque face est dessinée sur 425 × 275 (la maquette du lot 39, 5 px par mm, comme le site) puis
 * ramenée à la largeur disponible : chaque dimension est multipliée par largeur / 425.
 */
const UNIT_W = 425;
const UNIT_H = 275;
/** Format d'une carte de visite : 85 × 55 mm. */
const RATIO = UNIT_H / UNIT_W;

// Couleurs fixes de la maquette, quel que soit le thème de l'écran (mêmes valeurs que le site).
const WHITE = "#ffffff";
const NUIT = "#0b1438";
const MUTED = "#4a5263";
const BLUE = "#4869f6";
const BLUE_LIGHT = "#86a0fb";
const GREEN = "#17784e";
const MINT = "#2bd17e";
const CREAM = "#f6f1e7";

type Stops = readonly (readonly [offset: number, color: string])[];
/** `linear-gradient(135deg, #0b1438 0%, #16236e 55%, #3451d1 100%)` du site. */
const GRADIENT = {
  angle: 135,
  stops: [
    [0, NUIT],
    [0.55, "#16236e"],
    [1, "#3451d1"],
  ] as Stops,
};
/** `linear-gradient(160deg, #6f8cfa 0%, #4869f6 45%, #2c43c2 100%)` du site. */
const BLUE_GRADIENT = {
  angle: 160,
  stops: [
    [0, "#6f8cfa"],
    [0.45, BLUE],
    [1, "#2c43c2"],
  ] as Stops,
};

const ROOF = "M9.5 10.5 16 5.5l6.5 5";
const SMILE = "M5 16.5c5.8 7.2 16.2 7.2 22 0";

type CardData = {
  info: BusinessCardInfo;
  pageUrl: string;
  /** Domaine du site (« menao.fr »). */
  domain: string;
  verified: boolean;
  /** Logo des documents (URL signée), à la place des initiales (ADR 0038). */
  logoUrl?: string | null;
};

/**
 * Carte de visite aux couleurs de MENAO (lot 39, mêmes modèles que le site), au format 85 × 55 :
 * verso (QR code de la fiche) visible d'abord, recto au balayage ou par les points ; quatre
 * modèles (Signature, Sourire, Bleu vif, Label). Un toucher sur la carte appelle `onExpand` (QR
 * code en plein écran). Rien sur l'impression ni l'achat (règle 10).
 */
export function BusinessCardViewer({ onExpand, ...data }: CardData & { onExpand: () => void }) {
  const [model, setModel] = useState<CardModel>("signature");
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const scroll = useRef<ScrollViewInstance>(null);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== page && next >= 0 && next < FACES.length) setPage(next);
  };
  const show = (index: number) => {
    scroll.current?.scrollTo({ x: index * width, animated: true });
    setPage(index);
  };
  const other = FACES[page === 0 ? 1 : 0] ?? "recto";

  return (
    <View style={styles.viewer}>
      <View onLayout={(event) => setWidth(Math.floor(event.nativeEvent.layout.width))}>
        {width ? (
          <ScrollView
            ref={scroll}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            style={{ width, height: Math.round(width * RATIO) }}
          >
            {FACES.map((face) => (
              <Pressable
                key={face}
                role="button"
                aria-label={c.cardLabel(c.models[model], c.faces[face])}
                accessibilityHint={c.expandHint}
                onPress={onExpand}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <CardFace {...data} model={model} face={face} width={width} />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </View>

      <View style={styles.dots} aria-label={c.facesLabel}>
        {FACES.map((face, index) => (
          <Pressable
            key={face}
            role="button"
            aria-label={c.showFace(c.faces[face])}
            aria-selected={index === page}
            hitSlop={10}
            onPress={() => show(index)}
            style={styles.dotHit}
          >
            <View style={[styles.dot, index === page && styles.dotOn]} />
          </Pressable>
        ))}
      </View>
      <Text style={styles.hint}>{c.swipe[other]}</Text>

      <Segmented
        label={c.modelLabel}
        options={MODELS.map((value) => ({ value, label: c.models[value] }))}
        value={model}
        onChange={setModel}
      />
    </View>
  );
}

type FaceProps = CardData & {
  /** Dimension de la maquette (repère 425 × 275) → dimension à l'écran. */
  z: (n: number) => number;
  width: number;
  height: number;
  /** Préfixe unique des dégradés et motifs SVG de cette face. */
  uid: string;
};

const RENDER: Record<CardModel, Record<Face, (props: FaceProps) => ReactNode>> = {
  signature: { recto: SignatureRecto, verso: SignatureVerso },
  sourire: { recto: SourireRecto, verso: SourireVerso },
  bleu: { recto: BleuRecto, verso: BleuVerso },
  label: { recto: LabelRecto, verso: LabelVerso },
};

/** Une face de la carte, dessinée dans le repère de la maquette puis mise à la largeur donnée. */
function CardFace({
  model,
  face,
  width,
  ...data
}: CardData & { model: CardModel; face: Face; width: number }) {
  const uid = `${useId().replace(/[^a-zA-Z0-9]/g, "")}${model}${face}`;
  const k = width / UNIT_W;
  const height = Math.round(width * RATIO);
  const Render = RENDER[model][face];
  return (
    <View style={[styles.face, { width, height, borderRadius: 16 * k }]}>
      <Render {...data} z={(n) => n * k} width={width} height={height} uid={uid} />
    </View>
  );
}

// ------------------------------------------------------------------ Briques communes

/** Extrémités d'un `linear-gradient(<angle>deg, …)` CSS sur une boîte, en coordonnées SVG. */
function cssGradientLine(angle: number, x: number, y: number, w: number, h: number) {
  const a = (angle * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
  const cx = x + w / 2;
  const cy = y + h / 2;
  return { x1: cx - dx * half, y1: cy - dy * half, x2: cx + dx * half, y2: cy + dy * half };
}

/** Fond de la face (couleur ou dégradé CSS du site), avec d'éventuels motifs SVG par-dessus. */
function Backdrop({
  width,
  height,
  color,
  gradient,
  box = { x: 0, y: 0, w: UNIT_W, h: UNIT_H },
  uid,
}: {
  width: number;
  height: number;
  color?: string;
  gradient?: { angle: number; stops: Stops };
  /** Zone du dégradé dans le repère 425 × 275 (toute la carte par défaut). */
  box?: { x: number; y: number; w: number; h: number };
  uid: string;
}) {
  const id = `${uid}bg`;
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${UNIT_W} ${UNIT_H}`}
      style={StyleSheet.absoluteFill}
      aria-hidden
    >
      {color ? <Rect width={UNIT_W} height={UNIT_H} fill={color} /> : null}
      {gradient ? (
        <>
          <Defs>
            <LinearGradient
              id={id}
              {...cssGradientLine(gradient.angle, box.x, box.y, box.w, box.h)}
              gradientUnits="userSpaceOnUse"
            >
              {gradient.stops.map(([offset, stop]) => (
                <Stop key={offset} offset={offset} stopColor={stop} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x={box.x} y={box.y} width={box.w} height={box.h} fill={`url(#${id})`} />
        </>
      ) : null}
    </Svg>
  );
}

/** Toit et sourire du logo (viewBox 32 × 28), d'une couleur ; `width` déjà à l'échelle. */
function LogoSymbol({
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
    <Svg width={width} height={(width * 28) / 32} viewBox="0 0 32 28" fill="none" aria-hidden>
      <G opacity={opacity}>
        <Path
          d={ROOF}
          stroke={color}
          strokeWidth={3.4 * weight}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path d={SMILE} stroke={color} strokeWidth={4.6 * weight} strokeLinecap="round" />
      </G>
    </Svg>
  );
}

/** Texte de la carte : taille et interligne dans le repère de la maquette. */
function cardText(
  z: FaceProps["z"],
  family: string,
  size: number,
  lineHeight: number,
  color: string,
  letterSpacing = 0,
): TextStyle {
  return {
    fontFamily: family,
    fontSize: z(size),
    lineHeight: z(size * lineHeight),
    letterSpacing: z(size * letterSpacing),
    color,
  };
}

/** Interligne des grands titres : 1 sur le site, un peu plus pour ne pas rogner les jambages. */
const TIGHT = 1.1;
/** Interligne par défaut du site (Tailwind). */
const NORMAL = 1.5;

function Wordmark({ z, size, color }: { z: FaceProps["z"]; size: number; color: string }) {
  return (
    <Text aria-hidden style={cardText(z, font.display, size, NORMAL, color, -0.03)}>
      {fr.logoWordmark}
    </Text>
  );
}

/** Logo MENAO complet (symbole puis « menao »), lu « MENAO ». */
function Logo({ z, size, color }: { z: FaceProps["z"]; size: number; color: string }) {
  return (
    <View role="img" aria-label={fr.brand} style={[styles.row, { gap: z(Math.round(size * 0.3)) }]}>
      <LogoSymbol width={z(Math.round(size * 1.15))} color={color} />
      <Wordmark z={z} size={size} color={color} />
    </View>
  );
}

/** Badge « Artisan vérifié » : pastille ronde à coche puis le texte. */
function Verified({
  z,
  background,
  color,
  tick,
  tickColor,
  stretch = false,
}: {
  z: FaceProps["z"];
  background: string;
  color: string;
  tick: string;
  tickColor: string;
  /** Étiré sur la largeur de sa colonne (verso Bleu vif de la maquette). */
  stretch?: boolean;
}) {
  return (
    <View
      style={[
        styles.row,
        {
          alignSelf: stretch ? "stretch" : "flex-start",
          gap: z(6),
          paddingVertical: z(5),
          paddingLeft: z(6),
          paddingRight: z(11),
          borderRadius: radius.pill,
          backgroundColor: background,
        },
      ]}
    >
      <View
        style={[
          styles.center,
          { width: z(18), height: z(18), borderRadius: z(9), backgroundColor: tick },
        ]}
      >
        <Check size={z(12)} color={tickColor} strokeWidth={3.2} />
      </View>
      <Text style={cardText(z, font.bold, 12.5, NORMAL, color)} numberOfLines={1}>
        {c.verified}
      </Text>
    </View>
  );
}

function PhoneLine({
  z,
  phone,
  color,
}: {
  z: FaceProps["z"];
  phone: string | null;
  color: string;
}) {
  if (!phone) return null;
  return (
    <View style={[styles.row, { gap: z(7), alignSelf: "flex-start" }]}>
      <Phone size={z(14)} color={color} strokeWidth={2.4} />
      <Text style={cardText(z, font.bold, 15, NORMAL, color)} numberOfLines={1}>
        {phone}
      </Text>
    </View>
  );
}

/** QR code de la fiche, sans fond (le cadre de la carte le porte) ; `size` déjà à l'échelle. */
function CardQr({ value, size, ink = NUIT }: { value: string; size: number; ink?: string }) {
  const qr = useMemo(() => qrPath(value), [value]);
  return (
    <View role="img" aria-label={c.qrLabel} style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${qr.size} ${qr.size}`}>
        <Path d={qr.path} fill={ink} />
      </Svg>
    </View>
  );
}

/** Logo de l'entreprise, calé à gauche, à sa hauteur et dans sa proportion. */
function CompanyLogo({ uri, height, maxWidth }: { uri: string; height: number; maxWidth: number }) {
  const [ratio, setRatio] = useState(1);
  return (
    <Image
      source={{ uri }}
      aria-hidden
      resizeMode="contain"
      onLoad={(event) => {
        const { width: w, height: h } = event.nativeEvent.source;
        if (w && h) setRatio(w / h);
      }}
      style={{ height, width: Math.min(height * ratio, maxWidth) }}
    />
  );
}

/** Logo de l'entreprise, ou ses initiales dans un carré arrondi. */
function Mark({
  z,
  info,
  logoUrl,
  size,
  background,
}: {
  z: FaceProps["z"];
  info: BusinessCardInfo;
  logoUrl?: string | null;
  size: number;
  background: string;
}) {
  if (logoUrl) return <CompanyLogo uri={logoUrl} height={z(size)} maxWidth={z(size * 3)} />;
  return (
    <View
      aria-hidden
      style={[
        styles.center,
        {
          width: z(size),
          height: z(size),
          borderRadius: z(size * 0.28),
          backgroundColor: background,
        },
      ]}
    >
      <Text style={cardText(z, font.display, size * 0.38, 1.2, WHITE)}>{info.initials}</Text>
    </View>
  );
}

const subline = (info: BusinessCardInfo) => [info.person, info.trade].filter(Boolean).join(" · ");

/** Cadre arrondi du QR code (fond blanc ou crème) ; `pad` et `qr` dans le repère de la maquette. */
function QrFrame({
  z,
  value,
  qr,
  pad,
  background = WHITE,
  ring,
}: {
  z: FaceProps["z"];
  value: string;
  qr: number;
  pad: number;
  background?: string;
  /** Liseré extérieur (`box-shadow: 0 0 0 1.5px` du site), hors mise en page. */
  ring?: string;
}) {
  return (
    <View
      style={{
        padding: z(pad),
        borderRadius: z(14),
        backgroundColor: background,
        ...(ring ? { borderWidth: z(1.5), borderColor: ring, margin: z(-1.5) } : null),
      }}
    >
      <CardQr value={value} size={z(qr)} />
    </View>
  );
}

/** Petit QR code du recto (lien vers la fiche même imprimée sur une seule face), comme le site. */
function SmallQr({
  z,
  value,
  position,
  ring,
}: {
  z: FaceProps["z"];
  value: string;
  /** Placement dans le repère 425 × 275 (`right`, `top` ou `bottom`). */
  position: { right: number; top?: number; bottom?: number };
  /** Liseré extérieur (`box-shadow: 0 0 0 1.5px` du site), hors mise en page. */
  ring?: string;
}) {
  return (
    <View
      style={[
        styles.abs,
        {
          right: z(position.right),
          ...(position.top !== undefined ? { top: z(position.top) } : null),
          ...(position.bottom !== undefined ? { bottom: z(position.bottom) } : null),
          padding: z(5),
          borderRadius: z(10),
          backgroundColor: WHITE,
          ...(ring ? { borderWidth: z(1.5), borderColor: ring, margin: z(-1.5) } : null),
        },
      ]}
    >
      <CardQr value={value} size={z(62)} />
    </View>
  );
}

// ------------------------------------------------------------------ 1. Signature
function SignatureRecto({ info, pageUrl, verified, logoUrl, z, width, height, uid }: FaceProps) {
  const sub = subline(info);
  return (
    <>
      <Backdrop width={width} height={height} gradient={GRADIENT} uid={uid} />
      <View style={[styles.abs, { right: z(-70), bottom: z(-78) }]}>
        <LogoSymbol width={z(330)} color={WHITE} opacity={0.09} weight={1.1} />
      </View>
      <View
        style={[styles.fill, styles.between, { paddingVertical: z(26), paddingHorizontal: z(28) }]}
      >
        <View style={[styles.row, styles.between]}>
          {logoUrl ? (
            <Mark z={z} info={info} logoUrl={logoUrl} size={30} background={WHITE} />
          ) : (
            <Logo z={z} size={19} color={WHITE} />
          )}
          {verified ? (
            <Verified
              z={z}
              background="rgba(255,255,255,0.14)"
              color={WHITE}
              tick={MINT}
              tickColor={NUIT}
            />
          ) : null}
        </View>
        <View style={{ gap: z(6), paddingRight: z(80) }}>
          <Text
            style={cardText(z, font.display, 30, TIGHT, WHITE, -0.03)}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {info.title}
          </Text>
          {sub ? (
            <Text
              style={cardText(z, font.regular, 14, NORMAL, "rgba(255,255,255,0.78)")}
              numberOfLines={1}
            >
              {sub}
            </Text>
          ) : null}
          {info.phone ? (
            <View style={{ marginTop: z(8) }}>
              <PhoneLine z={z} phone={info.phone} color={WHITE} />
            </View>
          ) : null}
        </View>
      </View>
      <SmallQr z={z} value={pageUrl} position={{ right: 22, bottom: 22 }} />
    </>
  );
}

function SignatureVerso({ pageUrl, domain, z, width, height, uid }: FaceProps) {
  return (
    <>
      <Backdrop
        width={width}
        height={height}
        color={WHITE}
        gradient={GRADIENT}
        box={{ x: 0, y: UNIT_H - 64, w: UNIT_W, h: 64 }}
        uid={uid}
      />
      <View
        style={[
          styles.abs,
          styles.row,
          styles.between,
          { left: z(24), right: z(24), bottom: z(16) },
        ]}
      >
        <Logo z={z} size={17} color={WHITE} />
        <Text style={cardText(z, font.bold, 13, NORMAL, WHITE)} numberOfLines={1}>
          {domain}
        </Text>
      </View>
      <View
        style={[
          styles.abs,
          styles.row,
          {
            top: 0,
            left: 0,
            right: 0,
            bottom: z(64),
            paddingVertical: z(22),
            paddingHorizontal: z(26),
            gap: z(22),
          },
        ]}
      >
        <QrFrame z={z} value={pageUrl} qr={132} pad={8} ring="#e3e7f5" />
        <View style={[styles.shrink, { gap: z(8) }]}>
          <Text style={cardText(z, font.display, 20, 1.15, NUIT, -0.02)}>{c.tagline}</Text>
          <Text style={cardText(z, font.regular, 13, 1.4, MUTED)}>{c.scanHint}</Text>
        </View>
      </View>
    </>
  );
}

// ------------------------------------------------------------------ 2. Sourire
function SourireRecto({ info, pageUrl, verified, logoUrl, z, width, height, uid }: FaceProps) {
  const id = `${uid}smile`;
  const sub = subline(info);
  return (
    <>
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${UNIT_W} ${UNIT_H}`}
        style={StyleSheet.absoluteFill}
        aria-hidden
      >
        <Rect width={UNIT_W} height={UNIT_H} fill={WHITE} />
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={BLUE_LIGHT} />
            <Stop offset="1" stopColor="#3451d1" />
          </LinearGradient>
        </Defs>
        <Path
          d="M-30 196 C 90 300, 335 300, 455 196"
          stroke={`url(#${id})`}
          strokeWidth={46}
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
      <View
        style={[
          styles.fill,
          { paddingVertical: z(24), paddingLeft: z(28), paddingRight: z(108), gap: z(14) },
        ]}
      >
        <View style={[styles.row, { gap: z(10) }]}>
          <Mark z={z} info={info} logoUrl={logoUrl} size={42} background={NUIT} />
          <View style={styles.shrink}>
            <Text
              style={cardText(z, font.display, 22, TIGHT, NUIT, -0.03)}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {info.title}
            </Text>
            {sub ? (
              <Text style={cardText(z, font.regular, 12.5, NORMAL, MUTED)} numberOfLines={1}>
                {sub}
              </Text>
            ) : null}
          </View>
        </View>
        <PhoneLine z={z} phone={info.phone} color={NUIT} />
      </View>
      <View style={[styles.abs, styles.centerRow, { left: 0, right: 0, bottom: z(24) }]}>
        {verified ? (
          <Verified z={z} background={WHITE} color={NUIT} tick={GREEN} tickColor={WHITE} />
        ) : (
          <View
            style={{
              paddingVertical: z(4),
              paddingHorizontal: z(12),
              borderRadius: radius.pill,
              backgroundColor: WHITE,
            }}
          >
            <Logo z={z} size={15} color={NUIT} />
          </View>
        )}
      </View>
      <SmallQr z={z} value={pageUrl} position={{ right: 22, top: 22 }} ring="#e3e7f5" />
    </>
  );
}

function SourireVerso({ pageUrl, z, width, height, uid }: FaceProps) {
  return (
    <>
      <Backdrop width={width} height={height} gradient={BLUE_GRADIENT} uid={uid} />
      <View style={[styles.fill, styles.centerRow, { gap: z(30), paddingHorizontal: z(28) }]}>
        <View style={[styles.centerCol, { gap: z(10) }]}>
          <LogoSymbol width={z(118)} color={WHITE} />
          <Wordmark z={z} size={34} color={WHITE} />
        </View>
        <View style={{ width: z(1), height: z(150), backgroundColor: "rgba(255,255,255,0.25)" }} />
        <View style={[styles.centerCol, { gap: z(8) }]}>
          <QrFrame z={z} value={pageUrl} qr={112} pad={7} />
          <Text
            style={[
              cardText(z, font.semibold, 12, 1.3, "rgba(255,255,255,0.85)"),
              styles.textCenter,
            ]}
          >
            {c.taglineTwoLines}
          </Text>
        </View>
      </View>
    </>
  );
}

// ------------------------------------------------------------------ 3. Bleu vif
function BleuRecto({ info, pageUrl, logoUrl, z, width, height, uid }: FaceProps) {
  return (
    <>
      <Backdrop width={width} height={height} color={BLUE} uid={uid} />
      <View style={[styles.abs, { left: z(-46), top: z(30) }]}>
        <LogoSymbol width={z(230)} color={WHITE} opacity={0.16} weight={1.2} />
      </View>
      <View
        style={[
          styles.fill,
          {
            justifyContent: "center",
            gap: z(8),
            paddingTop: z(24),
            paddingBottom: z(24),
            paddingRight: z(28),
            paddingLeft: z(168),
          },
        ]}
      >
        {info.trade ? (
          <Text
            style={[
              cardText(z, font.bold, 12, NORMAL, "rgba(255,255,255,0.75)", 0.12),
              styles.upper,
            ]}
            numberOfLines={2}
          >
            {info.trade}
          </Text>
        ) : null}
        <Text
          style={cardText(z, font.display, 30, 1.05, WHITE, -0.03)}
          numberOfLines={3}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {info.title}
        </Text>
        {info.person ? (
          <Text
            style={cardText(z, font.regular, 14, NORMAL, "rgba(255,255,255,0.85)")}
            numberOfLines={1}
          >
            {info.person}
          </Text>
        ) : null}
        {info.phone ? (
          <View style={{ marginTop: z(6) }}>
            <PhoneLine z={z} phone={info.phone} color={WHITE} />
          </View>
        ) : null}
      </View>
      <View style={[styles.abs, { left: z(26), bottom: z(22) }]}>
        {logoUrl ? (
          <Mark z={z} info={info} logoUrl={logoUrl} size={28} background={WHITE} />
        ) : (
          <Wordmark z={z} size={20} color={WHITE} />
        )}
      </View>
      <SmallQr z={z} value={pageUrl} position={{ right: 22, bottom: 22 }} />
    </>
  );
}

function BleuVerso({ pageUrl, domain, verified, z, width, height, uid }: FaceProps) {
  return (
    <>
      <Backdrop width={width} height={height} color={NUIT} uid={uid} />
      <View
        style={[
          styles.fill,
          styles.row,
          { paddingVertical: z(24), paddingHorizontal: z(28), gap: z(24) },
        ]}
      >
        <QrFrame z={z} value={pageUrl} qr={128} pad={8} />
        <View style={[styles.shrink, { gap: z(10) }]}>
          {verified ? (
            <Verified z={z} background={BLUE} color={WHITE} tick={WHITE} tickColor={BLUE} />
          ) : null}
          <Text style={cardText(z, font.display, 19, 1.2, WHITE, -0.02)}>{c.tagline}</Text>
          <View style={[styles.row, { gap: z(8) }]}>
            <LogoSymbol width={z(26)} color={BLUE_LIGHT} />
            <Text style={cardText(z, font.bold, 13, NORMAL, WHITE)} numberOfLines={1}>
              {domain}
            </Text>
          </View>
        </View>
      </View>
    </>
  );
}

// ------------------------------------------------------------------ 4. Label
/** Sceau rond « Artisan vérifié · MENAO » (texte sur un cercle), symbole au centre. */
function Seal({ z, size, uid }: { z: FaceProps["z"]; size: number; uid: string }) {
  const r = size / 2;
  const inner = r - 14;
  const id = `${uid}seal`;
  return (
    <Svg width={z(size)} height={z(size)} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <Defs>
        <Path
          id={id}
          d={`M ${r},${r} m -${inner},0 a ${inner},${inner} 0 1,1 ${2 * inner},0 a ${inner},${inner} 0 1,1 -${2 * inner},0`}
        />
      </Defs>
      <Circle cx={r} cy={r} r={r - 2} fill={NUIT} />
      <Circle cx={r} cy={r} r={r - 6} fill="none" stroke={WHITE} strokeWidth={1.2} opacity={0.5} />
      <SvgText fontSize={size * 0.085} fontFamily={font.bold} letterSpacing={2.2} fill={WHITE}>
        <TextPath href={`#${id}`}>{c.seal}</TextPath>
      </SvgText>
      <G transform={`translate(${r - size * 0.2} ${r - size * 0.17}) scale(${(size * 0.4) / 32})`}>
        <Path
          d={ROOF}
          stroke={WHITE}
          strokeWidth={3.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path d={SMILE} stroke={WHITE} strokeWidth={4.6} strokeLinecap="round" fill="none" />
      </G>
    </Svg>
  );
}

function LabelRecto({ info, pageUrl, verified, logoUrl, z, width, height, uid }: FaceProps) {
  const grid = `${uid}grid`;
  return (
    <>
      <Backdrop width={width} height={height} color={CREAM} uid={uid} />
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${UNIT_W} ${UNIT_H}`}
        style={[StyleSheet.absoluteFill, { opacity: 0.55 }]}
        aria-hidden
      >
        <Defs>
          <Pattern id={grid} width={17} height={17} patternUnits="userSpaceOnUse">
            <Path d="M17 0H0V17" fill="none" stroke="#d9cfbb" strokeWidth={0.8} />
          </Pattern>
        </Defs>
        <Rect width={UNIT_W} height={UNIT_H} fill={`url(#${grid})`} />
      </Svg>
      <View style={[styles.abs, { right: z(22), top: z(22), transform: [{ rotate: "-12deg" }] }]}>
        {verified ? <Seal z={z} size={112} uid={uid} /> : <LogoSymbol width={z(70)} color={NUIT} />}
      </View>
      <View
        style={[styles.fill, styles.between, { paddingVertical: z(26), paddingHorizontal: z(28) }]}
      >
        <View style={[styles.row, { gap: z(10), maxWidth: z(250) }]}>
          {logoUrl ? (
            <Mark z={z} info={info} logoUrl={logoUrl} size={28} background={NUIT} />
          ) : null}
          {info.trade ? (
            <Text
              style={[cardText(z, font.bold, 12, NORMAL, BLUE, 0.12), styles.upper, styles.shrink]}
              numberOfLines={2}
            >
              {info.trade}
            </Text>
          ) : null}
        </View>
        <View style={{ gap: z(6), paddingRight: z(80) }}>
          <Text
            style={cardText(z, font.display, 30, TIGHT, NUIT, -0.03)}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {info.title}
          </Text>
          {info.person ? (
            <Text style={cardText(z, font.regular, 14, NORMAL, "#5b5547")} numberOfLines={1}>
              {info.person}
            </Text>
          ) : null}
          {info.phone ? (
            <View style={{ marginTop: z(6) }}>
              <PhoneLine z={z} phone={info.phone} color={NUIT} />
            </View>
          ) : null}
        </View>
      </View>
      <SmallQr z={z} value={pageUrl} position={{ right: 22, bottom: 22 }} />
    </>
  );
}

function LabelVerso({ pageUrl, domain, z, width, height, uid }: FaceProps) {
  return (
    <>
      <Backdrop width={width} height={height} color={NUIT} uid={uid} />
      <View
        style={[
          styles.fill,
          styles.row,
          styles.between,
          { paddingVertical: z(24), paddingHorizontal: z(28), gap: z(18) },
        ]}
      >
        <View style={[styles.shrink, { gap: z(12) }]}>
          <Logo z={z} size={26} color={WHITE} />
          <Text style={[cardText(z, font.display, 18, 1.25, WHITE, -0.02), { maxWidth: z(170) }]}>
            {c.tagline}
          </Text>
          <Text
            style={cardText(z, font.regular, 12.5, NORMAL, "rgba(255,255,255,0.7)")}
            numberOfLines={1}
          >
            {domain}
          </Text>
        </View>
        <QrFrame z={z} value={pageUrl} qr={126} pad={9} background={CREAM} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  viewer: { gap: spacing(2.5) },
  pressed: { opacity: 0.9 },
  face: {
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors["border-strong"],
  },
  fill: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  abs: { position: "absolute" },
  row: { flexDirection: "row", alignItems: "center" },
  between: { justifyContent: "space-between" },
  center: { alignItems: "center", justifyContent: "center" },
  centerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  centerCol: { alignItems: "center" },
  shrink: { flexShrink: 1, minWidth: 0 },
  upper: { textTransform: "uppercase" },
  textCenter: { textAlign: "center" },
  dots: { flexDirection: "row", justifyContent: "center", gap: spacing(1) },
  dotHit: { height: 16, justifyContent: "center", paddingHorizontal: 2 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors["border-strong"],
  },
  dotOn: { width: 20, backgroundColor: colors.foreground },
  hint: {
    fontFamily: font.regular,
    fontSize: 13,
    textAlign: "center",
    color: colors["muted-foreground"],
  },
});
