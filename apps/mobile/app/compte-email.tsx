import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ActionScreen, ActionSubmit } from "@/components/pro/action-kit";
import { FicheCard, FicheSkeleton } from "@/components/pro/fiche-kit";
import { ToolField } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { changeEmail, loadAccount } from "@/lib/account";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.account.email;
const { colors, font, spacing } = theme;

/**
 * Adresse e-mail (F-08), comme sur le site : la nouvelle adresse est confirmée par les liens
 * envoyés aux deux adresses, ouverts sur le site. Refonte « Nette » (lot 13) : grand titre,
 * adresse actuelle et nouveau champ en carte, bouton collé en bas.
 */
export default function AccountEmailScreen() {
  const [account, reload] = useFocusData(loadAccount);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<Awaited<ReturnType<typeof changeEmail>>>({});
  const [pending, setPending] = useState(false);

  if (account === undefined) return <FicheSkeleton />;
  if (account === null) {
    return (
      <ActionScreen title={t.title} onRefresh={reload}>
        <Notice tone="error">{fr.account.errors.unavailable}</Notice>
      </ActionScreen>
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
    <ActionScreen
      title={t.title}
      footer={<ActionSubmit label={t.submit} onPress={submit} loading={pending} />}
    >
      {state.success ? <Notice tone="success">{state.success}</Notice> : null}
      {account.pendingEmail && !state.success ? (
        <Notice tone="info">{t.pending(account.pendingEmail)}</Notice>
      ) : null}
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      <FicheCard padding={4} gap={3.5}>
        <View style={styles.current}>
          <Text style={styles.currentLabel}>{t.current}</Text>
          <Text style={styles.currentEmail}>{account.email}</Text>
        </View>
        <ToolField
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
      </FicheCard>
    </ActionScreen>
  );
}

const styles = StyleSheet.create({
  current: {
    gap: 2,
    paddingBottom: spacing(3.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  currentLabel: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  currentEmail: { fontFamily: font.semibold, fontSize: 16, color: colors.foreground },
});
