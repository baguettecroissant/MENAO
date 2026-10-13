import { authErrorKind, LEGAL_DOCUMENT_VERSIONS, SIGNUP_REQUIRED_DOCUMENTS } from "@menao/core";
import { PASSWORD_MIN_LENGTH, signUpSchema } from "@menao/validation";
import { Link, router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { siteLinks } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import { Body, Button, Checkbox, LinkText, Notice, Screen, TextField, Title } from "@/ui";
import { theme } from "@/ui/theme";

type Field = "firstName" | "lastName" | "phone" | "email" | "password" | "acceptTerms";

/**
 * Inscription d'un particulier, comme sur le site : mêmes règles de validation, et mêmes
 * métadonnées lues par la base (profil, acceptation des documents légaux). Les artisans
 * s'inscrivent sur le site.
 */
export default function SignUp() {
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
    const input = parsed.data;
    const { error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: siteLinks.emailConfirmed,
        // Lu par le trigger app.after_auth_user_insert (profil et acceptations), comme sur le site.
        // Jamais de rôle ici : le rôle vit dans app_metadata, fixé côté base.
        data: {
          first_name: input.firstName,
          last_name: input.lastName,
          phone: input.phone ?? null,
          marketing_opt_in: input.marketingOptIn,
          legal: Object.fromEntries(
            SIGNUP_REQUIRED_DOCUMENTS.map((doc) => [doc, LEGAL_DOCUMENT_VERSIONS[doc]]),
          ),
        },
      },
    });
    setPending(false);
    if (error) return setFailure(fr.errors[authErrorKind(error.code)]);
    router.replace({ pathname: "/verifier-email", params: { email: input.email } });
  }

  return (
    <Screen>
      <Title>{fr.auth.signUpTitle}</Title>
      <Notice tone="info">{fr.auth.signUpText}</Notice>
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
      <Button label={fr.auth.signUp} onPress={submit} loading={pending} />
      <View style={styles.footer}>
        <Body muted>{fr.auth.haveAccount}</Body>
        <Link href="/connexion" style={styles.link}>
          {fr.auth.signIn}
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: theme.spacing(3) },
  half: { flex: 1 },
  links: { gap: theme.spacing(2), paddingLeft: theme.spacing(8.5) },
  link: { fontFamily: theme.font.medium, fontSize: 15, color: theme.colors["primary-strong"] },
  footer: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: theme.spacing(2) },
});
