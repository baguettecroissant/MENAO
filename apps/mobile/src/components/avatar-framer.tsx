import {
  AVATAR_MAX_ZOOM,
  AVATAR_SIDE,
  type AvatarFraming,
  centeredFraming,
  clampFraming,
  fillScale,
  fitScale,
  initialFraming,
  zoomFraming,
} from "@menao/core";
import { Minus, Plus } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type ViewInstance,
} from "react-native";
import { captureRef } from "react-native-view-shot";
import { fr } from "@/i18n/fr";
import { Button } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.avatarFramer;
const { colors, font, radius, spacing } = theme;
/** Côté du carré d'aperçu, en points. */
const PREVIEW = 280;
const BACKGROUNDS = ["#ffffff", "#000000"] as const;

type Request = { uri: string; resolve: (uri: string | null) => void };
let open: ((request: Request) => void) | null = null;

/**
 * Cadrage de la photo de profil avant l'envoi (ADR 0202) : renvoie l'image cadrée (carré de
 * 512 px, JPEG), ou null si l'utilisateur annule. Sans hôte monté, l'image est gardée telle quelle.
 */
export function frameAvatar(uri: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (!open) return resolve(uri);
    open({ uri, resolve });
  });
}

function distance(e: GestureResponderEvent): number | null {
  const [a, b] = e.nativeEvent.touches;
  return a && b ? Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY) : null;
}

/**
 * Écran de cadrage, une seule fois à la racine (comme les confirmations) : l'image glisse d'un
 * doigt et se zoome en pinçant ; le rond montre la bulle de profil ; « Image entière » garde tout
 * un logo, sur fond blanc ou noir. L'image enregistrée est une capture du carré.
 */
