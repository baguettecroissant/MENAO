import {
  DICTATION_SAMPLE_RATE,
  MAX_DICTATION_SECONDS,
  SILENCE_RMS,
  SILENCE_WARNING_MS,
  levelFromRms,
  pcm16ToChannels,
  rms,
} from "@menao/core";
import { requestRecordingPermissionsAsync, useAudioStream } from "expo-audio";
import { AudioLines, Mic } from "lucide-react-native";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { transcribeCapture } from "@/lib/dictation";
import { theme } from "@/ui/theme";

const t = fr.search.dictation;
const { colors, font, radius, spacing } = theme;
const ERRORS = {
  silent: t.silent,
  session: fr.search.errors.session,
  rate_limited: t.rate_limited,
  failed: t.failed,
} as const;

type DictationState = "idle" | "listening" | "transcribing";

/**
 * Dictée du projet (F-05), comme sur le site (bouton micro des maquettes) : le micro est capturé en
 * PCM (expo-audio, iPhone et Android), le niveau s'affiche et un silence prolongé est signalé ;
 * 2 minutes au plus. Le texte transcrit est ajouté à la description.
 */
export function DictationButton({
  onText,
  onError,
}: {
  onText: (text: string) => void;
  onError: (message: string | null) => void;
}) {
  const [state, setState] = useState<DictationState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [quiet, setQuiet] = useState(false);
  const chunks = useRef<Uint8Array[]>([]);
  const format = useRef({ sampleRate: DICTATION_SAMPLE_RATE, channels: 1 });
  // Instants en secondes depuis le début de la capture (horodatage des morceaux reçus).
  const heardAt = useRef(0);
  const shownAt = useRef(-1);
  const stopping = useRef(false);

  const { stream } = useAudioStream({
    sampleRate: DICTATION_SAMPLE_RATE,
    channels: 1,
    encoding: "int16",
    onBuffer: (buffer) => {
      if (stopping.current) return;
      const bytes = new Uint8Array(buffer.data);
      chunks.current.push(bytes);
      format.current = { sampleRate: buffer.sampleRate, channels: buffer.channels };
      const now = buffer.timestamp;
      const value = rms(pcm16ToChannels(bytes, buffer.channels)[0] ?? new Float32Array(0));
      if (value >= SILENCE_RMS) heardAt.current = now;
      // Affichage rafraîchi dix fois par seconde au plus.
      if (now - shownAt.current >= 0.1) {
        shownAt.current = now;
        setLevel(levelFromRms(value));
        setQuiet((now - heardAt.current) * 1000 >= SILENCE_WARNING_MS);
        setSeconds(Math.floor(now));
      }
      if (buffer.timestamp >= MAX_DICTATION_SECONDS) {
        onError(t.limit);
        void stop();
      }
    },
  });

  async function start() {
    onError(null);
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) return onError(t.denied);
    chunks.current = [];
    stopping.current = false;
    heardAt.current = 0;
    shownAt.current = -1;
    setSeconds(0);
    setLevel(0);
    setQuiet(false);
    try {
      await stream.start();
      setState("listening");
    } catch {
      onError(t.failed);
    }
  }

  async function stop() {
    if (stopping.current) return;
    stopping.current = true;
    stream.stop();
    setState("transcribing");
    const captured = chunks.current;
    chunks.current = [];
    const outcome = await transcribeCapture(
      captured,
      format.current.sampleRate,
      format.current.channels,
    );
    setState("idle");
    if ("text" in outcome) onText(outcome.text);
    else onError(ERRORS[outcome.error]);
  }

  const listening = state === "listening";
  const label =
    state === "transcribing"
      ? t.transcribing
      : listening
        ? `${t.listening(seconds)} — ${t.stop}`
        : t.start;

  return (
    <View style={styles.row}>
      {state !== "idle" ? (
        <View aria-live="polite" style={styles.status}>
          {listening ? <LevelBars level={level} /> : null}
          <Text style={[styles.statusText, listening && quiet && styles.quiet]}>
            {state === "transcribing" ? t.transcribing : quiet ? t.quiet : t.listening(seconds)}
          </Text>
        </View>
      ) : (
        <Text style={styles.hint}>{t.start}</Text>
      )}
      <Pressable
        role="button"
        aria-label={label}
        aria-pressed={listening}
        aria-busy={state === "transcribing"}
        disabled={state === "transcribing"}
        onPress={listening ? stop : start}
        style={({ pressed }) => [
          styles.button,
          listening && styles.buttonActive,
          (pressed || state === "transcribing") && styles.pressed,
        ]}
      >
        {state === "transcribing" ? (
          <ActivityIndicator color={colors["primary-foreground"]} />
        ) : listening ? (
          <AudioLines size={20} color={colors["primary-foreground"]} />
        ) : (
          <Mic size={20} color={colors["primary-foreground"]} />
        )}
      </Pressable>
    </View>
  );
}

/** Niveau du micro en trois barres, comme sur le site. */
function LevelBars({ level }: { level: number }) {
  return (
    <View aria-hidden style={styles.bars}>
      {[0.2, 0.5, 0.8].map((threshold) => (
        <View
          key={threshold}
          style={[
            styles.bar,
            { height: 6 + threshold * 10 },
            level >= threshold ? styles.barOn : null,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing(3),
  },
  status: { flexShrink: 1, flexDirection: "row", alignItems: "center", gap: spacing(2) },
  statusText: { fontFamily: font.medium, fontSize: 13, color: colors["primary-strong"] },
  quiet: { color: colors.warning },
  hint: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  button: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonActive: { backgroundColor: colors["primary-strong"] },
  pressed: { opacity: 0.8 },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 2, height: 16 },
  bar: { width: 3, borderRadius: 2, backgroundColor: colors["primary-soft"] },
  barOn: { backgroundColor: colors.primary },
});
