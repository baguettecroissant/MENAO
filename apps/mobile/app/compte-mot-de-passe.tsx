import { PASSWORD_MIN_LENGTH } from "@menao/validation";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { ActionScreen, ActionSubmit } from "@/components/pro/action-kit";
import { FicheCard } from "@/components/pro/fiche-kit";
import { ToolField } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { changePassword } from "@/lib/account";
import { Notice, toast } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.account.password;

/**
 * Mot de passe (F-08), comme sur le site : l'actuel, puis le nouveau ; les autres appareils sont
 * ensuite déconnectés. Refonte « Nette » (lot 13) : grand titre, champs en carte, « Mot de passe
 * oublié ? » à droite du libellé, bouton collé en bas.
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
    <ActionScreen
      title={t.title}
      footer={<ActionSubmit label={t.submit} onPress={submit} loading={pending} />}
    >
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      <FicheCard padding={4} gap={3.5}>
        <ToolField
          label={t.current}
          labelRight={
            <Pressable role="link" hitSlop={8} onPress={() => router.push("/mot-de-passe-oublie")}>
              <Text style={styles.forgot}>{t.forgot}</Text>
            </Pressable>
          }
          value={currentPassword}
          onChangeText={setCurrentPassword}
          error={errors.currentPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
        />
        <ToolField
          label={t.new}
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          hint={fr.auth.passwordHint(PASSWORD_MIN_LENGTH)}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
        />
      </FicheCard>
    </ActionScreen>
  );
}

const styles = StyleSheet.create({
  forgot: {
    fontFamily: theme.font.semibold,
    fontSize: 13,
    color: theme.colors["primary-strong"],
  },
});
