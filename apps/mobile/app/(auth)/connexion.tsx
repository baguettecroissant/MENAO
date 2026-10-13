import { authErrorKind } from "@menao/core";
import { signInSchema } from "@menao/validation";
import { Link, router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { z } from "zod";
import { LogoMark } from "@/components/logo";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { isConfigured } from "@/lib/env";
import { closeAuth } from "@/lib/navigation";
import { supabase } from "@/lib/supabase";
import { Body, Button, LinkText, Notice, Screen, TextField, Title } from "@/ui";
import { theme } from "@/ui/theme";

type Errors = Partial<Record<"email" | "password", string>>;

/**
 * Connexion par e-mail et mot de passe (mêmes règles que le site), ouverte par-dessus l'écran
 * d'où l'on vient : on y revient une fois connecté.
 */
export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(isConfigured ? null : fr.errors.config);
  const [pending, setPending] = useState(false);

  async function submit() {
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      setErrors({ email: fields.email?.[0], password: fields.password?.[0] });
      return;
    }
    setErrors({});
    setFailure(null);
    setPending(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setPending(false);
    if (error) return setFailure(fr.errors[authErrorKind(error.code)]);
    closeAuth();
  }

  return (
    <Screen centered header={<TopBar />}>
      <View style={styles.brand}>
        <LogoMark size={48} />
        <Title>{fr.auth.signInTitle}</Title>
        <Body muted>{fr.auth.signInText}</Body>
      </View>
      {failure && <Notice tone="error">{failure}</Notice>}
      <TextField
        label={fr.auth.email}
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <TextField
        label={fr.auth.password}
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Button label={fr.auth.signIn} onPress={submit} loading={pending} disabled={!isConfigured} />
      <Link href="/mot-de-passe-oublie" style={styles.link}>
        {fr.auth.forgotPassword}
      </Link>
      <View style={styles.footer}>
        <Body muted>{fr.auth.noAccount}</Body>
        <LinkText label={fr.auth.createAccount} onPress={() => router.replace("/inscription")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { gap: theme.spacing(3), marginBottom: theme.spacing(2) },
  link: { fontFamily: theme.font.medium, fontSize: 15, color: theme.colors["primary-strong"] },
  footer: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: theme.spacing(2) },
});
