import { signInSchema, type SignIn } from "@menao/validation";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { FicheButton } from "@/components/pro/fiche-kit";
import { ToolField } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { isConfigured } from "@/lib/env";
import { Notice } from "@/ui";
import { theme } from "@/ui/theme";

const { colors, font, spacing } = theme;
type Errors = Partial<Record<"email" | "password", string>>;

/**
 * Formulaire de connexion (mêmes règles que le site). `onSubmit` reçoit les valeurs validées et
 * renvoie le message d'erreur à afficher, ou null. Refonte « Nette » (lot 13) : champs arrondis en
 * 16 points, « Mot de passe oublié ? » à droite du libellé (`forgot`), bouton pleine largeur.
 */
export function SignInForm({
  submitLabel,
  onSubmit,
  forgot,
}: {
  submitLabel: string;
  onSubmit: (input: SignIn) => Promise<string | null>;
  /** Lien « Mot de passe oublié ? », à droite du libellé du mot de passe. */
  forgot?: { label: string; onPress: () => void };
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
      <ToolField
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
      <ToolField
        label={fr.auth.password}
        labelRight={
          forgot ? (
            <Pressable role="link" hitSlop={8} onPress={forgot.onPress}>
              <Text style={styles.forgot}>{forgot.label}</Text>
            </Pressable>
          ) : undefined
        }
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <FicheButton
        label={submitLabel}
        onPress={submit}
        tall
        loading={pending}
        disabled={!isConfigured}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing(3.5) },
  forgot: { fontFamily: font.semibold, fontSize: 13, color: colors["primary-strong"] },
});
