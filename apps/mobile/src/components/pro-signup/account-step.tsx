import type { ArtisanSignupDraft } from "@menao/core";
import {
  PASSWORD_MIN_LENGTH,
  artisanAccountSchema,
  artisanOAuthAccountSchema,
  artisanSignupProfileSchema,
} from "@menao/validation";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { z } from "zod";
import { OAuthButtons } from "@/components/oauth-buttons";
import { fr } from "@/i18n/fr";
import { completeArtisanOAuth, signUpArtisan } from "@/lib/artisan-signup";
import { siteLinks } from "@/lib/env";
import { Button, Checkbox, LinkText, Notice, TextField } from "@/ui";
import { theme } from "@/ui/theme";
import { StepTitle } from "./signup-parts";

const t = fr.proSignup.account;
const a = fr.auth;

type Field =
  "firstName" | "lastName" | "phone" | "email" | "password" | "acceptTerms" | "acceptCgv";

/** Choix du parcours, dans la forme attendue par les schémas partagés avec le site. */
export function signupProfile(draft: ArtisanSignupDraft) {
  return artisanSignupProfileSchema.safeParse({
    tradeCodes: draft.tradeCodes,
    siret: draft.company?.siret,
    isDirigeant: draft.isDirigeant,
    assujettiTva: draft.assujettiTva,
    zone: draft.base && {
      mode: "rayon",
      baseLabel: draft.base.label,
      baseCitycode: draft.base.citycode,
      lon: draft.base.lon,
      lat: draft.base.lat,
      radiusKm: draft.radiusKm,
    },
  });
}

/**
 * Étape « compte » : par e-mail (code reçu ensuite), ou finalisation après Google ou Apple
 * (`oauth` : nom repris du fournisseur, sans adresse ni mot de passe).
 */
export function AccountStep({
  draft,
  oauth,
  onCodeSent,
  onProfileInvalid,
  onDone,
}: {
  draft: ArtisanSignupDraft;
  oauth: { firstName: string; lastName: string } | null;
  onCodeSent: (email: string) => void;
  onProfileInvalid: () => void;
  /** Compte artisan créé après Google ou Apple. */
  onDone: () => void;
}) {
  // Le dirigeant qui s'est reconnu à l'étape « entreprise » n'a pas à retaper son nom.
  const manager = draft.isDirigeant ? draft.company?.managers[0] : undefined;
  const [values, setValues] = useState({
    firstName: oauth?.firstName || manager?.firstName || "",
    lastName: oauth?.lastName || manager?.lastName || "",
    phone: "",
    email: "",
    password: "",
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptCgv, setAcceptCgv] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const set = (field: keyof typeof values) => (text: string) =>
    setValues((current) => ({ ...current, [field]: text }));

  async function submit() {
    const profile = signupProfile(draft);
    if (!profile.success) return onProfileInvalid();
    const input = { ...values, acceptTerms, acceptCgv, marketingOptIn };
    const parsed = oauth
      ? artisanOAuthAccountSchema.safeParse(input)
      : artisanAccountSchema.safeParse(input);
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors as Record<
        string,
        string[] | undefined
      >;
      return setErrors(
        Object.fromEntries(Object.entries(fields).map(([key, list]) => [key, list?.[0]])),
      );
    }
    setErrors({});
    setFailure(null);
    setPending(true);
    if (oauth) {
      const error = await completeArtisanOAuth(profile.data, parsed.data);
      setPending(false);
      return error ? setFailure(error) : onDone();
    }
    const account = artisanAccountSchema.parse(input);
    const error = await signUpArtisan(profile.data, account);
    setPending(false);
    if (error) return setFailure(error);
    onCodeSent(account.email);
  }

  return (
    <>
      <StepTitle title={oauth ? t.oauthTitle : t.title} lead={oauth ? t.oauthLead : t.lead} />
      {/* Retour de Google ou Apple : l'écran du parcours reprend selon la session (nouveau compte
          à finaliser ici, artisan existant vers son espace). */}
      {!oauth ? <OAuthButtons onSignedIn={() => undefined} /> : null}
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <View style={styles.row}>
        <View style={styles.half}>
          <TextField
            label={a.firstName}
            value={values.firstName}
            onChangeText={set("firstName")}
            autoComplete="given-name"
            error={errors.firstName}
          />
        </View>
        <View style={styles.half}>
          <TextField
            label={a.lastName}
            value={values.lastName}
            onChangeText={set("lastName")}
            autoComplete="family-name"
            error={errors.lastName}
          />
        </View>
      </View>
      {!oauth ? (
        <>
          <TextField
            label={t.email}
            value={values.email}
            onChangeText={set("email")}
            autoComplete="email"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />
          <TextField
            label={a.password}
            value={values.password}
            onChangeText={set("password")}
            autoComplete="new-password"
            secureTextEntry
            hint={a.passwordHint(PASSWORD_MIN_LENGTH)}
            error={errors.password}
          />
        </>
      ) : null}
      <TextField
        label={t.phone}
        value={values.phone}
        onChangeText={set("phone")}
        autoComplete="tel"
        keyboardType="phone-pad"
        hint={t.phoneHint}
        error={errors.phone}
      />
      <Checkbox
        label={a.acceptTerms}
        checked={acceptTerms}
        onChange={setAcceptTerms}
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
      <Checkbox
        label={t.acceptCgv}
        checked={acceptCgv}
        onChange={setAcceptCgv}
        error={errors.acceptCgv}
      />
      <LinkText
        label={t.readCgv}
        onPress={() => WebBrowser.openBrowserAsync(siteLinks.cgvArtisans)}
      />
      <Checkbox label={a.marketing} checked={marketingOptIn} onChange={setMarketingOptIn} />
      <Button label={oauth ? t.oauthSubmit : t.submit} onPress={submit} loading={pending} />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: theme.spacing(3) },
  half: { flex: 1 },
  links: { gap: theme.spacing(2) },
});
