import { MAX_DICTATION_SECONDS, type VoiceLine } from "@menao/core";
import { Mic, Pause, Save, Sparkles, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { LevelBars } from "@/components/dictation-button";
import { fr } from "@/i18n/fr";
import { AiProgress } from "@/components/ai-progress";
import { linesFromDictation, loadSavedDictation, saveDictation } from "@/lib/pro-quotes";
import { useDictation } from "@/lib/use-dictation";
import { Button, Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proQuote.dictation;
const { colors, font, radius, spacing } = theme;

/**
 * Dictée intelligente (F-19), maquette « Dictez votre devis » et comme sur le site : enregistrement
 * par prises (2 minutes au total), chaque prise transcrite et ajoutée au texte (modifiable),
 * « Sauvegarder cet enregistrement » pour générer plus tard, puis lignes proposées par
 * quote-from-voice, à vérifier dans l'éditeur.
 */
export function QuoteDictation({
  chantierId,
  defaultVatBp,
  onLines,
}: {
  chantierId: string;
  defaultVatBp: number;
  onLines: (lines: VoiceLine[]) => void;
}) {
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  // Durée des prises déjà transcrites : la limite de 2 minutes vaut pour l'ensemble.
  const [before, setBefore] = useState(0);
  const taken = useRef(0);
  const dictation = useDictation({
    maxSeconds: MAX_DICTATION_SECONDS - before,
    onText: (text) => {
      setTranscript((current) => [current.trim(), text].filter(Boolean).join(" ").slice(0, 5000));
      addTaken();
    },
    onError: (failure) => {
      // Prise terminée sans texte (silence, échec) : sa durée compte. La limite atteinte est suivie
      // de la transcription, comptée à ce moment-là.
      if (failure && failure !== "limit" && failure !== "denied") addTaken();
      setError(failure ? t.errors[failure] : null);
    },
  });
  const elapsed = Math.min(MAX_DICTATION_SECONDS, before + dictation.seconds);

  function addTaken() {
    taken.current = Math.min(MAX_DICTATION_SECONDS, taken.current + dictation.seconds);
    setBefore(taken.current);
  }

  // Dictée sauvegardée auparavant pour ce chantier : reprise dans le texte.
  useEffect(() => {
    let active = true;
    loadSavedDictation(chantierId).then((saved) => {
      if (active && saved) setTranscript((current) => current || saved);
    });
    return () => {
      active = false;
    };
  }, [chantierId]);

  function discard() {
    dictation.discard();
    setTranscript("");
    taken.current = 0;
    setBefore(0);
    setError(null);
    setInfo(null);
  }

  async function save() {
    setError(null);
    setInfo(null);
    setSaving(true);
    const failed = await saveDictation(chantierId, transcript);
    setSaving(false);
    if (failed) setError(failed);
    else setInfo(t.saved);
  }

  async function generate() {
    setError(null);
    setInfo(null);
    setGenerating(true);
    const result = await linesFromDictation(chantierId, transcript, defaultVatBp);
    setGenerating(false);
    if ("error" in result) return setError(result.error);
    onLines(result.lines);
  }

  const listening = dictation.state === "listening";
  const transcribing = dictation.state === "transcribing";
  const busy = dictation.state !== "idle" || generating;
  const hasText = transcript.trim().length > 0;

  return (
    <View style={styles.panel}>
      <View style={styles.example}>
        <Sparkles size={14} color={colors["primary-strong"]} />
        <Text style={styles.exampleText}>{t.example}</Text>
      </View>
      <View style={styles.timer}>
        <View
          role="progressbar"
          aria-label={t.timer(elapsed, MAX_DICTATION_SECONDS)}
          aria-valuemin={0}
          aria-valuemax={MAX_DICTATION_SECONDS}
          aria-valuenow={elapsed}
          style={styles.track}
        >
          <View style={[styles.fill, { width: `${(elapsed / MAX_DICTATION_SECONDS) * 100}%` }]} />
        </View>
        <Text style={styles.small}>{t.timer(elapsed, MAX_DICTATION_SECONDS)}</Text>
      </View>
      <TextInput
        aria-label={t.transcriptLabel}
        value={transcript}
        onChangeText={(value) => {
          setTranscript(value);
          setInfo(null);
        }}
        placeholder={t.placeholder}
        placeholderTextColor={colors["subtle-foreground"]}
        maxLength={5000}
        multiline
        style={styles.input}
      />
      <View style={styles.controls}>
        <Pressable
          role="button"
          aria-label={t.discard}
          disabled={!hasText && !listening && elapsed === 0}
          onPress={discard}
          style={({ pressed }) => [
            styles.discard,
            !hasText && !listening && elapsed === 0 && styles.off,
            pressed && styles.pressed,
          ]}
        >
          <X size={18} color={colors["primary-foreground"]} />
        </Pressable>
        <Pressable
          role="button"
          aria-label={listening ? t.pause : elapsed > 0 ? t.resume : t.record}
          aria-pressed={listening}
          aria-busy={transcribing}
          disabled={transcribing || generating}
          onPress={listening ? dictation.stop : dictation.start}
          style={({ pressed }) => [styles.record, pressed && styles.pressed]}
        >
          {transcribing ? (
            <ActivityIndicator color={colors["primary-foreground"]} />
          ) : listening ? (
            <Pause size={24} color={colors["primary-foreground"]} />
          ) : (
            <Mic size={24} color={colors["primary-foreground"]} />
          )}
        </Pressable>
      </View>
      <View aria-live="polite" style={styles.status}>
        {listening ? <LevelBars level={dictation.level} /> : null}
        <Text style={[styles.small, listening && dictation.quiet && styles.quiet]}>
          {transcribing
            ? t.transcribing
            : listening
              ? dictation.quiet
                ? t.quiet
                : t.recording
              : ""}
        </Text>
      </View>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {info ? <Notice tone="success">{info}</Notice> : null}
      <View style={styles.saveBlock}>
        <Pressable
          role="button"
          disabled={!hasText || busy || saving}
          onPress={save}
          style={({ pressed }) => [styles.saveRow, pressed && styles.pressed]}
        >
          <Text style={[styles.saveText, (!hasText || busy || saving) && styles.saveOff]}>
            {t.save}
          </Text>
          <Save
            size={15}
            color={
              !hasText || busy || saving ? colors["subtle-foreground"] : colors["primary-strong"]
            }
          />
        </Pressable>
        <Text style={[styles.small, styles.center]}>{t.saveHint}</Text>
      </View>
      {generating ? <AiProgress steps={fr.aiProgress.quote} /> : null}
      <Button
        label={generating ? t.generating : t.generate}
        onPress={generate}
        loading={generating}
        disabled={!hasText || busy}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: spacing(3) },
  example: { flexDirection: "row", alignItems: "flex-start", gap: spacing(2) },
  exampleText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["primary-strong"],
  },
  timer: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  track: {
    flex: 1,
    height: 6,
    overflow: "hidden",
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  fill: { height: 6, borderRadius: radius.pill, backgroundColor: colors.primary },
  small: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  center: { textAlign: "center" },
  input: {
    minHeight: 120,
    maxHeight: 220,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(3),
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.foreground,
    textAlignVertical: "top",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(6),
  },
  discard: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  off: { backgroundColor: colors["border-strong"] },
  record: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.85 },
  status: {
    minHeight: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(2),
  },
  quiet: { fontFamily: font.medium, color: colors.warning },
  saveBlock: { alignItems: "center", gap: spacing(1) },
  saveRow: { flexDirection: "row", alignItems: "center", gap: spacing(1.5), padding: spacing(1) },
  saveText: { fontFamily: font.medium, fontSize: 14, color: colors["primary-strong"] },
  saveOff: { color: colors["subtle-foreground"] },
});
