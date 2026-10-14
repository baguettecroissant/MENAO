import { PASSWORD_MIN_LENGTH, signUpSchema, type SignUp } from "@menao/validation";
import * as WebBrowser from "expo-web-browser";
import { CircleCheck, ShieldCheck } from "lucide-react-native";
import { type ReactNode, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { siteLinks } from "@/lib/env";
import { Body, Button, Card, Checkbox, LinkText, Notice, TextField } from "@/ui";
import { theme } from "@/ui/theme";

type Field = "firstName" | "lastName" | "phone" | "email" | "password" | "acceptTerms";

/** Cartes de la maquette « Dernière étape » (envoi de la demande sans compte). */
export type SignUpSections = {
  personal: { title: string; intro: string; phoneHint: string };
  space: { title: string; intro: string; free: string };
};

/**
 * Formulaire d'inscription d'un particulier, comme sur le site : mêmes règles de validation
 * (`signUpSchema`), acceptation des documents légaux. `onSubmit` reçoit les valeurs validées et
 * renvoie le message d'erreur à afficher, ou null. Avec `sections`, les champs se rangent en deux
 * cartes, « Informations personnelles » puis « Créer mon espace client », dont le titre passe au
 * vert une fois remplie (maquette « Dernière étape »).
 */
export function SignUpForm({
  submitLabel,
  onSubmit,
  sections,
}: {
  submitLabel: string;
  onSubmit: (input: SignUp) => Promise<string | null>;
  sections?: SignUpSections;
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

  const names = (
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
  );
  const email = (
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
  );
  const phone = (
    <TextField
      label={fr.auth.phone}
      value={values.phone}
      onChangeText={set("phone")}
      error={errors.phone}
      hint={sections?.personal.phoneHint}
      autoComplete="tel"
      keyboardType="phone-pad"
      textContentType="telephoneNumber"
    />
  );
  const password = (
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
  );
  const consents = (
    <>
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
    </>
  );
  const submitButton = <Button label={submitLabel} onPress={submit} loading={pending} />;

  if (sections) {
    const personalDone = Boolean(values.firstName.trim() && values.lastName.trim());
    const spaceDone = Boolean(
      values.email.trim() && values.password.length >= PASSWORD_MIN_LENGTH && acceptTerms,
    );
    return (
      <View style={styles.form}>
        {failure && <Notice tone="error">{failure}</Notice>}
        <Card>
          <SectionTitle done={personalDone}>{sections.personal.title}</SectionTitle>
          <Body muted>{sections.personal.intro}</Body>
          {names}
          {phone}
        </Card>
        <Card>
          <SectionTitle done={spaceDone}>{sections.space.title}</SectionTitle>
          <Body muted>{sections.space.intro}</Body>
          {email}
          {password}
          <View style={styles.free}>
            <ShieldCheck size={16} color={theme.colors["primary-strong"]} />
            <Text style={styles.freeText}>{sections.space.free}</Text>
          </View>
          {consents}
        </Card>
        {submitButton}
      </View>
    );
  }
  return (
    <View style={styles.form}>
      {failure && <Notice tone="error">{failure}</Notice>}
      {names}
      {email}
      {phone}
      {password}
      {consents}
      {submitButton}
    </View>
  );
}

/** Titre d'une carte, vert avec une coche une fois la carte remplie (maquette). */
function SectionTitle({ done, children }: { done: boolean; children: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Text role="heading" style={[styles.sectionText, done && styles.sectionDone]}>
        {children}
      </Text>
      {done ? <CircleCheck size={18} color={theme.colors.success} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: theme.spacing(4) },
  row: { flexDirection: "row", gap: theme.spacing(3) },
  half: { flex: 1 },
  links: { gap: theme.spacing(2), paddingLeft: theme.spacing(8.5) },
  sectionTitle: { flexDirection: "row", alignItems: "center", gap: theme.spacing(2) },
  sectionText: {
    flexShrink: 1,
    fontFamily: theme.font.medium,
    fontSize: 17,
    color: theme.colors.foreground,
  },
  sectionDone: { color: theme.colors.success },
  free: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing(2),
    borderRadius: theme.radius.input,
    backgroundColor: theme.colors["primary-soft"],
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(2.5),
  },
  freeText: {
    flex: 1,
    fontFamily: theme.font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors["primary-strong"],
  },
});
