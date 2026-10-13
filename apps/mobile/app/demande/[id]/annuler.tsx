import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { cancelRequest, type CancelReason } from "@/lib/chantiers";
import { Body, Button, Notice, Screen, TextField, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.clientCancel;
const { colors, font, radius, spacing } = theme;
const REASONS = Object.keys(t.reasons) as CancelReason[];

/** Annulation d'une demande par le client (F-11) : motif, mot facultatif pour l'artisan. */
export default function CancelRequest() {
  const { id, artisan = "" } = useLocalSearchParams<{ id: string; artisan?: string }>();
  const [reason, setReason] = useState<CancelReason | null>(null);
  const [comment, setComment] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    if (!reason) return;
    setFailure(null);
    setPending(true);
    const error = await cancelRequest(id, reason, comment);
    setPending(false);
    if (error) return setFailure(error);
    router.back();
  }

  return (
    <Screen header={<TopBar />}>
      <Title>{t.title}</Title>
      <Body muted>{t.intro(artisan)}</Body>
      <Text style={styles.legend}>{t.reasonsLegend}</Text>
      <View role="radiogroup" style={styles.reasons}>
        {REASONS.map((r) => (
          <Pressable
            key={r}
            role="radio"
            aria-checked={reason === r}
            onPress={() => setReason(r)}
            style={[styles.reason, reason === r && styles.reasonOn]}
          >
            <View style={[styles.radio, reason === r && styles.radioOn]}>
              {reason === r && <View style={styles.radioDot} />}
            </View>
            <Text style={styles.reasonText}>{t.reasons[r]}</Text>
          </Pressable>
        ))}
      </View>
      <TextField
        label={t.comment}
        value={comment}
        onChangeText={setComment}
        maxLength={500}
        multiline
      />
      {failure && <Notice tone="error">{failure}</Notice>}
      <Button label={t.submit} onPress={submit} loading={pending} disabled={!reason} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  legend: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  reasons: { gap: spacing(2) },
  reason: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    minHeight: theme.touchTarget + 4,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(4),
  },
  reasonOn: { borderColor: colors.primary, backgroundColor: colors["primary-softer"] },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors["border-strong"],
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },
  reasonText: { flex: 1, fontFamily: font.regular, fontSize: 15, color: colors.foreground },
});
