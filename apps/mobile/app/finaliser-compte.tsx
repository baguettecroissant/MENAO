import { completeSignupSchema } from "@menao/validation";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { z } from "zod";
import { AuthScreen, AuthSwitch } from "@/components/auth-kit";
import { FicheButton } from "@/components/pro/fiche-kit";
import { CheckRow, FieldPair, ToolField } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { continueAfterSignIn } from "@/lib/after-sign-in";
import { signOut } from "@/lib/auth";
import { siteLinks } from "@/lib/env";
import { completeOAuthSignup, loadSignupProfile, type SignupProfile } from "@/lib/oauth";
import { useFocusData } from "@/lib/use-focus-data";
import { LinkText, Notice, ScreenSkeleton } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.completeSignup;
const a = fr.auth;
type Field = "firstName" | "lastName" | "phone" | "acceptTerms";

/**
 * « Finaliser mon compte » (ADR 0108), comme sur le site : après une première connexion avec
 * Google ou Apple, le client vérifie son nom, ajoute son téléphone s'il le souhaite et accepte les
 * CGU. Le garde de l'application (app/_layout.tsx) y ramène tant que ce n'est pas fait.
 * Refonte « Nette » (lot 13) : logo, grand titre, champs arrondis, cases bleu nuit.
 */
export default function CompleteSignupScreen() {
  const [profile] = useFocusData(loadSignupProfile);
  if (profile === undefined) return <ScreenSkeleton />;
  return (
    <AuthScreen
      back={false}
      title={t.title}
      lead={profile ? t.intro(profile.provider, profile.email) : undefined}
    >
      <CompleteSignupForm profile={profile} />
      <AuthSwitch
        label={t.notYou}
        onPress={async () => {
          await signOut();
          router.replace("/");
        }}
      />
    </AuthScreen>
  );
}

function CompleteSignupForm({ profile }: { profile: SignupProfile | null }) {
  const [values, setValues] = useState({
    firstName: profile?.firstName ?? "",
    lastName: profile?.lastName ?? "",
    phone: "",
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const set = (key: keyof typeof values) => (text: string) => {
    setValues((prev) => ({ ...prev, [key]: text }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  async function submit() {
    const parsed = completeSignupSchema.safeParse({ ...values, acceptTerms, marketingOptIn });
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      setErrors({
        firstName: fields.firstName?.[0],
        lastName: fields.lastName?.[0],
        phone: fields.phone?.[0],
        acceptTerms: fields.acceptTerms?.[0],
      });
      return;
    }
    setErrors({});
    setFailure(null);
    setPending(true);
    const error = await completeOAuthSignup(parsed.data);
    if (error) {
      setPending(false);
      return setFailure(error);
    }
    await continueAfterSignIn();
  }

  return (
    <View style={styles.form}>
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <FieldPair>
        <ToolField
          label={a.firstName}
          value={values.firstName}
          onChangeText={set("firstName")}
          error={errors.firstName}
          autoComplete="given-name"
          textContentType="givenName"
          style={styles.half}
        />
        <ToolField
          label={a.lastName}
          value={values.lastName}
          onChangeText={set("lastName")}
          error={errors.lastName}
          autoComplete="family-name"
          textContentType="familyName"
          style={styles.half}
        />
      </FieldPair>
      <ToolField
        label={a.phone}
        value={values.phone}
        onChangeText={set("phone")}
        error={errors.phone}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
      />
      <CheckRow
        label={a.acceptTerms}
        checked={acceptTerms}
        onChange={(checked) => {
          setAcceptTerms(checked);
          setErrors((prev) => ({ ...prev, acceptTerms: undefined }));
        }}
        error={errors.acceptTerms}
      />
      <View style={styles.links}>
        <LinkText
          label={a.readTerms}
          onPress={() => WebBrowser.openBrowserAsync(siteLinks.terms)}
        />
        <LinkText
          label={a.readPrivacy}
          onPress={() => WebBrowser.openBrowserAsync(siteLinks.privacy)}
        />
      </View>
      <CheckRow label={a.marketing} checked={marketingOptIn} onChange={setMarketingOptIn} />
      <FicheButton label={t.submit} onPress={submit} tall loading={pending} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: theme.spacing(3.5) },
  half: { flex: 1 },
  // Liens sous la case des conditions, alignés sur son libellé (case de 24 px + 12 px).
  links: { gap: theme.spacing(2), paddingLeft: theme.spacing(9), marginTop: -theme.spacing(1.5) },
});
