import type { VoiceLine } from "@menao/core";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { linesFromDictation } from "@/lib/pro-quotes";
import { Button, Notice, TextField } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proQuote.dictation;
const { colors, font, radius, spacing } = theme;

/**
 * Dictée intelligente (F-19) : le texte dicté avec le micro du clavier du téléphone (ou écrit)
 * devient des lignes proposées par quote-from-voice, comme sur le site, à vérifier ensuite.
 */
export function QuoteDictation({
  chantierId,
  defaultVatBp,
  onLines,
  onClose,
}: {
  chantierId: string;
  defaultVatBp: number;
  onLines: (lines: VoiceLine[]) => void;
  onClose: () => void;
}) {
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function generate() {
    setError(null);
    setPending(true);
    const result = await linesFromDictation(chantierId, transcript, defaultVatBp);
    setPending(false);
    if ("error" in result) return setError(result.error);
    setTranscript("");
    onLines(result.lines);
  }

  return (
    <View style={styles.panel}>
      <Text role="heading" style={styles.title}>
        {t.title}
      </Text>
      <Text style={styles.small}>{t.example}</Text>
      <Text style={styles.small}>{t.keyboard}</Text>
      <TextField
        label={t.transcriptLabel}
        value={transcript}
        onChangeText={setTranscript}
        placeholder={t.placeholder}
        maxLength={5000}
        multiline
        autoFocus
      />
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button
        label={t.generate}
        onPress={generate}
        loading={pending}
        disabled={!transcript.trim()}
      />
      <Button label={t.close} variant="ghost" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: spacing(3),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors["primary-softer"],
    padding: spacing(4),
  },
  title: { fontFamily: font.medium, fontSize: 16, color: colors["primary-strong"] },
  small: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
});
