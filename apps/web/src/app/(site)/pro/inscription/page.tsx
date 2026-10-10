import type { Metadata } from "next";
import { PageShell, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { ArtisanSignUpForm } from "./artisan-sign-up-form";

export const metadata: Metadata = { title: `${fr.pro.signUp.title} — MENAO` };

export default function ArtisanSignUpPage() {
  return (
    <PageShell title={fr.pro.signUp.title}>
      <ArtisanSignUpForm />
      <div className="mt-6 flex flex-col items-center gap-2 text-center">
        <p>
          {fr.signUp.haveAccount} <TextLink href="/connexion">{fr.signUp.signInLink}</TextLink>
        </p>
        <p>
          {fr.pro.signUp.isParticulier}{" "}
          <TextLink href="/inscription">{fr.pro.signUp.particulierLink}</TextLink>
        </p>
      </div>
    </PageShell>
  );
}
