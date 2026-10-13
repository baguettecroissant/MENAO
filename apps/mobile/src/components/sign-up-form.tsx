import { PASSWORD_MIN_LENGTH, signUpSchema, type SignUp } from "@menao/validation";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { siteLinks } from "@/lib/env";
import { Button, Checkbox, LinkText, Notice, TextField } from "@/ui";
import { theme } from "@/ui/theme";

type Field = "firstName" | "lastName" | "phone" | "email" | "password" | "acceptTerms";

/**
 * Formulaire d'inscription d'un particulier, comme sur le site : mêmes règles de validation
 * (`signUpSchema`), acceptation des documents légaux. `onSubmit` reçoit les valeurs validées et
 * renvoie le message d'erreur à afficher, ou null.
 */
export function SignUpForm({
  submitLabel,
  onSubmit,
}: {
  submitLabel: string;
  onSubmit: (input: SignUp) => Promise<string | null>;
}) {
  const [values, setValues] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const set = (field: keyof typeof values) => (text: string) =>
    setValues((current) => ({ ...current, [field]: text }));

  async function submit() {
    const parsed = signUpSchema.safeParse({
      ...values,
      phone: values.phone.trim() ? values.phone : undefined,
      acceptTerms,
      marketingOptIn,
    });
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      setErrors(
        Object.fromEntries(Object.entries(fields).map(([key, messages]) => [key, messages?.[0]])),
      );
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
      <View style={styles.row}>
        <View style={styles.half}>
          <TextField
            label={fr.auth.firstName}
            value={values.firstName}
            onChangeText={set("firstName")}
            error={errors.firstName}
            autoComplete="given-name"
            textContentType="givenName"
          />
        </View>
        <View style={styles.half}>
          <TextField
            label={fr.auth.lastName}
            value={values.lastName}
            onChangeText={set("lastName")}
            error={errors.lastName}
            autoComplete="family-name"
            textContentType="familyName"
          />
        </View>
      </View>
      <TextField
        label={fr.auth.email}
        value={values.email}
        onChangeText={set("email")}
        error={errors.email}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <TextField
        label={fr.auth.phone}
        value={values.phone}
        onChangeText={set("phone")}
        error={errors.phone}
        autoComplete="tel"
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
      />
      <TextField
        label={fr.auth.password}
        value={values.password}
        onChangeText={set("password")}
        error={errors.password}
        hint={fr.auth.passwordHint(PASSWORD_MIN_LENGTH)}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <Checkbox
        label={fr.auth.acceptTerms}
        checked={acceptTerms}
        onChange={setAcceptTerms}
        error={errors.acceptTerms}
      />
      <View style={styles.links}>
        <LinkText
          label={fr.auth.readTerms}
          onPress={() => WebBrowser.openBrowserAsync(siteLinks.terms)}
        />
        <LinkText
          label={fr.auth.readPrivacy}
          onPress={() => WebBrowser.openBrowserAsync(siteLinks.privacy)}
        />
      </View>
      <Checkbox label={fr.auth.marketing} checked={marketingOptIn} onChange={setMarketingOptIn} />
      <Button label={submitLabel} onPress={submit} loading={pending} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: theme.spacing(4) },
  row: { flexDirection: "row", gap: theme.spacing(3) },
  half: { flex: 1 },
  links: { gap: theme.spacing(2), paddingLeft: theme.spacing(8.5) },
});
