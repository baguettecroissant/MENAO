import { Check, Phone } from "lucide-react-native";
import { useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from "react-native";
import { Logo, LogoMark } from "@/components/logo";
import { QrCode } from "@/components/qr-code";
import { Segmented } from "@/components/segmented";
import { fr } from "@/i18n/fr";
import type { BusinessCardInfo } from "@/lib/business-card";
import { theme } from "@/ui/theme";

const c = fr.proHub.share.card;
const { colors, font, radius, spacing } = theme;

export type CardModel = "nuit" | "clair" | "sobre";
type Face = "recto" | "verso";

/** Verso d'abord : c'est lui que le client scanne. */
const FACES: readonly Face[] = ["verso", "recto"];
const MODELS: readonly CardModel[] = ["nuit", "clair", "sobre"];
/** Format d'une carte de visite : 85 × 55 mm. */
const RATIO = 55 / 85;
const WHITE = "#ffffff";

type CardData = {
  info: BusinessCardInfo;
  pageUrl: string;
  /** Domaine du site (« menao.fr »). */
  domain: string;
  verified: boolean;
};

/**
 * Carte de visite aux couleurs de MENAO (lot 17), au format 85 × 55 : verso (QR code de la fiche)
 * visible d'abord, recto au balayage ou par les points ; trois modèles (Nuit, Clair, Sobre). Un
 * toucher sur la carte appelle `onExpand` (QR code en plein écran).
 */
export function BusinessCardViewer({ onExpand, ...data }: CardData & { onExpand: () => void }) {
  const [model, setModel] = useState<CardModel>("nuit");
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

/** Une face de la carte, dessinée à la largeur donnée (unités proportionnelles au format). */
function CardFace({
  info,
  pageUrl,
  domain,
  verified,
  model,
  face,
  width,
}: CardData & { model: CardModel; face: Face; width: number }) {
  // Une unité = 1 mm de la carte réelle.
  const u = width / 85;
  const size = { width, height: Math.round(width * RATIO) };
  const pad = 5 * u;
  const props = { info, pageUrl, domain, verified, u, pad };
  const content =
    model === "nuit" ? (
      face === "recto" ? (
        <NuitRecto {...props} />
      ) : (
        <NuitVerso {...props} />
      )
    ) : model === "clair" ? (
      face === "recto" ? (
        <ClairRecto {...props} />
      ) : (
        <ClairVerso {...props} />
      )
    ) : face === "recto" ? (
      <SobreRecto {...props} />
    ) : (
      <SobreVerso {...props} />
    );
  const background =
    model === "nuit" && face === "verso"
      ? colors.foreground
      : model === "clair" && face === "recto"
        ? colors["primary-soft"]
        : WHITE;
  return (
    <View style={[styles.face, size, { backgroundColor: background, borderRadius: 3 * u }]}>
      {content}
    </View>
  );
}

type FaceProps = {
  info: BusinessCardInfo;
  pageUrl: string;
  domain: string;
  verified: boolean;
  /** Unité : 1 mm de la carte. */
  u: number;
  pad: number;
};

/** Typographie de la carte, proportionnelle à sa largeur. */
function text(u: number) {
  return {
    title: { fontFamily: font.display, fontSize: 5.2 * u, lineHeight: 6.4 * u },
    person: { fontFamily: font.semibold, fontSize: 3.3 * u, lineHeight: 4.4 * u },
    trade: { fontFamily: font.regular, fontSize: 3 * u, lineHeight: 4.1 * u },
    phone: { fontFamily: font.medium, fontSize: 3.1 * u, lineHeight: 4.2 * u },
    small: { fontFamily: font.medium, fontSize: 2.8 * u, lineHeight: 3.8 * u },
    domain: { fontFamily: font.bold, fontSize: 3.5 * u, lineHeight: 4.6 * u },
  };
}

/** Carré arrondi aux initiales de l'entreprise. */
function Monogram({ initials, u, color }: { initials: string; u: number; color: string }) {
  return (
    <View
      style={[
        styles.center,
        { width: 11 * u, height: 11 * u, borderRadius: 2.6 * u, backgroundColor: color },
      ]}
    >
      <Text style={{ fontFamily: font.display, fontSize: 4.4 * u, color: WHITE }}>{initials}</Text>
    </View>
  );
}

/** Badge « Artisan vérifié » (coche). */
function VerifiedBadge({ u, color, background }: { u: number; color: string; background: string }) {
  return (
    <View
      style={[
        styles.badge,
        {
          gap: 1 * u,
          paddingHorizontal: 2.2 * u,
          paddingVertical: 0.9 * u,
          backgroundColor: background,
        },
      ]}
    >
      <Check size={3 * u} color={color} strokeWidth={3} />
      <Text style={[text(u).small, { color }]}>{c.verified}</Text>
    </View>
  );
}

/** Nom, prénom-nom, métier et téléphone : une donnée absente n'a pas de ligne. */
function Identity({
  info,
  u,
  color,
  muted,
  align = "left",
  separator,
}: {
  info: BusinessCardInfo;
  u: number;
  color: string;
  muted: string;
  align?: "left" | "center";
  /** Petit trait avant le téléphone (modèle Sobre). */
  separator?: string;
}) {
  const t = text(u);
  const textAlign = align;
  return (
    <View style={{ alignItems: align === "center" ? "center" : "flex-start" }}>
      <Text
        style={[t.title, { color, textAlign, letterSpacing: -0.1 * u }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {info.title}
      </Text>
      {info.person ? (
        <Text style={[t.person, { color, textAlign }]} numberOfLines={1}>
          {info.person}
        </Text>
      ) : null}
      {info.trade ? (
        <Text style={[t.trade, { color: muted, textAlign }]} numberOfLines={1}>
          {info.trade}
        </Text>
      ) : null}
      {separator && info.phone ? (
        <View
          style={{
            width: 8 * u,
            height: 0.5 * u,
            marginVertical: 1.6 * u,
            borderRadius: radius.pill,
            backgroundColor: separator,
          }}
        />
      ) : null}
      {info.phone ? (
        <View style={[styles.row, { gap: 1.2 * u, marginTop: separator ? 0 : 1 * u }]}>
          <Phone size={3 * u} color={color} />
          <Text style={[t.phone, { color }]} numberOfLines={1}>
            {info.phone}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Phrase et domaine du verso. */
function Tagline({
  domain,
  u,
  color,
  muted,
  align = "left",
}: {
  domain: string;
  u: number;
  color: string;
  muted: string;
  align?: "left" | "center";
}) {
  const t = text(u);
  return (
    <View style={{ gap: 0.6 * u, alignItems: align === "center" ? "center" : "flex-start" }}>
      <Text style={[t.small, { color: muted, textAlign: align }]}>{c.tagline}</Text>
      <Text style={[t.domain, { color }]} numberOfLines={1}>
        {domain}
      </Text>
    </View>
  );
}

/** QR code de la fiche dans son cadre blanc arrondi. */
function QrFrame({
  value,
  u,
  qr,
  border,
}: {
  value: string;
  u: number;
  qr: number;
  border?: string;
}) {
  return (
    <View
      style={{
        padding: 2 * u,
        borderRadius: 2.5 * u,
        backgroundColor: WHITE,
        borderWidth: border ? 1 : 0,
        borderColor: border,
      }}
    >
      <QrCode value={value} size={Math.round(qr * u)} label={c.qrLabel} />
    </View>
  );
}

function NuitRecto({ info, u, pad }: FaceProps) {
  return (
    <>
      <View style={[styles.fill, styles.between, { padding: pad, paddingBottom: pad + 1.2 * u }]}>
        <View style={[styles.row, styles.spread]}>
          <Monogram initials={info.initials} u={u} color={colors.foreground} />
          <LogoMark size={8 * u} />
        </View>
        <Identity info={info} u={u} color={colors.foreground} muted={colors["muted-foreground"]} />
      </View>
      <View style={[styles.stripe, { height: 1.2 * u, backgroundColor: colors.foreground }]} />
    </>
  );
}

function NuitVerso({ pageUrl, domain, verified, u, pad }: FaceProps) {
  return (
    <>
      {/* Filigrane : grand symbole blanc qui déborde en bas à droite. */}
      <View style={[styles.watermark, { right: -14 * u, bottom: -18 * u }]}>
        <LogoMark size={62 * u} tone="white" />
      </View>
      <View style={[styles.fill, styles.row, { padding: pad, gap: 4 * u }]}>
        <View style={[styles.fill, styles.between]}>
          <Logo size={5.5 * u} tone="white" />
          <View style={{ gap: 2 * u, alignItems: "flex-start" }}>
            {verified ? (
              <VerifiedBadge u={u} color={WHITE} background="rgba(255,255,255,0.12)" />
            ) : null}
            <Tagline domain={domain} u={u} color={WHITE} muted="rgba(255,255,255,0.78)" />
          </View>
        </View>
        <View style={styles.centerY}>
          <QrFrame value={pageUrl} u={u} qr={32} />
        </View>
      </View>
    </>
  );
}

function ClairRecto({ info, verified, u, pad }: FaceProps) {
  return (
    <View style={[styles.fill, styles.between, { padding: pad }]}>
      <View style={[styles.row, styles.spread, { alignItems: "flex-start" }]}>
        <Monogram initials={info.initials} u={u} color={colors.primary} />
        {verified ? (
          <VerifiedBadge u={u} color={colors.success} background={colors["success-soft"]} />
        ) : null}
      </View>
      <Identity
        info={info}
        u={u}
        color={colors["primary-strong"]}
        muted={colors["primary-strong"]}
      />
    </View>
  );
}

function ClairVerso({ pageUrl, domain, u, pad }: FaceProps) {
  return (
    <View style={[styles.fill, styles.row, { padding: pad, gap: 5 * u }]}>
      <View style={styles.centerY}>
        <QrFrame value={pageUrl} u={u} qr={33} border={colors["primary-soft"]} />
      </View>
      <View style={[styles.fill, styles.between]}>
        <Logo size={5.5 * u} />
        <Tagline
          domain={domain}
          u={u}
          color={colors["primary-strong"]}
          muted={colors["primary-strong"]}
        />
      </View>
    </View>
  );
}

function SobreRecto({ info, u, pad }: FaceProps) {
  return (
    <View style={[styles.fill, styles.center, { padding: pad }]}>
      <Identity
        info={info}
        u={u}
        color={colors.foreground}
        muted={colors["muted-foreground"]}
        align="center"
        separator={colors.foreground}
      />
    </View>
  );
}

function SobreVerso({ pageUrl, domain, u }: FaceProps) {
  const t = text(u);
  return (
    <View style={[styles.fill, styles.center, { padding: 3.5 * u, gap: 1.6 * u }]}>
      <QrCode value={pageUrl} size={Math.round(29 * u)} label={c.qrLabel} />
      <Text style={[t.small, { color: colors["muted-foreground"], textAlign: "center" }]}>
        {c.tagline}
      </Text>
      <View style={[styles.row, { gap: 1.2 * u }]}>
        <LogoMark size={4.2 * u} />
        <Text style={[t.domain, { color: colors.foreground }]}>{domain}</Text>
      </View>
    </View>
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
  fill: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  spread: { justifyContent: "space-between" },
  between: { justifyContent: "space-between" },
  center: { alignItems: "center", justifyContent: "center" },
  centerY: { justifyContent: "center" },
  stripe: { position: "absolute", left: 0, right: 0, bottom: 0 },
  watermark: { position: "absolute", opacity: 0.07 },
  badge: { flexDirection: "row", alignItems: "center", borderRadius: radius.pill },
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
