import { ACCOUNT_DELETION_MESSAGE_MAX_LENGTH, accountDeletionSchema } from "@menao/validation";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { z } from "zod";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { loadDeletionRequest, requestAccountDeletion } from "@/lib/account";
import { formatDay } from "@/lib/format";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, Checkbox, Notice, Screen, TextField, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.account.deletion;

/**
 * Suppression du compte depuis l'application (Apple 5.1.1 v), comme sur le site : demande
 * confirmée, remarque facultative ; l'équipe MENAO la traite sous un mois (RGPD), les documents
 * que la loi impose de garder (factures) étant conservés.
 */
export default function AccountDeletionScreen() {
  const [pendingSince, reload] = useFocusData(loadDeletionRequest);
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [errors, setErrors] = useState<{ confirm?: string; message?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (pendingSince === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  async function submit() {
    const parsed = accountDeletionSchema.safeParse({ confirm, message });
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      setErrors({ confirm: fields.confirm?.[0], message: fields.message?.[0] });
      return;
    }
    setErrors({});
    setFailure(null);
    setSending(true);
    const createdAt = await requestAccountDeletion(parsed.data.message);
    setSending(false);
    if (!createdAt) return setFailure(t.error);
    setSent(true);
    await reload();
  }

  if (pendingSince) {
    return (
      <Screen
        header={<TopBar />}
        footer={<Button label={t.back} variant="secondary" onPress={() => router.back()} />}
      >
        <Title>{t.title}</Title>
        {sent ? <Notice tone="success">{t.sent}</Notice> : null}
        <Notice tone="info">{t.pending(formatDay(pendingSince))}</Notice>
      </Screen>
    );
  }
  return (
    <Screen
      header={<TopBar />}
      footer={<Button label={t.submit} onPress={submit} loading={sending} />}
    >
      <Title>{t.title}</Title>
      <Body muted>{t.intro}</Body>
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <TextField
        label={t.message}
        value={message}
        onChangeText={setMessage}
        maxLength={ACCOUNT_DELETION_MESSAGE_MAX_LENGTH}
        multiline
        error={errors.message}
      />
      <Checkbox
        label={t.confirm}
        checked={confirm}
        onChange={(value) => {
          setConfirm(value);
          setErrors({});
        }}
        error={errors.confirm}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
});
