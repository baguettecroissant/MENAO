import type { Metadata } from "next";
import { safeRedirectPath } from "@menao/validation";
import { Alert, PageShell, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: `${fr.signIn.title} — MENAO` };

export default async function SignInPage({ searchParams }: PageProps<"/connexion">) {
  const params = await searchParams;
  const next = safeRedirectPath(params.next);
  return (
    <PageShell title={fr.signIn.title}>
      {params.erreur === "lien-invalide" && (
        <div className="mb-4">
          <Alert tone="error">{fr.signIn.invalidLink}</Alert>
        </div>
      )}
      <SignInForm next={next} />
      <div className="mt-6 flex flex-col items-center gap-2 text-center">
        <TextLink href="/connexion/lien-magique">{fr.signIn.magicLinkLink}</TextLink>
        <p>
          {fr.signIn.noAccount} <TextLink href="/inscription">{fr.signIn.signUpLink}</TextLink>
        </p>
      </div>
    </PageShell>
  );
}
