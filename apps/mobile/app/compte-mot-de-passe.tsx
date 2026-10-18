import { PASSWORD_MIN_LENGTH } from "@menao/validation";
import { router } from "expo-router";
import { useState } from "react";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { changePassword } from "@/lib/account";
import { Button, LinkText, Notice, Screen, TextField, Title, toast } from "@/ui";

const t = fr.account.password;

/**
 * Mot de passe (F-08), comme sur le site : l'actuel, puis le nouveau ; les autres appareils sont
 * ensuite déconnectés.
 */
export default function AccountPasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<Awaited<ReturnType<typeof changePassword>>>({});
  const [pending, setPending] = useState(false);
  const errors = state.fieldErrors ?? {};

  async function submit() {
    setPending(true);
    const result = await changePassword(currentPassword, password);
    setPending(false);
    setState(result.success ? {} : result);
    if (result.success) {
      toast.success(result.success);
      setCurrentPassword("");
      setPassword("");
    }
  }

  return (
    <Screen
      header={<TopBar />}
      footer={<Button label={t.submit} onPress={submit} loading={pending} />}
    >
      <Title>{t.title}</Title>
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      <TextField
        label={t.current}
        value={currentPassword}
        onChangeText={setCurrentPassword}
        error={errors.currentPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
      />
      <TextField
        label={t.new}
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        hint={fr.auth.passwordHint(PASSWORD_MIN_LENGTH)}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <LinkText label={t.forgot} onPress={() => router.push("/mot-de-passe-oublie")} />
    </Screen>
  );
}
