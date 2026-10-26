import { CircleAlert, CircleCheck, Info } from "lucide-react-native";
import { useEffect, useState } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown, ReduceMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptic } from "@/lib/haptics";
import { theme } from "./theme";

const { colors, font, radius, spacing } = theme;

type Tone = "success" | "error" | "info";
type Message = {
  id: number;
  tone: Tone;
  text: string;
  /** Bouton du message (« Annuler »), qui le ferme. */
  action?: { label: string; onPress: () => void };
  duration: number;
};

const DURATION_MS = 2600;
/** Le temps de changer d'avis (ADR 0195). */
const UNDO_MS = 5000;
/** Au-dessus de la barre d'onglets. */
const OFFSET = 76;

let show: ((message: Message) => void) | null = null;
let nextId = 1;

function push(tone: Tone, text: string, action?: Message["action"]) {
  if (tone === "success") haptic.success();
  if (tone === "error") haptic.error();
  AccessibilityInfo.announceForAccessibility(text);
  show?.({ id: nextId++, tone, text, action, duration: action ? UNDO_MS : DURATION_MS });
}

/**
 * Confirmation brève en bas de l'écran (« Zone enregistrée. »), toujours visible quel que soit
 * l'endroit du formulaire, avec une vibration et une annonce VoiceOver (lot 1 de la refonte de
 * l'espace artisan). Les erreurs de saisie restent affichées près du champ concerné.
 */
export const toast = {
  success: (text: string) => push("success", text),
  error: (text: string) => push("error", text),
  info: (text: string) => push("info", text),
  /** Action faite tout de suite, avec « Annuler » pendant 5 secondes (ADR 0195). */
  undo: (text: string, label: string, onUndo: () => void) =>
    push("success", text, { label, onPress: onUndo }),
};

/** Durée du « Annuler » d'une action annulable, en millisecondes. */
export const UNDO_DELAY_MS = UNDO_MS;

const PALETTE = {
  success: { Icon: CircleCheck, fg: colors.success },
  error: { Icon: CircleAlert, fg: colors.danger },
  info: { Icon: Info, fg: colors["primary-strong"] },
} as const;

/** Emplacement des confirmations, une seule fois à la racine de l'application. */
export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    show = setMessage;
    return () => {
      show = null;
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), message.duration);
    return () => clearTimeout(timer);
  }, [message]);

  const palette = message ? PALETTE[message.tone] : null;
  return (
    <View pointerEvents="box-none" style={[styles.host, { paddingBottom: insets.bottom + OFFSET }]}>
      {message && palette ? (
        <Animated.View
          key={message.id}
          role="status"
          entering={FadeInDown.duration(240).reduceMotion(ReduceMotion.System)}
          exiting={FadeOutDown.duration(180).reduceMotion(ReduceMotion.System)}
          style={styles.toast}
        >
          <palette.Icon size={18} color={palette.fg} />
          <Text style={styles.text}>{message.text}</Text>
          {message.action ? (
            <Pressable
              role="button"
              hitSlop={10}
              onPress={() => {
                message.action?.onPress();
                haptic.select();
                setMessage(null);
              }}
              style={styles.action}
            >
              <Text style={styles.actionText}>{message.action.label}</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFill,
    // Au-dessus des écrans de la navigation (nécessaire sur le web).
    zIndex: 1000,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: spacing(5),
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2.5),
    maxWidth: 480,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.foreground,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  text: { flexShrink: 1, fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  action: {
    marginLeft: spacing(2),
    paddingLeft: spacing(3),
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  actionText: { fontFamily: font.bold, fontSize: 15, color: colors["primary-strong"] },
});
