import { router } from "expo-router";
import { AuthScreen, AuthSwitch } from "@/components/auth-kit";
import { OAuthButtons } from "@/components/oauth-buttons";
import { SignUpForm } from "@/components/sign-up-form";
import { fr } from "@/i18n/fr";
import { continueAfterSignIn } from "@/lib/after-sign-in";
import { signUpParticulier } from "@/lib/auth";
import { siteLinks } from "@/lib/env";

/**
 * Inscription d'un particulier, comme sur le site : avec Google ou Apple (ADR 0108), ou par
 * e-mail. Les artisans ont leur propre parcours (ADR 0113). Refonte « Nette » (lot 13) : logo,
 * grand titre, lien artisan sous le titre, « Déjà un compte ? » en bas.
 */
export default function SignUp() {
  return (
    <AuthScreen
      title={fr.auth.signUpTitle}
      lead={
        <AuthSwitch
          question={fr.auth.signUpText}
          label={fr.auth.proSignUpLink}
          onPress={() => router.replace("/pro-inscription")}
          border={false}
          start
        />
      }
    >
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
      <AuthSwitch
        question={fr.auth.haveAccount}
        label={fr.auth.signIn}
        onPress={() => router.replace("/connexion")}
      />
    </AuthScreen>
  );
}
