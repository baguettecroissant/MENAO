import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { OAuthButtons } from "@/components/oauth-buttons";
import { SignUpForm } from "@/components/sign-up-form";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { continueAfterSignIn } from "@/lib/after-sign-in";
import { signUpParticulier } from "@/lib/auth";
import { siteLinks } from "@/lib/env";
import { Body, LinkText, Screen, Title } from "@/ui";
import { theme } from "@/ui/theme";

/**
 * Inscription d'un particulier, comme sur le site : avec Google ou Apple (ADR 0108), ou par
 * e-mail. Les artisans ont leur propre parcours (ADR 0113).
 */
export default function SignUp() {
  return (
    <Screen header={<TopBar />}>
      <Title>{fr.auth.signUpTitle}</Title>
      <View style={styles.pro}>
        <Body muted>{fr.auth.signUpText}</Body>
        <LinkText
          label={fr.auth.proSignUpLink}
          onPress={() => router.replace("/pro-inscription")}
        />
      </View>
      <OAuthButtons
        onSignedIn={(pending) =>
          pending ? router.replace("/finaliser-compte") : continueAfterSignIn()
        }
      />
      <SignUpForm
        submitLabel={fr.auth.signUp}
        onSubmit={async (input) => {
          const error = await signUpParticulier(input, siteLinks.emailConfirmed);
          if (!error)
            router.replace({ pathname: "/verifier-email", params: { email: input.email } });
          return error;
        }}
      />
      <View style={styles.footer}>
        <Body muted>{fr.auth.haveAccount}</Body>
        <LinkText label={fr.auth.signIn} onPress={() => router.replace("/connexion")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pro: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: theme.spacing(2) },
  footer: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: theme.spacing(2) },
});
