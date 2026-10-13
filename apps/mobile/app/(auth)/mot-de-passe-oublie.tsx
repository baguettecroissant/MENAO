import { passwordResetRequestSchema } from "@menao/validation";
import { Link } from "expo-router";
import { useState } from "react";
import { StyleSheet } from "react-native";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { siteLinks } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import { Body, Button, Notice, Screen, TextField, Title } from "@/ui";
import { theme } from "@/ui/theme";

/** Mot de passe oublié : le lien reçu s'ouvre sur le site, pour choisir un nouveau mot de passe. */
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit() {
    const parsed = passwordResetRequestSchema.safeParse({ email });
    if (!parsed.success) return setError(z.flattenError(parsed.error).fieldErrors.email?.[0]);
    setError(undefined);
    setPending(true);
    // Même réponse que le compte existe ou non (pas d'énumération des comptes).
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: siteLinks.resetPassword,
    });
    setPending(false);
    setSent(true);
  }

  return (
    <Screen>
      <Title>{fr.auth.resetTitle}</Title>
      <Body muted>{fr.auth.resetText}</Body>
      {sent && <Notice tone="success">{fr.auth.resetSent}</Notice>}
      <TextField
        label={fr.auth.email}
        value={email}
        onChangeText={setEmail}
        error={error}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <Button label={fr.auth.resetSubmit} onPress={submit} loading={pending} />
      <Link href="/connexion" style={styles.link}>
        {fr.auth.backToSignIn}
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: { fontFamily: theme.font.medium, fontSize: 15, color: theme.colors["primary-strong"] },
});
