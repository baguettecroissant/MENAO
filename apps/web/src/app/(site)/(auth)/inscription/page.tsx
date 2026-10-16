import type { Metadata } from "next";
import { OAuthButtons } from "@/components/oauth-buttons";
import { PageShell, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { continueWithProvider } from "@/lib/auth/actions";
import { oauthProviders } from "@/lib/auth/oauth";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: `${fr.signUp.title} — MENAO` };

export default function SignUpPage() {
  return (
    <PageShell title={fr.signUp.title}>
      <div className="mb-4">
        <OAuthButtons providers={oauthProviders} action={continueWithProvider} />
      </div>
      <SignUpForm />
      <p className="mt-6 text-center">
        {fr.signUp.haveAccount} <TextLink href="/connexion">{fr.signUp.signInLink}</TextLink>
      </p>
    </PageShell>
  );
}
