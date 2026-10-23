import { Link, router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { LogoMark } from "@/components/logo";
import { OAuthButtons } from "@/components/oauth-buttons";
import { SignInForm } from "@/components/sign-in-form";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { continueAfterSignIn } from "@/lib/after-sign-in";
import { signIn } from "@/lib/auth";
import { closeAuth } from "@/lib/navigation";
import { resumePendingRequest, sendScreenParams } from "@/lib/requests";
import { Body, LinkText, Screen, Title } from "@/ui";
import { theme } from "@/ui/theme";

/**
 * Connexion avec Google ou Apple (ADR 0108), ou par e-mail et mot de passe (mêmes règles que le
 * site), ouverte par-dessus l'écran d'où l'on vient : on y revient une fois connecté. Une demande
 * commencée sans compte (lien de confirmation reçu par e-mail) reprend à l'écran d'envoi.
 */
export default function SignInScreen() {
  return (
    <Screen centered header={<TopBar />}>
      <View style={styles.brand}>
        <LogoMark size={48} />
        <Title>{fr.auth.signInTitle}</Title>
        <Body muted>{fr.auth.signInText}</Body>
      </View>
      <OAuthButtons
        onSignedIn={(pending) =>
          pending ? router.replace("/finaliser-compte") : continueAfterSignIn()
        }
      />
      <SignInForm
        submitLabel={fr.auth.signIn}
        onSubmit={async (input) => {
          const { error } = await signIn(input);
          if (error) return error;
          const pending = await resumePendingRequest();
          if (pending) {
            router.replace({
              pathname: "/projet/[id]/envoyer",
              params: sendScreenParams(pending.projectId, pending.artisanIds, pending.lots),
            });
          } else {
            closeAuth();
          }
          return null;
        }}
      />
      <Link href="/mot-de-passe-oublie" style={styles.link}>
        {fr.auth.forgotPassword}
      </Link>
      <View style={styles.footer}>
        <Body muted>{fr.auth.noAccount}</Body>
        <LinkText label={fr.auth.createAccount} onPress={() => router.replace("/inscription")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { gap: theme.spacing(3), marginBottom: theme.spacing(2) },
  link: { fontFamily: theme.font.medium, fontSize: 15, color: theme.colors["primary-strong"] },
  footer: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: theme.spacing(2) },
});
