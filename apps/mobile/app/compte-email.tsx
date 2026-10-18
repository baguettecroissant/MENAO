import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { changeEmail, loadAccount } from "@/lib/account";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, Notice, Screen, ScreenSkeleton, TextField, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.account.email;

/**
 * Adresse e-mail (F-08), comme sur le site : la nouvelle adresse est confirmée par les liens
 * envoyés aux deux adresses, ouverts sur le site.
 */
export default function AccountEmailScreen() {
  const [account, reload] = useFocusData(loadAccount);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<Awaited<ReturnType<typeof changeEmail>>>({});
  const [pending, setPending] = useState(false);

  if (account === undefined) return <ScreenSkeleton header={<TopBar />} />;
  if (account === null) {
    return (
      <Screen onRefresh={reload} header={<TopBar />}>
        <Title>{t.title}</Title>
        <Notice tone="error">{fr.account.errors.unavailable}</Notice>
      </Screen>
    );
  }

  async function submit() {
    if (!account) return;
    setPending(true);
    const result = await changeEmail(email, account.email);
    setPending(false);
    setState(result);
    if (result.success) {
      setEmail("");
      await reload();
    }
  }

  return (
    <Screen
      header={<TopBar />}
      footer={<Button label={t.submit} onPress={submit} loading={pending} />}
    >
      <Title>{t.title}</Title>
      <View>
        <Body muted>{t.current}</Body>
        <Text style={styles.email}>{account.email}</Text>
      </View>
      {state.success ? <Notice tone="success">{state.success}</Notice> : null}
      {account.pendingEmail && !state.success ? (
        <Notice tone="info">{t.pending(account.pendingEmail)}</Notice>
      ) : null}
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      <TextField
        label={t.label}
        value={email}
        onChangeText={setEmail}
        error={state.fieldErrors?.email}
        hint={t.hint}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  email: { fontFamily: theme.font.medium, fontSize: 16, color: theme.colors.foreground },
});
