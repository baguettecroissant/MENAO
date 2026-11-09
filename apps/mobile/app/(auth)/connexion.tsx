import { router } from "expo-router";
import { AuthScreen, AuthSwitch } from "@/components/auth-kit";
import { OAuthButtons } from "@/components/oauth-buttons";
import { SignInForm } from "@/components/sign-in-form";
import { fr } from "@/i18n/fr";
import { continueAfterSignIn } from "@/lib/after-sign-in";
import { signIn } from "@/lib/auth";
import { closeAuth } from "@/lib/navigation";
import { resumePendingRequest, sendScreenParams } from "@/lib/requests";

/**
 * Connexion avec Google ou Apple (ADR 0108), ou par e-mail et mot de passe (mêmes règles que le
 * site), ouverte par-dessus l'écran d'où l'on vient : on y revient une fois connecté. Une demande
 * commencée sans compte (lien de confirmation reçu par e-mail) reprend à l'écran d'envoi.
 * Refonte « Nette » (lot 13) : logo, grand titre, « Mot de passe oublié ? » à droite du libellé.
 */
export default function SignInScreen() {
  return (
    <AuthScreen title={fr.auth.signInTitle} lead={fr.auth.signInText}>
      <OAuthButtons
        onSignedIn={(pending) =>
          pending ? router.replace("/finaliser-compte") : continueAfterSignIn()
        }
      />
      <SignInForm
        submitLabel={fr.auth.signIn}
        forgot={{
          label: fr.auth.forgotPassword,
          onPress: () => router.push("/mot-de-passe-oublie"),
        }}
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
      <AuthSwitch
        question={fr.auth.noAccount}
        label={fr.auth.createAccount}
        onPress={() => router.replace("/inscription")}
      />
    </AuthScreen>
  );
}
