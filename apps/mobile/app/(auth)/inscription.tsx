import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SignUpForm } from "@/components/sign-up-form";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { signUpParticulier } from "@/lib/auth";
import { siteLinks } from "@/lib/env";
import { Body, LinkText, Notice, Screen, Title } from "@/ui";
import { theme } from "@/ui/theme";

/** Inscription d'un particulier, comme sur le site. Les artisans s'inscrivent sur le site. */
export default function SignUp() {
  return (
    <Screen header={<TopBar />}>
      <Title>{fr.auth.signUpTitle}</Title>
      <Notice tone="info">{fr.auth.signUpText}</Notice>
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
  footer: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: theme.spacing(2) },
});
