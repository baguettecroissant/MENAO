import type { Metadata } from "next";
import { PageShell, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: `${fr.signUp.title} — MENAO` };

export default function SignUpPage() {
  return (
    <PageShell title={fr.signUp.title}>
      <SignUpForm />
      <p className="mt-6 text-center">
        {fr.signUp.haveAccount} <TextLink href="/connexion">{fr.signUp.signInLink}</TextLink>
      </p>
    </PageShell>
  );
}
