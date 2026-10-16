import type { Metadata } from "next";
import { safeRedirectPath } from "@menao/validation";
import { OAuthButtons } from "@/components/oauth-buttons";
import { Alert, PageShell, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { continueWithProvider } from "@/lib/auth/actions";
import { oauthProviders } from "@/lib/auth/oauth";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: `${fr.signIn.title} — MENAO` };

export default async function SignInPage({ searchParams }: PageProps<"/connexion">) {
  const params = await searchParams;
  // Sans ?next=, la page d'accueil dépend du rôle (choisie après connexion).
  const next = params.next ? safeRedirectPath(params.next) : "";
  return (
    <PageShell title={fr.signIn.title}>
      {params.erreur === "lien-invalide" && (
        <div className="mb-4">
          <Alert tone="error">{fr.signIn.invalidLink}</Alert>
        </div>
      )}
      {params.erreur === "oauth" && (
        <div className="mb-4">
          <Alert tone="error">{fr.signIn.oauthError}</Alert>
        </div>
      )}
      {params.deconnexion === "partout" && (
        <div className="mb-4">
          <Alert tone="success">{fr.signIn.signedOutEverywhere}</Alert>
        </div>
      )}
      <div className="mb-4">
        <OAuthButtons
          providers={oauthProviders}
          action={continueWithProvider}
          next={next || null}
        />
      </div>
      <SignInForm next={next} />
      <div className="mt-6 flex flex-col items-center gap-2 text-center">
        <TextLink href="/connexion/lien-magique">{fr.signIn.magicLinkLink}</TextLink>
        <TextLink href="/mot-de-passe-oublie">{fr.signIn.forgotPassword}</TextLink>
        <p>
          {fr.signIn.noAccount} <TextLink href="/inscription">{fr.signIn.signUpLink}</TextLink>
        </p>
      </div>
    </PageShell>
  );
}
