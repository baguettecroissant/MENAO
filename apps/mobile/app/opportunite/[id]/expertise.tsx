import { expertiseSchema } from "@menao/validation";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { reportExpertise } from "@/lib/pro-requests";
import { useTrades } from "@/lib/trades";
import { Body, Button, Chip, Notice, Screen, TextField, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proExpertise;

/**
 * « Ce chantier a besoin d'une expertise » (F-17, F-18), comme sur le site : l'artisan indique le
 * corps de métier nécessaire ; l'équipe MENAO proposera un artisan adapté au client. `id` : la
 * demande (depuis l'opportunité ou la vue du rendez-vous).
 */
export default function ExpertiseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trades = useTrades();
  const [trade, setTrade] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{ trade?: string; message?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    const parsed = expertiseSchema.safeParse({ trade, message });
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      setErrors({ trade: fields.trade?.[0], message: fields.message?.[0] });
      return;
    }
    setErrors({});
    setFailure(null);
    setPending(true);
    const failed = await reportExpertise(id, parsed.data.trade, parsed.data.message);
    setPending(false);
    if (failed) return setFailure(failed);
    setSent(true);
  }

  if (sent) {
    return (
      <Screen
        header={<TopBar />}
        footer={<Button label={t.back} variant="secondary" onPress={() => router.back()} />}
      >
        <Title>{t.title}</Title>
        <Notice tone="success">{t.sent}</Notice>
      </Screen>
    );
  }
  return (
    <Screen
      header={<TopBar />}
      footer={<Button label={t.submit} onPress={submit} loading={pending} />}
    >
      <Title>{t.title}</Title>
      <Body muted>{t.intro}</Body>
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <View style={styles.group}>
        <Text style={styles.label}>{t.trade}</Text>
        <View style={styles.chips}>
          {trades.map((item) => (
            <Chip
              key={item.code}
              label={item.label}
              selected={trade === item.code}
              onPress={() => {
                setTrade(item.code);
                setErrors({});
              }}
            />
          ))}
        </View>
        {errors.trade ? <Text style={styles.error}>{errors.trade}</Text> : null}
      </View>
      <TextField
        label={t.message}
        value={message}
        onChangeText={setMessage}
        maxLength={2000}
        multiline
        error={errors.message}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: theme.spacing(2) },
  label: { fontFamily: theme.font.medium, fontSize: 15, color: theme.colors.foreground },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing(2) },
  error: { fontFamily: theme.font.regular, fontSize: 13, color: theme.colors.danger },
});
