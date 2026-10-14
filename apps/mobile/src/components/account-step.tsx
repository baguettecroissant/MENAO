import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SignInForm } from "@/components/sign-in-form";
import { SignUpForm } from "@/components/sign-up-form";
import { fr } from "@/i18n/fr";
import { signInForRequest, signUpForRequest } from "@/lib/requests";
import { Body, Button, Card, Notice, Title } from "@/ui";
import { theme } from "@/ui/theme";

const r = fr.request;

/**
 * Dernière étape avant l'envoi, sans compte (F-08), d'après la maquette « Dernière étape » et comme
 * sur le site : « Informations personnelles », « Créer mon espace client MENAO », puis « Vous avez
 * déjà un espace MENAO ? ». Le projet de la session anonyme est rattaché au compte. Après
 * l'inscription, le lien de confirmation arrive par e-mail ; on se connecte ensuite ici pour
 * envoyer la demande.
 */
export function AccountStep({
  projectId,
  artisanIds,
}: {
  projectId: string;
  artisanIds: string[];
}) {
  const [mode, setMode] = useState<"signUp" | "signIn">("signUp");
  const [emailSent, setEmailSent] = useState(false);

  return (
    <>
      <Title>{r.accountTitle}</Title>
      <Body muted>{r.accountIntro}</Body>
      {emailSent && <Notice tone="success">{r.checkEmail}</Notice>}
      {mode === "signUp" ? (
        <SignUpForm
          submitLabel={r.signUpSubmit}
          sections={{
            personal: { title: r.personalTitle, intro: r.personalIntro, phoneHint: r.phoneHint },
            space: { title: r.spaceTitle, intro: r.spaceIntro, free: r.free },
          }}
          onSubmit={async (input) => {
            const error = await signUpForRequest(projectId, artisanIds, input);
            if (!error) {
              setEmailSent(true);
              setMode("signIn");
            }
            return error;
          }}
        />
      ) : (
        <Card>
          <Text role="heading" style={styles.heading}>
            {r.signInTitle}
          </Text>
          <SignInForm
            submitLabel={r.signInSubmit}
            onSubmit={(input) => signInForRequest(projectId, input)}
          />
        </Card>
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
  heading: { fontFamily: theme.font.medium, fontSize: 17, color: theme.colors.foreground },
  switch: {
    gap: theme.spacing(2.5),
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors["primary-soft"],
    backgroundColor: theme.colors.surface,
    padding: theme.spacing(4),
  },
  switchTitle: { fontFamily: theme.font.medium, fontSize: 15, color: theme.colors.foreground },
});
