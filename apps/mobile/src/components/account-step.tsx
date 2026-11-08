import type { LotSelection } from "@menao/validation";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { OAuthButtons } from "@/components/oauth-buttons";
import { PageHead } from "@/components/pro/dossier-kit";
import { CardHeading, FicheCard } from "@/components/pro/fiche-kit";
import { SignInForm } from "@/components/sign-in-form";
import { SignUpForm } from "@/components/sign-up-form";
import { fr } from "@/i18n/fr";
import { continueAfterSignIn } from "@/lib/after-sign-in";
import { prepareProviderSignIn, signInForRequest, signUpForRequest } from "@/lib/requests";
import { Body, Button, Notice } from "@/ui";
import { theme } from "@/ui/theme";

const r = fr.request;

/**
 * Dernière étape avant l'envoi, sans compte (F-08), d'après la maquette « Dernière étape » et comme
 * sur le site : « Informations personnelles », « Créer mon espace client MENAO », puis « Vous avez
 * déjà un espace MENAO ? ». Le projet de la session anonyme est rattaché au compte. Après
 * l'inscription, le lien de confirmation arrive par e-mail ; on se connecte ensuite ici pour
 * envoyer la demande. Au-dessus, « Continuer avec Google / Apple » (ADR 0108) : la demande reprend
 * après la connexion, ou après « Finaliser mon compte » pour un nouveau compte. Grand titre et
 * cartes « Nette » (lot 12).
 */
export function AccountStep({
  projectId,
  artisanIds,
  lots = [],
}: {
  projectId: string;
  artisanIds: string[];
  /** Artisans des autres métiers du chantier (ADR 0170), gardés jusqu'à l'envoi. */
  lots?: LotSelection;
}) {
  const [mode, setMode] = useState<"signUp" | "signIn">("signUp");
  const [emailSent, setEmailSent] = useState(false);

  return (
    <>
      <PageHead title={r.accountTitle} lead={r.accountIntro} />
      {emailSent && <Notice tone="success">{r.checkEmail}</Notice>}
      <OAuthButtons
        prepare={() => prepareProviderSignIn(projectId, artisanIds, lots)}
        onSignedIn={(pending) =>
          pending ? router.replace("/finaliser-compte") : continueAfterSignIn()
        }
      />
      {mode === "signUp" ? (
        <SignUpForm
          submitLabel={r.signUpSubmit}
          sections={{
            personal: { title: r.personalTitle, intro: r.personalIntro, phoneHint: r.phoneHint },
            space: { title: r.spaceTitle, intro: r.spaceIntro, free: r.free },
          }}
          onSubmit={async (input) => {
            const error = await signUpForRequest(projectId, artisanIds, input, lots);
            if (!error) {
              setEmailSent(true);
              setMode("signIn");
            }
            return error;
          }}
        />
      ) : (
        <FicheCard padding={4.5} gap={3}>
          <CardHeading title={r.signInTitle} />
          <SignInForm
            submitLabel={r.signInSubmit}
            onSubmit={(input) => signInForRequest(projectId, input)}
          />
        </FicheCard>
      )}
      <View style={styles.switch}>
        <Text style={styles.switchTitle}>
          {mode === "signUp" ? r.haveAccountTitle : r.noAccountTitle}
        </Text>
        {mode === "signUp" ? <Body muted>{r.haveAccountText}</Body> : null}
        <Button
          label={mode === "signUp" ? r.haveAccountButton : r.backToSignUp}
          variant="secondary"
          onPress={() => setMode(mode === "signUp" ? "signIn" : "signUp")}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  switch: {
    gap: theme.spacing(2.5),
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors["primary-soft"],
    padding: theme.spacing(4.5),
  },
  switchTitle: { fontFamily: theme.font.semibold, fontSize: 15, color: theme.colors.foreground },
});