export function AvatarFramerHost() {
  const [request, setRequest] = useState<Request | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [framing, setFraming] = useState<AvatarFraming | null>(null);
  const [background, setBackground] = useState<string>(BACKGROUNDS[0]);
  const [saving, setSaving] = useState(false);
  const square = useRef<ViewInstance>(null);
  const gesture = useRef<{
    x: number;
    y: number;
    distance: number | null;
    start: AvatarFraming;
  } | null>(null);

  useEffect(() => {
    open = (next) => {
      setSize(null);
      setFraming(null);
      setBackground(BACKGROUNDS[0]);
      setRequest(next);
      Image.getSize(
        next.uri,
        (width, height) => {
          setSize({ width, height });
          setFraming(initialFraming(width, height, PREVIEW));
        },
        () => {
          next.resolve(next.uri);
          setRequest(null);
        },
      );
    };
    return () => {
      open = null;
    };
  }, []);

  // Gestes : un doigt fait glisser l'image, deux doigts la zooment (pincement).
  function onGrant(e: GestureResponderEvent) {
    if (!framing) return;
    gesture.current = {
      x: e.nativeEvent.pageX,
      y: e.nativeEvent.pageY,
      distance: distance(e),
      start: framing,
    };
  }

  function onMove(e: GestureResponderEvent) {
    const start = gesture.current;
    if (!size || !start) return;
    const d = distance(e);
    if (d && !start.distance) {
      // Deuxième doigt posé : le pincement repart de l'état actuel.
      gesture.current = { ...start, distance: d, start: framing ?? start.start };
      return;
    }
    if (d && start.distance) {
      setFraming(
        zoomFraming(
          start.start,
          start.start.scale * (d / start.distance),
          size.width,
          size.height,
          PREVIEW,
        ),
      );
      return;
    }
    if (start.distance) {
      // Un doigt levé après un pincement : le glissement repart d'ici.
      gesture.current = {
        x: e.nativeEvent.pageX,
        y: e.nativeEvent.pageY,
        distance: null,
        start: framing ?? start.start,
      };
      return;
    }
    setFraming(
      clampFraming(
        {
          ...start.start,
          x: start.start.x + e.nativeEvent.pageX - start.x,
          y: start.start.y + e.nativeEvent.pageY - start.y,
        },
        size.width,
        size.height,
        PREVIEW,
      ),
    );
  }

  function onEnd() {
    gesture.current = null;
  }

  function close(uri: string | null) {
    request?.resolve(uri);
    setRequest(null);
  }

  function zoomBy(factor: number) {
    if (!size || !framing) return;
    setFraming(zoomFraming(framing, framing.scale * factor, size.width, size.height, PREVIEW));
  }

  async function confirm() {
    if (!square.current) return;
    setSaving(true);
    try {
      const uri = await captureRef(square, {
        format: "jpg",
        quality: 0.9,
        width: AVATAR_SIDE,
        height: AVATAR_SIDE,
      });
      close(uri);
    } catch {
      close(request?.uri ?? null);
    } finally {
      setSaving(false);
    }
  }

  const max = size ? fillScale(size.width, size.height, PREVIEW) * AVATAR_MAX_ZOOM : 1;
  return (
    <Modal
      visible={request !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => close(null)}
    >
      <View style={styles.sheet}>
        <Text role="heading" style={styles.title}>
          {t.title}
        </Text>
        <Text style={styles.hint}>{t.hint}</Text>
        <View
          style={styles.stage}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={onGrant}
          onResponderMove={onMove}
          onResponderRelease={onEnd}
          onResponderTerminate={onEnd}
        >
          {/* Carré capturé : fond et image seulement, sans le voile du rond. */}
          <View
            ref={square}
            collapsable={false}
            style={[styles.square, { backgroundColor: background }]}
          >
            {request && size && framing && (
              <Image
                source={{ uri: request.uri }}
                style={{
                  position: "absolute",
                  left: framing.x,
                  top: framing.y,
                  width: size.width * framing.scale,
                  height: size.height * framing.scale,
                }}
              />
            )}
          </View>
          <View pointerEvents="none" style={styles.mask} />
        </View>
        <View style={styles.row}>
          <Pressable
            role="button"
            aria-label={t.zoomOut}
            onPress={() => zoomBy(1 / 1.2)}
            disabled={
              !framing ||
              (size !== null && framing.scale <= fitScale(size.width, size.height, PREVIEW) + 1e-6)
            }
            style={styles.round}
          >
            <Minus size={18} color={colors.foreground} />
          </Pressable>
          <Pressable
            role="button"
            aria-label={t.zoomIn}
            onPress={() => zoomBy(1.2)}
            disabled={!framing || framing.scale >= max - 1e-6}
            style={styles.round}
          >
            <Plus size={18} color={colors.foreground} />
          </Pressable>
          <Pressable
            role="button"
            onPress={() => size && setFraming(centeredFraming(0, size.width, size.height, PREVIEW))}
            style={styles.chip}
          >
            <Text style={styles.chipText}>{t.fit}</Text>
          </Pressable>
          <Pressable
            role="button"
            onPress={() =>
              size &&
              setFraming(
                centeredFraming(
                  fillScale(size.width, size.height, PREVIEW),
                  size.width,
                  size.height,
                  PREVIEW,
                ),
              )
            }
            style={styles.chip}
          >
            <Text style={styles.chipText}>{t.fill}</Text>
          </Pressable>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{t.background}</Text>
          {BACKGROUNDS.map((color) => (
            <Pressable
              key={color}
              role="radio"
              aria-checked={background === color}
              aria-label={color === "#ffffff" ? t.white : t.black}
              onPress={() => setBackground(color)}
              style={[
                styles.swatch,
                { backgroundColor: color },
                background === color && styles.swatchOn,
              ]}
            />
          ))}
        </View>
        <View style={styles.actions}>
          <Button label={t.confirm} onPress={confirm} loading={saving} disabled={!framing} />
          <Button label={t.cancel} variant="ghost" onPress={() => close(null)} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, gap: spacing(4), padding: spacing(5), backgroundColor: colors.background },
  title: { fontFamily: font.medium, fontSize: 20, color: colors.foreground },
  hint: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors["muted-foreground"],
  },
  stage: {
    alignSelf: "center",
    width: PREVIEW,
    height: PREVIEW,
    overflow: "hidden",
    borderRadius: radius.card,
  },
  square: { width: PREVIEW, height: PREVIEW, overflow: "hidden" },
  // Voile hors du rond : une bordure très épaisse autour d'un rond transparent.
  mask: {
    position: "absolute",
    left: -PREVIEW / 2,
    top: -PREVIEW / 2,
    width: PREVIEW * 2,
    height: PREVIEW * 2,
    borderRadius: PREVIEW,
    borderWidth: PREVIEW / 2,
    borderColor: "rgba(0,0,0,0.45)",
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing(2) },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chip: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: spacing(3),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipText: { fontFamily: font.medium, fontSize: 14, color: colors.foreground },
  label: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  swatchOn: { borderWidth: 3, borderColor: colors.primary },
  actions: { gap: spacing(2), marginTop: "auto" },
});
