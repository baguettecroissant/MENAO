import { signInSchema, type SignIn } from "@menao/validation";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { isConfigured } from "@/lib/env";
import { Button, Notice, TextField } from "@/ui";
import { theme } from "@/ui/theme";

type Errors = Partial<Record<"email" | "password", string>>;

/**
 * Formulaire de connexion (mêmes règles que le site). `onSubmit` reçoit les valeurs validées et
 * renvoie le message d'erreur à afficher, ou null.
 */
export function SignInForm({
  submitLabel,
  onSubmit,
}: {
  submitLabel: string;
  onSubmit: (input: SignIn) => Promise<string | null>;
}) {
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
    const error = await onSubmit(parsed.data);
    setPending(false);
    if (error) setFailure(error);
  }

  return (
    <View style={styles.form}>
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
      <Button label={submitLabel} onPress={submit} loading={pending} disabled={!isConfigured} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: theme.spacing(4) },
});
