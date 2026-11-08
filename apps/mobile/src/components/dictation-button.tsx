import { AudioLines, Mic } from "lucide-react-native";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { useDictation } from "@/lib/use-dictation";
import { theme } from "@/ui/theme";

const t = fr.search.dictation;
const { colors, font, radius, spacing } = theme;
const ERRORS = {
  denied: t.denied,
  limit: t.limit,
  silent: t.silent,
  session: fr.search.errors.session,
  rate_limited: t.rate_limited,
  failed: t.failed,
} as const;

/**
 * Dictée du projet (F-05), comme sur le site (bouton micro dans la zone de saisie des maquettes) :
 * seul le bouton rond s'affiche au repos ; pendant l'écoute, le niveau du micro et la durée, à
 * droite du bouton. Bouton rond contour de 44 px (refonte « Nette », lot 12), bleu pendant l'écoute.
 * 2 minutes au plus ; le texte transcrit est ajouté à la description.
 */
export function DictationButton({
  onText,
  onError,
}: {
  onText: (text: string) => void;
  onError: (message: string | null) => void;
}) {
  const { state, seconds, level, quiet, start, stop } = useDictation({
    onText,
    onError: (error) => onError(error ? ERRORS[error] : null),
  });

  const listening = state === "listening";
  const label =
    state === "transcribing"
      ? t.transcribing
      : listening
        ? `${t.listening(seconds)} — ${t.stop}`
        : t.start;

  return (
    <View style={styles.row}>
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
          <ActivityIndicator color={colors.primary} />
        ) : listening ? (
          <AudioLines size={20} color={colors["primary-foreground"]} />
        ) : (
          <Mic size={20} color={colors.foreground} />
        )}
      </Pressable>
      {state !== "idle" ? (
        <View aria-live="polite" style={styles.status}>
          {listening ? <LevelBars level={level} /> : null}
          <Text style={[styles.statusText, listening && quiet && styles.quiet]}>
            {state === "transcribing" ? t.transcribing : quiet ? t.quiet : t.listening(seconds)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Niveau du micro en trois barres, comme sur le site. */
export function LevelBars({ level }: { level: number }) {
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
  row: { flexShrink: 1, flexDirection: "row", alignItems: "center", gap: spacing(3) },
  status: { flexShrink: 1, flexDirection: "row", alignItems: "center", gap: spacing(2) },
  statusText: { fontFamily: font.medium, fontSize: 13, color: colors["primary-strong"] },
  quiet: { color: colors.warning },
  button: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  pressed: { opacity: 0.8 },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 2, height: 16 },
  bar: { width: 3, borderRadius: 2, backgroundColor: colors["primary-soft"] },
  barOn: { backgroundColor: colors.primary },
});
